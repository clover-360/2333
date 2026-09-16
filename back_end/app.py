# -*- coding: utf-8 -*-
"""
Flask 后端服务
================
提供用户注册、登录接口（含完整校验逻辑）及健康检查接口。

依赖:Flask、Flask-MySQLdb、Werkzeug
数据表：见 sql/mysql/user.sql
"""

import json
import time
from flask_cors import CORS
import requests
from functools import wraps
from collections import defaultdict
from flask import Flask, request, jsonify, g, Response, stream_with_context
from flask_mysql_connector import MySQL
from flask_socketio import SocketIO, emit
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

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
    MYSQL_DATABASE = "AIcode"
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

    # Token 配置（基于 itsdangerous 签发带过期时间的签名 token，自包含 user_id）
    TOKEN_EXPIRE_SECONDS = 86400      # token 有效期：24 小时

    # 星火大模型配置（详见 back_end/resource/星火大模型api文档.md）
    SPARK_API_URL = "https://spark-api-open.xf-yun.com/v1/chat/completions"
    SPARK_API_PASSWORD = "HvHgMQsoacUJBLETrAZG:PDSjOvtqzmHLFnITTNmO"  # 替换为你在星火平台申请的 API Password
    SPARK_DEFAULT_MODEL = "generalv3.5"
    SPARK_TIMEOUT = 60                # 调用星火接口的超时时间（秒）


# ============================================================
# Flask 应用与 MySQL 初始化
# ============================================================
app = Flask(__name__)
CORS(app)  # 允许跨域请求（开发环境可用，生产环境请按需配置）
app.config.from_object(Config)

mysql = MySQL(app)

# WebSocket 支持（flask-socketio，cors_allowed_origins=* 允许前端跨域连接）
socketio = SocketIO(app, cors_allowed_origins="*")


# ============================================================
# Token 签发与校验（基于 itsdangerous，自包含 user_id，无需额外存储）
# ============================================================
_token_serializer = URLSafeTimedSerializer(Config.SECRET_KEY, salt="login-token")

def generate_token(user_id):
    """为指定用户签发 token（自包含 user_id，带过期时间）"""
    return _token_serializer.dumps({"user_id": user_id})


def verify_token(token):
    """校验 token，返回 user_id；失败返回 None"""
    try:
        data = _token_serializer.loads(token, max_age=Config.TOKEN_EXPIRE_SECONDS)
        return data.get("user_id")
    except (BadSignature, SignatureExpired):
        return None


# ============================================================
# 跨域支持（前端跨端口调用需开启 CORS）
# ============================================================
@app.after_request
def _add_cors_headers(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return resp


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

    # 签发 token（自包含 user_id，带过期时间；前端存 localStorage，后续请求在 header 带上）
    token = generate_token(user_id)

    return ok({
        "token": token,
        "user_id": user_id,
        "username": db_username,
    }, msg="登录成功")


# ============================================================
# 接口：获取当前登录用户信息（演示 token 校验，需在 header 带上 token）
# ============================================================
@app.route("/me", methods=["GET"])
def me():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return fail(4501, "未提供有效的认证 token", 401)
    user_id = verify_token(auth[len("Bearer "):])
    if user_id is None:
        return fail(4502, "token 无效或已过期", 401)

    cur = mysql.connection.cursor()
    try:
        cur.execute(
            "SELECT id, username, avatar FROM user WHERE id = %s LIMIT 1",
            (user_id,),
        )
        row = cur.fetchone()
    finally:
        cur.close()
    if not row:
        return fail(4503, "用户不存在", 404)

    return ok({"user_id": row[0], "username": row[1], "avatar": row[2]}, msg="ok")


# ============================================================
# 星火大模型接口
# ============================================================
def _build_spark_payload(body):
    """构造星火请求 payload，返回 (payload, error_msg)"""
    messages = body.get("messages")
    if not messages or not isinstance(messages, list):
        return None, "messages 字段缺失或格式错误（应为数组）"
    payload = {
        "model": body.get("model") or Config.SPARK_DEFAULT_MODEL,
        "messages": messages,
        "stream": True,
    }
    if "temperature" in body:
        payload["temperature"] = body["temperature"]
    if "max_tokens" in body:
        payload["max_tokens"] = body["max_tokens"]
    return payload, None


def _spark_headers():
    """星火接口请求头"""
    return {
        "Authorization": f"Bearer {Config.SPARK_API_PASSWORD}",
        "Content-Type": "application/json",
    }


# ------------------------------------------------------------
# 方式一：SSE 流式接口（POST /spark/chat/stream）
# 前端用 fetch 读取流；响应 mimetype 为 text/event-stream，
# 逐行转发星火返回的 data: {...} 片段，适合聊天逐字显示。
# ------------------------------------------------------------
@app.route("/spark/chat/stream", methods=["POST"])
def chat_stream():
    body = request.get_json(silent=True) or {}
    payload, err = _build_spark_payload(body)
    if err:
        return fail(4601, err)

    def generate():
        try:
            resp = requests.post(
                Config.SPARK_API_URL,
                headers=_spark_headers(),
                json=payload,
                stream=True,
                timeout=Config.SPARK_TIMEOUT,
            )
            resp.encoding = 'utf-8'          # ← 新增这一行
            # 逐行转发星火的 SSE 流（每行形如 data: {...}）
            for line in resp.iter_lines(decode_unicode=True):
                if line:
                    yield line + "\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return Response(stream_with_context(generate()), mimetype="text/event-stream")


# ------------------------------------------------------------
# 方式二：WebSocket 接口（事件名 spark_chat）
# 前端建立 WebSocket 连接后 emit("spark_chat", {...})；
# 后端逐 chunk emit("chat_chunk", line) 回推，结束时 emit("chat_done")，
# 异常时 emit("chat_error", {...})。适合双向交互场景。
# ------------------------------------------------------------
@socketio.on("spark_chat")
def handle_chat(data):
    if not isinstance(data, dict):
        emit("chat_error", {"msg": "请求数据格式错误"})
        return
    payload, err = _build_spark_payload(data)
    if err:
        emit("chat_error", {"msg": err})
        return

    try:
        resp = requests.post(
            Config.SPARK_API_URL,
            headers=_spark_headers(),
            json=payload,
            stream=True,
            timeout=Config.SPARK_TIMEOUT,
        )
        resp.encoding = 'utf-8'          # ← 新增这一行
        for line in resp.iter_lines(decode_unicode=True):
            if line:
                emit("chat_chunk", line)
        emit("chat_done")
    except Exception as e:
        emit("chat_error", {"msg": str(e)})


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
    # 使用 socketio.run 以支持 WebSocket（开发模式；生产环境建议 gunicorn + eventlet）
    socketio.run(app, host=host, port=port, allow_unsafe_werkzeug=True)
