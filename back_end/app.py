# -*- coding: utf-8 -*-
"""
Flask 后端服务
================
提供用户注册、登录接口（含完整校验逻辑）及健康检查接口。

依赖：Flask、Flask-MySQLdb、Werkzeug
数据表：见 sql/mysql/user.sql
"""

import time
from functools import wraps
from collections import defaultdict

from flask import Flask, request, jsonify, g
import pymysql
pymysql.install_as_MySQLdb()
from flask_mysqldb import MySQL
from werkzeug.security import generate_password_hash, check_password_hash

# ============================================================
# 应用配置
# ============================================================
class Config:
    # MySQL 数据库连接配置（请按实际环境修改）
    MYSQL_HOST = "localhost"
    MYSQL_PORT = 3306
    MYSQL_USER = "root"
    MYSQL_PASSWORD = "123456"
    MYSQL_DB = "AIcode"
    MYSQL_CHARSET = "utf8mb4"

    MYSQL_CHARSET = "utf8mb4"
    SECRET_KEY = "liicM5fJzdQ8oLkAgDnHmAQYikbFRXfj"

    # 登录防暴力破解配置
    LOGIN_MAX_FAIL_TIMES = 5        # 同一 IP 最大连续失败次数
    LOGIN_LOCK_SECONDS = 300        # 达到失败上限后的锁定时长（秒）

    # 用户名 / 密码格式约束
    USERNAME_MIN_LEN = 3
    USERNAME_MAX_LEN = 64
    PASSWORD_MIN_LEN = 6
    PASSWORD_MAX_LEN = 32


# ============================================================
# Flask 应用与 MySQL 初始化
# ============================================================
app = Flask(__name__)
app.config.from_object(Config)

mysql = MySQL(app)


# ============================================================
# 登录失败次数限制（内存级，生产环境建议替换为 Redis）
# ============================================================
_login_fail_map = defaultdict(lambda: {"count": 0, "lock_until": 0})


def _is_ip_locked(ip):
    """判断指定 IP 是否仍处于锁定期内"""
    return _login_fail_map[ip]["lock_until"] > time.time()


def _record_fail(ip):
    """记录一次登录失败，达到上限则锁定"""
    info = _login_fail_map[ip]
    info["count"] += 1
    if info["count"] >= Config.LOGIN_MAX_FAIL_TIMES:
        info["lock_until"] = time.time() + Config.LOGIN_LOCK_SECONDS


def _reset_fail(ip):
    """登录成功后重置失败计数"""
    _login_fail_map.pop(ip, None)


# ============================================================
# 统一响应工具
# ============================================================
def ok(data=None, msg="success"):
    """成功响应"""
    return jsonify({"code": 0, "msg": msg, "data": data})


def fail(code, msg, http_status=400):
    """失败响应"""
    return jsonify({"code": code, "msg": msg, "data": None}), http_status


# ============================================================
# 请求体校验装饰器：强制 JSON + 字段非空
# ============================================================
def require_json_fields(*fields):
    """校验请求为 JSON 且包含指定字段"""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if not request.is_json:
                return fail(4001, "请求体必须为 JSON 格式（Content-Type: application/json）")
            body = request.get_json(silent=True)
            if not isinstance(body, dict):
                return fail(4002, "请求体格式错误，应为 JSON 对象")
            missing = [f for f in fields if not body.get(f)]
            if missing:
                return fail(4003, f"缺少必填字段：{', '.join(missing)}")
            g.body = body
            return fn(*args, **kwargs)
        return wrapper
    return decorator


# ============================================================
# 业务校验：用户名 / 密码格式
# ============================================================
def validate_username(username):
    """
    校验用户名格式：长度 3~64，仅允许字母、数字、下划线、横线。
    返回 (is_valid, error_msg)
    """
    if not (Config.USERNAME_MIN_LEN <= len(username) <= Config.USERNAME_MAX_LEN):
        return False, f"用户名长度需在 {Config.USERNAME_MIN_LEN}~{Config.USERNAME_MAX_LEN} 之间"
    for ch in username:
        if not (ch.isalnum() or ch in ("_", "-")):
            return False, "用户名仅允许字母、数字、下划线、横线"
    return True, None


def validate_password(password):
    """
    校验密码格式：长度 6~32。
    返回 (is_valid, error_msg)
    """
    if not (Config.PASSWORD_MIN_LEN <= len(password) <= Config.PASSWORD_MAX_LEN):
        return False, f"密码长度需在 {Config.PASSWORD_MIN_LEN}~{Config.PASSWORD_MAX_LEN} 之间"
    return True, None


# ============================================================
# 接口：健康检查
# ============================================================
@app.route("/")
def hello_world():
    return "Hello, World!"

@app.route("/health", methods=["GET"])
def health():
    return ok(msg="服务运行中")


# ============================================================
# 接口：用户注册
# ============================================================
@app.route("/register", methods=["POST"])
@require_json_fields("username", "password")
def register():
    body = g.body
    username = body["username"].strip()
    password = body["password"]
    confirm_password = body.get("confirm_password")   # 可选：确认密码
    avatar = body.get("avatar")                        # 可选：头像路径
    preference = body.get("preference")               # 可选：用户喜好（JSON 字符串）

    # ---- 校验 1：用户名格式 ----
    valid, msg = validate_username(username)
    if not valid:
        return fail(4101, msg)

    # ---- 校验 2：密码格式 ----
    valid, msg = validate_password(password)
    if not valid:
        return fail(4102, msg)

    # ---- 校验 3：两次密码一致（传入 confirm_password 时校验）----
    if confirm_password is not None and confirm_password != password:
        return fail(4103, "两次输入的密码不一致")

    # ---- 校验 4：头像字段长度（user.avatar VARCHAR(255)）----
    if avatar is not None and len(avatar) > 255:
        return fail(4104, "头像路径长度不能超过 255 个字符")

    # ---- 校验 5：喜好字段长度（user.preference VARCHAR(512)）----
    if preference is not None and len(preference) > 512:
        return fail(4105, "喜好字段长度不能超过 512 个字符")

    # ---- 校验 6：用户名是否已存在（先查重，给出明确提示）----
    cur = mysql.connection.cursor()
    try:
        cur.execute(
            "SELECT id FROM user WHERE username = %s LIMIT 1",
            (username,),
        )
        if cur.fetchone():
            return fail(4201, "用户名已存在")

        # 密码加密（pbkdf2:sha256，哈希长度可控，适配 user.password VARCHAR(128)）
        password_hash = generate_password_hash(password, method="pbkdf2:sha256", salt_length=16)

        # 写入数据库（参数化查询防注入；role_id、is_disabled 使用表默认值 0）
        cur.execute(
            "INSERT INTO user (avatar, username, password, preference) "
            "VALUES (%s, %s, %s, %s)",
            (avatar, username, password_hash, preference),
        )
        mysql.connection.commit()
        new_user_id = cur.lastrowid
    except Exception as e:
        mysql.connection.rollback()
        return fail(5001, f"注册失败：{str(e)}", 500)
    finally:
        cur.close()

    return ok({"user_id": new_user_id, "username": username}, msg="注册成功")


# ============================================================
# 接口：用户登录（核心，含完整校验逻辑）
# ============================================================
@app.route("/login", methods=["POST"])
@require_json_fields("username", "password")
def login():
    body = g.body
    username = body["username"].strip()
    password = body["password"]
    client_ip = request.remote_addr or "unknown"

    # ---- 校验 1：IP 是否被锁定（防暴力破解）----
    if _is_ip_locked(client_ip):
        remain = int(_login_fail_map[client_ip]["lock_until"] - time.time())
        return fail(4301, f"登录失败次数过多，请 {remain} 秒后再试", 429)

    # ---- 校验 2：用户名格式 ----
    valid, msg = validate_username(username)
    if not valid:
        return fail(4101, msg)

    # ---- 校验 3：密码格式（避免对无效输入做数据库查询）----
    valid, msg = validate_password(password)
    if not valid:
        return fail(4102, msg)

    # ---- 校验 4：查询用户是否存在 ----
    cur = mysql.connection.cursor()
    try:
        cur.execute(
            "SELECT id, username, password, is_disabled FROM user WHERE username = %s LIMIT 1",
            (username,),
        )
        row = cur.fetchone()
    finally:
        cur.close()

    if not row:
        # 用户不存在：记录失败，不直接暴露"用户不存在"以防撞库
        _record_fail(client_ip)
        return fail(4401, "用户名或密码错误")

    user_id, db_username, db_password_hash, is_disabled = row

    # ---- 校验 5：账号是否被禁用 ----
    if is_disabled == 1:
        return fail(4402, "账号已被禁用，请联系管理员")

    # ---- 校验 6：密码是否正确 ----
    if not check_password_hash(db_password_hash, password):
        _record_fail(client_ip)
        return fail(4401, "用户名或密码错误")

    # ---- 登录成功：重置失败计数 ----
    _reset_fail(client_ip)

    # 返回用户基本信息（生产环境可改为签发 JWT token）
    return ok({
        "user_id": user_id,
        "username": db_username,
    }, msg="登录成功")


# ============================================================
# 全局异常处理
# ============================================================
@app.errorhandler(500)
def internal_error(e):
    return fail(5000, "服务器内部错误", 500)


# ============================================================
# 启动入口
# ============================================================
if __name__ == "__main__":
    host = '0.0.0.0'   # 监听所有可用的网络接口
    port = 6008        # 设置端口号
    app.run(host=host, port=port)
