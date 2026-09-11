# -*- coding: utf-8 -*-
import zipfile, re, shutil, os

src = r"C:\Users\asus\Desktop\智能教室系统 V1.0 源代码.docx"
bak = r"C:\Users\asus\Desktop\智能教室系统 V1.0 源代码_BEFORE_FIX.docx"

# 1) 备份原文件
shutil.copy2(src, bak)

# 2) 读取 docx (zip) 内容
with zipfile.ZipFile(src, 'r') as z:
    names = z.namelist()
    data = {n: z.read(n) for n in names}

# 3) 修改 document.xml
xml = data['word/document.xml'].decode('utf-8')

spacing_inject = '<w:spacing w:before="0" w:beforeLines="0" w:after="0" w:afterLines="0" w:line="232" w:lineRule="exact"/>'

# 段段落正则
doc_start = xml.index('<w:body>')
head = xml[:doc_start]
body = xml[doc_start:]

# 3a) 替换已存在的 spacing 元素（若有）
body = re.sub(r'<w:spacing[^>]*/>', spacing_inject, body)

# 3b) 处理有 pPr 但没有 spacing 的段落：在 pPr 结束前插入
# 匹配 <w:pPr> ... </w:pPr>，在其末尾加入 spacing
def add_spacing_to_ppr(m):
    inner = m.group(0)
    if '<w:spacing ' in inner:
        return inner
    # 找到 </w:pPr> 前插入
    return inner.replace('</w:pPr>', spacing_inject + '</w:pPr>')

body = re.sub(r'<w:pPr>.*?</w:pPr>', add_spacing_to_ppr, body, flags=re.DOTALL)

# 3c) 无 pPr 的段落：直接在 <w:p ...> 后插入 pPr
#     匹配 <w:p> 或 <w:p xxx> 但没有紧跟 <w:pPr>
def add_ppr_to_par(m):
    tag = m.group(0)
    if '<w:pPr>' in m.string[m.end():m.end()+20]:
        return tag
    return tag + '<w:pPr>' + spacing_inject + '</w:pPr>'

# 简化：对于没有 pPr 的，在开标签后插入
# 先保护已有 pPr 段
protected = body
# 用负向前瞻匹配 <w:p[ >]后面不跟 <w:pPr 的
body = re.sub(r'<w:p(?: [^>]*)?>(?=<\?!|(?:(?!<w:pPr>).)*$)', lambda m: m.group(0) + '<w:pPr>' + spacing_inject + '</w:pPr>', body, flags=re.DOTALL)

xml = head + body
data['word/document.xml'] = xml.encode('utf-8')

# 4) 写回 docx
with zipfile.ZipFile(src, 'w', zipfile.ZIP_DEFLATED) as z:
    for n in names:
        z.writestr(n, data[n])

# 5) 验证
with zipfile.ZipFile(src) as z:
    check = z.read('word/document.xml').decode('utf-8')
print('spacing occurrences:', check.count('<w:spacing '))
print('page breaks preserved:', check.count('<w:br w:type="page"/>'))
print('total paras:', check.count('<w:p '))
print('DONE. backup saved as:', bak)
