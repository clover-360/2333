# -*- coding: utf-8 -*-
import zipfile, re
from xml.dom.minidom import parseString

path = r"C:\Users\asus\Desktop\智能教室系统 V1.0 源代码.docx"
with zipfile.ZipFile(path) as z:
    xml = z.read('word/document.xml').decode('utf-8')

# XML 合法性
try:
    parseString(xml)
    print('XML well-formed: TRUE')
except Exception as e:
    print('XML ERROR:', e)

# 统计
paras = re.findall(r'<w:p[ >].*?</w:p>', xml, re.DOTALL)
print(f'段落总数: {len(paras)}')

# 固定行距检查 (line=232 lineRule=exact)
line_232 = len(re.findall(r'w:line="232" w:lineRule="exact"', xml))
print(f'固定行距 232twips(11.6pt) 的段落: {line_232}')

# 字号检查 (21 half-pt = 10.5pt 五号)
sz21_all = xml.count('w:val="21"') + xml.count('w:szCs w:val="21"')
sz_p = len(re.findall(r'<w:sz w:val="21"/>', xml))
szcs_p = len(re.findall(r'<w:szCs w:val="21"/>', xml))
print(f'字号 21 half-pt: sz={sz_p}, szCs={szcs_p}')

# 分页符
tag = chr(60)+'w:br w:type="page"/'+chr(62)
print(f'人工分页符: {xml.count(tag)}')

# 页面与 docGrid
pg = re.search(r'<w:pgSz[^/]*/>', xml).group(0)
pgm = re.search(r'<w:pgMar[^/]*/>', xml).group(0)
dg = re.search(r'<w:docGrid[^/]*/>', xml).group(0)
print('\n页面:', pg)
print('边距:', pgm)
print('网格:', dg)

# 内容开始与结尾
first_texts = re.findall(r'<w:t[^>]*>([^<]*)</w:t>', paras[0])
last_texts = re.findall(r'<w:t[^>]*>([^<]*)</w:t>', paras[-1])
print(f'\n第一段: {chr(34)}{chr(34).join(first_texts)[:60]}{chr(34)}')
print(f'最后一段: {chr(34)}{chr(34).join(last_texts)[:60]}{chr(34)}')

# 空行(空段)数与非空行
nonempty = [p for p in paras if ''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', p)).strip()]
print(f'含文本段落: {len(nonempty)}')
print(f'空段落(=源码空行): {len(paras)-len(nonempty)}')

# 计算每页实际行数：页正文高度 = 16839-1440-1440=13959twips; 每行232twips
# 若正文高差一点可放 61 行？13959/61 = 228.8 > 232 所以只能 60 行
# 最后一行整页 60 行：
import math
all_lines = len(paras)
pp = 60
pages = math.ceil(all_lines / pp)
print(f'\n预计页数 {pages}: 前{pages-1}页每页60行, 末页 {all_lines-(pages-1)*pp} 行')
print(f'正文高=16839-2880=13959twips / 每行232 => 每页 = {int(13959/232)} 行 (floor)')
print('\n=== 最终验证完成 ===')
