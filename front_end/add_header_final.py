# -*- coding: utf-8 -*-
"""
最终修正：在已有 docx 上加入页眉(软件名称+版本号, 右上角页码)
并将行距改为固定12磅(240twips)，使每页容纳58行，保证每页>=50行。
"""
import zipfile, re, shutil, os

path = r"C:\Users\asus\Desktop\智能教室系统 V1.0 源代码.docx"
bak = r"C:\Users\asus\Desktop\智能教室系统 V1.0 源代码_BEFORE_HEADER.docx"

# 备份
shutil.copy2(path, bak)

with zipfile.ZipFile(path) as z:
    names = z.namelist()
    data = {n: z.read(n) for n in names}

# ---------- 1) 修改 document.xml ----------
doc = data['word/document.xml'].decode('utf-8')

# 行距 232 -> 240 (固定12磅)
old_line = doc.count('w:line="232" w:lineRule="exact"')
doc = doc.replace('w:line="232" w:lineRule="exact"', 'w:line="240" w:lineRule="exact"')
new_line = doc.count('w:line="240" w:lineRule="exact"')
print(f'行距替换: {old_line} -> {new_line}')

# docGrid 232 -> 240
doc = doc.replace('w:linePitch="232"', 'w:linePitch="240"')

# 页眉引用：在 <w:sectPr> 开头加 headerReference
if 'w:headerReference' in doc:
    print('页眉引用已存在')
else:
    doc = doc.replace('<w:sectPr>', '<w:sectPr><w:headerReference w:type="default" r:id="rId1"/>', 1)
    print('已插入 headerReference rId1')

data['word/document.xml'] = doc.encode('utf-8')

# ---------- 2) 创建 header1.xml ----------
HEADER = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:tabs>
        <w:tab w:val="left" w:pos="0"/>
        <w:tab w:val="right" w:pos="8307"/>
      </w:tabs>
      <w:spacing w:before="0" w:beforeLines="0" w:after="0" w:afterLines="0" w:line="240" w:lineRule="exact"/>
      <w:jc w:val="left"/>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="SimSun" w:eastAsia="宋体" w:hAnsi="SimSun" w:hint="eastAsia"/>
        <w:sz w:val="18"/><w:szCs w:val="18"/>
      </w:rPr>
      <w:t>智能教室系统 V1.0</w:t>
    </w:r>
    <w:r>
      <w:rPr><w:rFonts w:ascii="SimSun" w:eastAsia="宋体" w:hAnsi="SimSun" w:hint="eastAsia"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>
      <w:tab/>
    </w:r>
    <w:r>
      <w:rPr><w:rFonts w:ascii="SimSun" w:eastAsia="宋体" w:hAnsi="SimSun" w:hint="eastAsia"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>
      <w:fldChar w:fldCharType="begin" w:dirty="true"/>
    </w:r>
    <w:r>
      <w:rPr><w:rFonts w:ascii="SimSun" w:eastAsia="宋体" w:hAnsi="SimSun" w:hint="eastAsia"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>
      <w:instrText xml:space="preserve"> PAGE </w:instrText>
    </w:r>
    <w:r>
      <w:rPr><w:rFonts w:ascii="SimSun" w:eastAsia="宋体" w:hAnsi="SimSun" w:hint="eastAsia"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>
      <w:fldChar w:fldCharType="end"/>
    </w:r>
  </w:p>
</w:hdr>'''
data['word/header1.xml'] = HEADER.encode('utf-8')
print('header1.xml 已创建')

# ---------- 3) 创建 word/_rels/document.xml.rels ----------
DOC_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
</Relationships>'''
data['word/_rels/document.xml.rels'] = DOC_RELS.encode('utf-8')
print('document.xml.rels 已创建')

# ---------- 4) Content_Types 补 header ----------
ct = data['[Content_Types].xml'].decode('utf-8')
if 'header+xml' not in ct:
    ct = ct.replace('</Types>', '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/></Types>')
    data['[Content_Types].xml'] = ct.encode('utf-8')
    print('Content_Types 已加入 header 类型')
else:
    print('Content_Types 已包含 header 类型')

# ---------- 5) 写回 ----------
with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
    for n in data:
        z.writestr(n, data[n])

# ---------- 验证 ----------
with zipfile.ZipFile(path) as z:
    names = z.namelist()
    final_doc = z.read('word/document.xml').decode('utf-8')
    hdr = z.read('word/header1.xml').decode('utf-8')

print()
print('===== 验证 =====')
print('zip 条目数:', len(names))
print('header1.xml 存在:', 'word/header1.xml' in names)
print('document.xml.rels 存在:', 'word/_rels/document.xml.rels' in names)
print('行距240段数:', final_doc.count('w:line="240" w:lineRule="exact"'))
print('headerReference:', final_doc.count('w:headerReference'))
print('页眉内容含软件名:', hdr.count('智能教室系统 V1.0') > 0)
print('页眉含PAGE域:', hdr.count('PAGE') > 0)

# 每页行数计算（正文高 13959twips / 240 = 58.16）
import math
lines_total = final_doc.count('<w:p>') + final_doc.count('<w:p ') 
print('总代码行:', lines_total)
pp = 58
pages = math.ceil(lines_total / pp)
print(f'每页 {pp} 行 -> 共 {pages} 页：前 {pages-1} 页每页 {pp} 行，末页 {lines_total - (pages-1)*pp} 行')
print('备份:', bak)
print('DONE')
