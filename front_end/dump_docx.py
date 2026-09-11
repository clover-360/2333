# -*- coding: utf-8 -*-
import zipfile, re
path = r"C:\Users\asus\Desktop\智能教室系统 V1.0 源代码.docx"
with zipfile.ZipFile(path) as z:
    xml = z.read("word/document.xml").decode("utf-8")
# 将段落拆开，便于阅读
body = re.search(r"<w:body>(.*)</w:body>", xml, re.DOTALL).group(1)
paras = re.findall(r"<w:p[ >].*?</w:p>", body, re.DOTALL)
print(f"paras={len(paras)}")
# 显示每段文本、是否包含分页符
for i, p in enumerate(paras):
    texts = re.findall(r"<w:t[^>]*>([^<]*)</w:t>", p)
    joined = "".join(texts)
    has_br = '<w:br w:type="page"/>' in p
    # 前15和每隔59的段落全部打印，帮助确认结构
    if i < 12 or (i+1) % 60 < 3 or has_br or i >= len(paras)-3:
        print(f"[{i:3d}] br={has_br} len={len(joined):3d} | {joined[:70]!r}")
print("...")
