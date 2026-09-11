# -*- coding: utf-8 -*-
"""
重新生成 智能教室系统 V1.0 源代码.docx —— 符合软著“每页不少于50行”要求

排版规则：
  页面：A4 (11907 x 16839 twips)
  边距：上/下 1440 twips (2.54cm)，左 2160 twips (3.81cm)，右 1440 twips (2.54cm) 保持原样
  字体：等宽 新宋体/Consolas 五号 (21 half-pt = 10.5pt)
  行距：固定 11.6pt = 232 twips (w:line=232, w:lineRule=exact)
           => 正文高=16839-1440-1440=13959twips，13959/232 = 60.16 => 每页整60行无溢出
"""
import os, re, shutil

SRC_PY = r"C:\Users\asus\Documents\WeChat Files\wxid_eg0ykb2ooten22\FileStorage\File\2026-09\智能教室2\main_软著注释版.py"
OUT = r"C:\Users\asus\Desktop\智能教室系统 V1.0 源代码.docx"

# ----------------------------------------------------------------
# XML 字符串构建工具
# ----------------------------------------------------------------
def esc(t):
    return (t.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;'))

ns_decl = ('xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" '
           'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
           'xmlns:o="urn:schemas-microsoft-com:office:office" '
           'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
           'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" '
           'xmlns:v="urn:schemas-microsoft-com:vml" '
           'xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" '
           'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
           'xmlns:w10="urn:schemas-microsoft-com:office:word" '
           'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
           'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" '
           'xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" '
           'xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" '
           'xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" '
           'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" '
           'mc:Ignorable="w14 wp14"')

# 一个代码段落：左缩进 -> 悬挂不变，等宽字体，固定行距 232 缇
PPR_CODE = ('<w:pPr><w:snapToGrid w:val="0"/>'
            '<w:spacing w:before="0" w:beforeLines="0" w:after="0" w:afterLines="0" '
            'w:line="232" w:lineRule="exact"/>'
            '<w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:eastAsia="宋体" w:hint="eastAsia"/>'
            '<w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr></w:pPr>')

def para(line):
    txt = esc(line.rstrip())
    if txt == '':
        # 空行 
        return '<w:p>' + PPR_CODE + '</w:p>'
    return ('<w:p>' + PPR_CODE
            + '<w:r><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:eastAsia="宋体" w:hint="eastAsia"/>'
            + '<w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr>'
            + '<w:t xml:space="preserve">' + txt + '</w:t></w:r></w:p>')

# 读取源文件行
with open(SRC_PY, 'r', encoding='utf-8') as f:
    lines = f.read().split('\n')
# 统一去除可能残留的 \r
lines = [ln.replace('\r','') for ln in lines]
print(f'源代码总行数: {len(lines)}')

# 生成段落 XML（去掉文件末的极端多余空行，保留有代码的，空行作为 1 行）
while lines and lines[-1].strip() == '':
    lines.pop()
if lines and lines[-1].strip() == '':
    lines = lines[:-1]

paras_xml = []
for ln in lines:
    paras_xml.append(para(ln))

# 支持每 60 行加物理分页；为了保证跨页时不要断代码行且每页正好 60 -> 由固定行距本身解决
# 只需要自然排版即可，Word 会在页末自动分页，行距精确保证 60 行/页。
# 但空行空段也计行数，因此无需再人工分页符。
content_body = ''.join(paras_xml)

sect_props = ('<w:sectPr><w:pgSz w:w="11907" w:h="16839"/>'
              '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="2160" '
              'w:header="851" w:footer="992" w:gutter="0"/>'
              '<w:cols w:space="425" w:num="1"/>'
              '<w:docGrid w:type="lines" w:linePitch="232" w:charSpace="0"/></w:sectPr>')

# document.xml 内容支架
DOC_TEMPLATE = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n'
    '<w:document {ns}><w:body>{body}{sect}</w:body></w:document>').format(ns=ns_decl, body=content_body, sect=sect_props)

# ----------------------------------------------------------------
# contentTypes, rels, 最小 styles.xml
# ----------------------------------------------------------------
CT = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>'''

RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>'''

STYLES = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:eastAsia="宋体"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:line="232" w:lineRule="exact"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>'''

APP_XML = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Microsoft Office Word</Application></Properties>'''

CORE_XML = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>智能教室系统 V1.0 源代码</dc:title><dc:creator>智能教室项目组</dc:creator></cp:coreProperties>'''

PROPS_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/core-properties" Target="core.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="app.xml"/></Relationships>'''

# docProps 关系文件与 rels 的配套
entries = {
  '[Content_Types].xml': CT,
  '_rels/.rels': RELS,
  'word/document.xml': DOC_TEMPLATE,
  'word/styles.xml': STYLES,
  'docProps/app.xml': APP_XML,
  'docProps/core.xml': CORE_XML,
  'docProps/_rels/.rels': PROPS_RELS,
}

# 备份现有文件
if os.path.exists(OUT):
    shutil.copy2(OUT, OUT + '.old_before_rebuild')
    print('已备份旧版 ->', OUT + '.old_before_rebuild')

import zipfile
with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as zf:
    for arc, content in entries.items():
        zf.writestr(arc, content.encode('utf-8'))

print('已写出:', OUT)
print('共写入行数:', len(lines))
# 估算页数
lines_per_page = 60
import math
pages = (len(lines) + lines_per_page - 1) // lines_per_page
print(f'预计页数: {pages}（每页60行，末页 {len(lines) - (pages-1)*lines_per_page} 行）')
print('DONE')
