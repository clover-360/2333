# -*- coding: utf-8 -*-
import zipfile, re
from xml.dom.minidom import parseString

path = r"C:\Users\asus\Desktop\智能教室系统 V1.0 源代码.docx"
with zipfile.ZipFile(path) as z:
    xml = z.read('word/document.xml').decode('utf-8')

try:
    parseString(xml)
    print('XML well-formed: TRUE')
except Exception as e:
    print('XML well-formed FALSE:', e)

paras = re.findall(r'<w:p[ >].*?</w:p>', xml, re.DOTALL)
print(f'paragraphs: {len(paras)}')
print(f'page-break elements: {xml.count(chr(60)+"w:br w:type=\"page\"/"+chr(62))}')
print(f'paragraphs with exact line=232: {xml.count(chr(60)+"w:line=\"232\" w:lineRule=\"exact\"/"+chr(62)) or xml.count(chr(60)+"w:spacing")}')
print('spacing total:', xml.count('<w:spacing '))

# 打印边距和每行高度统计说明
pgm = re.search(r'<w:pgMar[^/]*/>', xml).group(0)
pg = re.search(r'<w:pgSz[^/]*/>', xml).group(0)
print(pg)
print(pgm)

# 首位内容抽样
body = re.search(r'<w:body>(.*)</w:body>', xml, re.DOTALL).group(1)
ps = re.findall(r'<w:p[ >].*?</w:p>', body, re.DOTALL)
for short_i in (0, 1, len(ps)-3, len(ps)-2):
    t = ''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', ps[short_i]))
    print(f'para[{short_i}]: {t[:70]!r}')
print('FINAL OK')
