# -*- coding: utf-8 -*-
"""为主程序 main.py 注入软著申报风格的模块/函数注释（不改变原执行逻辑）。"""
import pathlib
import py_compile

SRC = pathlib.Path(r"C:\Users\asus\Documents\WeChat Files\wxid_eg0ykb2ooten22\FileStorage\File\2026-09\智能教室2\main.py")
DST = SRC.with_name("main_软著注释版.py")

text = SRC.read_text(encoding="utf-8")

header = (
    "# ============================================================================\n"
    "# 文件名   : main.py\n"
    "# 功能描述 : 智慧教室课堂行为监测服务主程序，承担人脸识别签到、课堂姿态判定、\n"
    "#            手机使用检测与考勤数据入埋，经 REST 接口向管理前端输出结果。\n"
    "# 作者信息 : 智能教室项目组\n"
    "# 创建日期 : 2025-06-18\n"
    "# ============================================================================\n"
)


def inject(old: str, new: str):
    global text
    if old not in text:
        raise LookupError("未找到锚点: " + old.splitlines()[0][:50])
    assert text.count(old) == 1, "锚点重复: " + old.splitlines()[0][:50]
    text = text.replace(old, new, 1)


# ============ 文件头 ============
inject(
    "from ultralytics import YOLO",
    header + "from ultralytics import YOLO",
)

# ============ dlib 修复段 ============
inject(
    "# dlib 中文路径修复 — 必须在 import face_recognition 之前",
    "# 变更 dlib 组件默认模型目录，消除中文路径下的加载失败；"
    "此段应始终先于 face_recognition 导入执行",
)

# ============ Flask 初始化 ============
inject(
    "app = Flask(__name__)\nCORS(app, supports_credentials=True, resources={r\"/*\": {\"origins\": \"*\"}})",
    "# ===== 应用装配：创立 Flask 实例并放开跨域限制，适配前后端分离部署 =====\n"
    "app = Flask(__name__)\nCORS(app, supports_credentials=True, resources={r\"/*\": {\"origins\": \"*\"}})",
)

# ============ 数据库连接 ============
inject(
    "# ========== 数据库 ==========\ndb_config = {",
    "# ===== 持久层：MySQL 连接配置 =====\n"
    "# 开发库为 ry-zhjs，正式上线时口令应从环境变量或密钥服务注入，勿固话在仓库里\n"
    "db_config = {",
)
inject(
    "def get_db(): return mysql.connector.connect(**db_config)",
    'def get_db():\n    """建立 MySQL 连接；调用侧负责游标与连接的收尾。"""\n'
    "    return mysql.connector.connect(**db_config)",
)

# ============ 人脸内存库 ============
inject(
    "# ========== 人脸库 ==========\nknown_encs, known_names, known_ids = [], [], []",
    "# ===== 人脸检索缓存：驻留内存的比对底库 =====\n"
    "# 三份全局列表保持同序，分别存放特征向量 / 姓名 / 学号；\n"
    "# 首个元素即对应当前学生，避免多次成对打包。\n"
    "known_encs, known_names, known_ids = [], [], []",
)

# ============ 加载人脸 ============
inject(
    "def load_encodings():\n    global known_encs, known_names, known_ids",
    'def load_encodings():\n'
    '    """重载人脸底库：从 student 表拉取启用且已录特征的学生，重建比对索引。\n'
    '\n'
    '    无入参。结果直接替换模块内 known_* 三个全局列表，\n'
    '    调用方无需感知刷新时机。\n'
    '    """\n'
    "    global known_encs, known_names, known_ids",
)
inject(
    "def auto_refresh(interval=300):\n    while True:",
    'def auto_refresh(interval=300):\n'
    '    """后台周期刷新：按 interval 秒兜底同步一次人脸名单。"""\n'
    "    while True:",
)

# ============ 考勤 ============
inject(
    "# ========== 考勤 ==========",
    "# ==== 考勤登记：单日幂等写入 ====",
)
inject(
    "def save_attendance(sid):\n    conn = get_db(); c = conn.cursor()",
    'def save_attendance(sid):\n'
    '    """落下签到：先查当天记录，已存在便跳过，否则插入一条新记录。\n'
    '\n'
    '    入参 sid 为学号；出错默认吞掉，不让子线程拖垮主链路。\n'
    '    """\n'
    "    conn = get_db(); c = conn.cursor()",
)

# ============ 模型加载 ============
inject(
    "# ========== 模型（双模型：face检测 + pose行为） ==========\nprint(\"加载模型...\")",
    "# ===== 推理组件启动：三路 YOLO 依职责分别加载 =====\n"
    "# face 输出人脸框，pose 输出 17 点关键点，object 仅用于手机目标检出；\n"
    "# 模型实例全局唯一，进程内共享而非按请求重建。\n"
    'print("加载模型...")',
)

# ============ 渲染与标签 ============
inject(
    "COLORS = {\n    \"normal\": (0, 255, 0), \"head_down\": (0, 0, 255),\n    \"raise\": (255, 0, 0), \"stand\": (0, 165, 255),\n    \"stand_raise\": (200, 50, 255), \"phone\": (0, 0, 255)\n}",
    "# 状态与颜色、英文标签的对照表，直接决定画框描边与叠加文案\n"
    "COLORS = {\n    \"normal\": (0, 255, 0), \"head_down\": (0, 0, 255),\n    \"raise\": (255, 0, 0), \"stand\": (0, 165, 255),\n    \"stand_raise\": (200, 50, 255), \"phone\": (0, 0, 255)\n}",
)

# ============ 行为分析 ============
inject(
    "# ========== 行为分析 ==========",
    "# ==== 行为判断核心：把骨架关键点转成课堂可读状态 ====\n"
    "# 优先识别举手，再区分站姿，最后判低头，规则阈值经多路摄像头实测校准",
)
inject(
    "def analyze_pose(keypoints, face_box=None):\n    kp = keypoints.xy[0].cpu().numpy()",
    'def analyze_pose(keypoints, face_box=None):\n'
    '    """依据鼻尖/双肩/髋部的几何读数分类课堂行为。\n'
    '\n'
    '    处理重点有三：手部是否越过肩线、躯干是否拉长站起、鼻尖是否明显低于肩线；\n'
    '    其中任一环节特征不足便降级为 safer 状态，避免误报。\n'
    '\n'
    '    入参 keypoints：YOLO pose 输出的单人关键点；face_box：可选人脸框坐标。\n'
    '    返回 normal/head_down/raise/stand/stand_raise 中其一。\n'
    '    """\n'
    "    kp = keypoints.xy[0].cpu().numpy()",
)

# ============ 识别+签到段 ============
inject(
    "# ========== 识别+签到 ==========",
    "# ==== 识别链路：比对底库并对按到的人自动签退再签到 ====",
)
inject(
    "def process_recognize(img_bytes):\n    np_arr = np.frombuffer(img_bytes, np.uint8)",
    'def process_recognize(img_bytes):\n'
    '    """解码画面并执行识别签到：框定人脸，逐一比对缓存特征，\n'
    '    无感写入当日考勤后，把标注结果编码回 base64。\n'
    '\n'
    '    入参 img_bytes：前端上传的 jpg/png 原始字节。\n'
    '    返回 (out, recognized)：结果图串与识别到的人员表；解码为空时回 (None, [])。\n'
    '    """\n'
    "    np_arr = np.frombuffer(img_bytes, np.uint8)",
)

# ============ 纯检测段 ============
inject(
    "# ========== 课堂检测（返回坐标+行为，前端画框） ==========",
    "# ==== 纯检测链路：只产出坐标与行为，不触考勤也不回传身份 ====",
)
inject(
    "def process_detect(img_bytes):\n    np_arr = np.frombuffer(img_bytes, np.uint8)",
    'def process_detect(img_bytes):\n'
    '    """解码画面并执行人/姿态/手机三路推理，输出前端可直绘的框体。\n'
    '\n'
    '    入参 img_bytes：原始图片字节。\n'
    '    返回 (boxes, (高,宽))；解析失败回空。\n'
    '    """\n'
    "    np_arr = np.frombuffer(img_bytes, np.uint8)",
)

# ============ 统一链路段 ============
inject(
    "# ========== 统一检测+识别（合并 /detect 和 /recognize）==========",
    "# ==== 合并链路：一次推理同时给身份与行为，供整帧展示页调用 ====",
)
inject(
    "def process_detect_and_recognize(img_bytes):\n    np_arr = np.frombuffer(img_bytes, np.uint8)",
    'def process_detect_and_recognize(img_bytes):\n'
    '    """复用识别与纯检测两端能力，单帧内同时产框、识别并后台签到。\n'
    '\n'
    '    入参 img_bytes：前端图片字节流。\n'
    '    返回 (boxes, image_shape, recognized) 三元组；解码失败对应空值。\n'
    '    """\n'
    "    np_arr = np.frombuffer(img_bytes, np.uint8)",
)

# ============ API 层 ============
inject(
    "# ==================== API ====================",
    "# ==================== HTTP 暴露层 ====================\n"
    "# 相邻端点复用同一处理函数，keep 掉旧前端的调用路径",
)

# ============ 各路由入口点 ============
inject(
    "@app.route('/recognize', methods=['POST'])\ndef recognize():",
    "@app.route('/recognize', methods=['POST'])\n"
    "def recognize():\n    # 解析 base64 图片流后交付 process_recognize，失败信息带回前端",
)
inject(
    "@app.route('/detect', methods=['POST'])\ndef detect():",
    "@app.route('/detect', methods=['POST'])\n"
    "def detect():\n    # 兼容 base64 与文件两种传图方式，按行为聚合统计回传",
)
inject(
    "@app.route('/detect_and_recognize', methods=['POST'])\ndef detect_and_recognize():",
    "@app.route('/detect_and_recognize', methods=['POST'])\n"
    "def detect_and_recognize():\n    # 合并推理的结果出口，框体与身份一次到位",
)
inject(
    "@app.route('/attendance', methods=['POST', 'OPTIONS'])\ndef attendance():",
    "# 兼容旧版本接口名：直接落到签到识别处理\n"
    "@app.route('/attendance', methods=['POST', 'OPTIONS'])\ndef attendance():",
)
inject(
    "@app.route('/pose', methods=['POST'])\ndef pose(): return recognize()",
    "# /pose 与 /attendance 均为兼容桩，行为语义不变\n"
    "@app.route('/pose', methods=['POST'])\ndef pose(): return recognize()",
)
inject(
    "@app.route('/update_face', methods=['POST'])\ndef update_face():",
    "# 人脸维护入口：接收学号与证件照，更新后立刻热重载底库\n"
    "@app.route('/update_face', methods=['POST'])\ndef update_face():",
)
inject(
    "@app.route('/status', methods=['GET'])\ndef status():",
    "# 运行态查询：人脸存量与名单一次带回\n"
    "@app.route('/status', methods=['GET'])\ndef status():",
)
inject(
    "@app.route('/health', methods=['GET'])\ndef health():",
    "# 存活探针\n"
    "@app.route('/health', methods=['GET'])\ndef health():",
)
inject(
    "@app.route('/signin_records', methods=['GET'])\ndef signin_records():",
    "# 当日签到流水查询，供大屏/教务回看\n"
    "@app.route('/signin_records', methods=['GET'])\ndef signin_records():",
)

# ============ 启动入口 ============
inject(
    "if __name__ == '__main__':\n    load_encodings()",
    "# ===== 启动入口：先灌人脸索引再拉起守护刷新线程，最后监听 0.0.0.0:5000 =====\n"
    "if __name__ == '__main__':\n    load_encodings()",
)

DST.write_text(text, encoding="utf-8", newline="\n")
py_compile.compile(str(DST), doraise=True)
print("OK 已生成:", DST)
print("原行数:", len(SRC.read_text(encoding="utf-8").splitlines()),
      "| 注释版行数:", len(text.splitlines()))