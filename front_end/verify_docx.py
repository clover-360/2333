# -*- coding: utf-8 -*-
import zipfile, re
from xml.dom.minidom import parseString

path = r"C:\Users\asus\Desktop\智能教室系统 V1.0 源代码.docx"

with zipfile.ZipFile(path) as z:
    xml = z.read('word/document.xml').decode('utf-8')

# 1) XML 格式合法性
ok = True
try:
    parseString(xml)
    print('XML well-formed: TRUE')
except Exception as e:
    print('XML well-formed: FALSE -', e)
    ok = False
    
# 2) 统计 spacing 在 pPr 内的数量
ppr_spacing = re.findall(r'<w:pPr>.*?</w:pPr>', xml, re.DOTALL)
with_spacing = [p for p in ppr_spacing if '<w:spacing ' in p]
print(f'pPr blocks: {len(ppr_spacing)}, with spacing: {len(with_spacing)}')

# 3) 显示几个真实代码段(前3、中3、后3)及其 spacing 值
body = re.search(r'<w:body>(.*)</w:body>', xml, re.DOTALL).group(1)
paras = re.findall(r'<w:p[ >].*?</w:p>', body, re.DOTALL)
print(f'total paragraphs in body: {len(paras)}')

# 检查每个段落是否有 spacing
no_sp = 0
for i, p in enumerate(paras):
    if '<w:spacing ' not in p:
        no_sp += 1
        if no_sp <= 3:
            print(f'  missing spacing at para {i}, first 120 chars: {p[:120]}')
print(f'paragraphs missing spacing: {no_sp}')

# 4) 找一处代码文本确认内容完整
sample_texts = re.findall(r'<w:t[^>]*>([^<]*)</w:t>', paras[0])
print('para[0] text:', ''.join(sample_texts))
sample_texts = re.findall(r'<w:t[^>]*>([^<]*)</w:t>', paras[-1])
print('para[-1] text:', ''.join(sample_texts))

# 5) sectPr 是否完好
sect = re.findall(r'<w:sectPr.*?</w:sectPr>', xml, re.DOTALL)
print(f'sectPr found: {len(sect)}')
print('VERIFY DONE')
