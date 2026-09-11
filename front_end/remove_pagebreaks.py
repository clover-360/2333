# -*- coding: utf-8 -*-
import zipfile, re, shutil

path = r"C:\Users\asus\Desktop\智能教室系统 V1.0 源代码.docx"

with zipfile.ZipFile(path) as z:
    names = z.namelist()
    data = {n: z.read(n) for n in names}

xml = data['word/document.xml'].decode('utf-8')

# 找出所有含显式分页符的整段 <w:p ...>...</w:p>，整段删除
pattern = re.compile(r'<w:p(?: [^>]*)?(?:/>|>.*?</w:p>)', re.DOTALL)

def no_br(m):
    return '<w:br w:type="page"/>' in m.group(0)

# 分页符一定是一个独立空段（dump 已证明 br=True len=0）
# 安全删段：匹配到含 br 的段落整体 replace
xml_new, n = pattern.subn(lambda m: '' if no_br(m) else m.group(0), xml)

removed = n - len(re.findall(r'<w:p[ >]', xml)) + len(re.findall(r'<w:p[ >]', xml_new))
# 由于 subn 替换了所有段落，n = 总段落数(替换次数)；需单独查剩余 br
left = xml_new.count('<w:br w:type="page"/>')

with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
    for name in names:
        if name == 'word/document.xml':
            z.writestr(name, xml_new.encode('utf-8'))
        else:
            z.writestr(name, data[name])

# 验证
with zipfile.ZipFile(path) as z:
    final_xml = z.read('word/document.xml').decode('utf-8')
print(f'remaining explicit page breaks: {final_xml.count(chr(60)+"w:br w:type=\"page\"/"+chr(62))}')
import re
final_paras = re.findall(r'<w:p[ >].*?</w:p>', final_xml, re.DOTALL)
print(f'total paragraphs now: {len(final_paras)}')
print('spacing preserved:', final_xml.count('<w:spacing '))
print('DONE')
