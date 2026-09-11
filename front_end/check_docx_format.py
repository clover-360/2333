# -*- coding: utf-8 -*-
import zipfile, re
from collections import Counter

path = r"C:\Users\asus\Desktop\智能教室系统 V1.0 源代码.docx"

with zipfile.ZipFile(path) as z:
    xml = z.read("word/document.xml").decode("utf-8")
    styles_xml = z.read("word/styles.xml").decode("utf-8")

paras = re.findall(r"<w:p\b", xml)
print(f"total paras: {len(paras)}")
page_breaks = re.findall(r'<w:br w:type="page"/>', xml)
print(f"explicit page breaks: {len(page_breaks)}")
szs = re.findall(r'<w:sz w:val="(\d+)"', xml)
print(f"direct font sizes half-pt: {Counter(szs).most_common(5)}")
szs_style = re.findall(r'<w:sz w:val="(\d+)"', styles_xml)
print(f"style font sizes half-pt: {Counter(szs_style).most_common(5)}")
spacings = re.findall(r'<w:spacing[^/]*?/>', xml)
print("spacing samples:")
for s in spacings[:8]:
    print("  ", s)
pg = re.findall(r'<w:pgSz[^/]*/>', xml)
pgm = re.findall(r'<w:pgMar[^/]*/>', xml)
print("pgSz:", pg[:1])
print("pgMar:", pgm[:1])
texts = re.findall(r'<w:t[^>]*>([^<]*)</w:t>', xml)
non_empty = [t for t in texts if t.strip()]
print(f"non-empty texts: {len(non_empty)}")
print("DONE")
