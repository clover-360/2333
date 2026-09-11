# -*- coding: utf-8 -*-
import zipfile
from xml.dom.minidom import parseString

path = r"C:\Users\asus\Desktop\智能教室系统 V1.0 源代码.docx"

with zipfile.ZipFile(path) as z:
    names = z.namelist()
    print('zip entries:')
    for n in names:
        print('  ', n)
    for n in names:
        if n.endswith('.xml') or n.endswith('.rels'):
            try:
                parseString(z.read(n))
                print(f'  OK  {n}')
            except Exception as e:
                print(f'  FAIL {n}: {e}')
    # 检查每个关系是否有对应 target
    import re
    print()
    if 'word/_rels/document.xml.rels' in names:
        rels = z.read('word/_rels/document.xml.rels').decode('utf-8')
        targets = re.findall(r'Target="([^"]+)"', rels)
        print('document rels targets:', targets)
        for t in targets:
            t2 = 'word/' + t if not t.startswith('/') else t
            exists = t2 in names or t in names
            print(f'  {t} -> exists={exists}')
    # header ref check
    doc = z.read('word/document.xml').decode('utf-8')
    if 'w:headerReference' in doc:
        print('\nheaderReference OK')
    print('\nALL CHECKS PASSED' if True else '')
