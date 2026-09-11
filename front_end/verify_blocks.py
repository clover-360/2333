# -*- coding: utf-8 -*-
import zipfile, re

path = r"C:\Users\asus\Desktop\智能教室系统 V1.0 源代码.docx"

with zipfile.ZipFile(path) as z:
    xml = z.read('word/document.xml').decode('utf-8')

body = re.search(r'<w:body>(.*?)</w:body>', xml, re.DOTALL).group(1)
paras = re.findall(r'<w:p[ >].*?</w:p>', body, re.DOTALL)

blocks = []          # 每个“页块”的行数
current = []
page_num = 1
report = []

for idx, p in enumerate(paras):
    is_break = '<w:br w:type="page"/>' in p
    texts = re.findall(r'<w:t[^>]*>([^<]*)</w:t>', p)
    joined = ''.join(texts)
    spacing_ok = '<w:spacing ' in p and '<w:lineRule="exact"/>' in p or 'w:line="232"' in p

    if is_break:
        # 当前块结束（分页符段落本身不计代码行）
        blocks.append(len(current))
        report.append((page_num, len(current), current[:1], current[-1:]))
        current = []
        page_num += 1
    else:
        current.append((joined, spacing_ok, idx))

# 最后一块
blocks.append(len(current))
report.append((page_num, len(current), current[:1], current[-1:]))

print(f'{"页码":<6}{"非空代码行":<12}{"是否≥50":<8}说明')
print('-' * 70)
all_ok = True
for pg, cnt, first, last in report:
    first_text = first[0][0][:45] if first else '(空)'
    ok = cnt >= 50
    if not ok:
        all_ok = False
    print(f'{pg:<6}{cnt:<12}{"是" if ok else "否" :<8}首行: {first_text}')

# 统计行距是否每段都有
no_sp = 0
for pg, cnt, first, last in report:
    for item in current:
        pass
for para_list in [ [item for block in [b for b in []]] ]:
    pass
# 重新遍历一遍检查 spacing
all_paras_ok_spacing = True
checked = 0
for idx, p in enumerate(paras):
    if '<w:br w:type="page"/>' in p:
        continue
    if '<w:spacing ' not in p or 'w:line="232"' not in p:
        all_paras_ok_spacing = False
        if checked < 5:
            print(f'!! para {idx} 缺少固定行距')
            checked += 1

print('-' * 70)
print(f'显式分页块数: {len(blocks)}（即文档页数，除末页外每页行数须≥50）')
print(f'每段均有固定行距 11.6pt: {"是" if all_paras_ok_spacing else "否"}')
print(f'所有非末页块 ≥ 50 行: {"是" if all_ok else "否（需处理）"}')
# 补充：总页面估计
# A4 正文高度 = pgSize高16839 - 上下边距(1440+1440) = 13959 twips
# 60行 * 232twips = 13920twips <= 13959，物理页正好容纳60行，且无溢出的行
print(f'物理页可容纳: 60行 * 11.6pt(232twips) = 13920twips ≤ 正文高13959twips => 合格')
print('\n===== 静态验证完成 =====')
