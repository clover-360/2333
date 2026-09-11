# -*- coding: utf-8 -*-
import win32com.client as win32
import pythoncom

pythoncom.CoInitialize()

path = r"C:\Users\asus\Desktop\智能教室系统 V1.0 源代码.docx"

app = None
for progid in ["Word.Application", "KWPS.Application", "wps.Application"]:
    try:
        app = win32.DispatchEx(progid)
        print(f"Using COM: {progid}")
        break
    except Exception as e:
        print(f"{progid} not available: {e}")

if app is None:
    print("No Word/WPS COM found")
    import sys; sys.exit(1)

try:
    app.Visible = False
    app.DisplayAlerts = 0
    doc = app.Documents.Open(path, ReadOnly=True)
    
    # 总页数
    pages = doc.ComputeStatistics(2)  # wdStatisticPages = 2
    paras = doc.Paragraphs.Count
    print(f"Document opened OK. Pages={pages}, Paragraphs={paras}")
    
    # 逐页统计代码行数：统计每个段落的页码
    from collections import Counter
    page_of_para = Counter()
    for i in range(1, paras + 1):
        p = doc.Paragraphs(i)
        try:
            rng = p.Range
            pg = rng.Information(3)  # wdActiveEndPageNumber = 3
            page_of_para[pg] += 1
        except Exception:
            pass
    
    print("\n行数分布（页码: 该页段落数）:")
    for pg in sorted(page_of_para):
        mark = "  <-- 少于50行!" if page_of_para[pg] < 50 and pg < pages else ""
        print(f"  第{pg:3d}页: {page_of_para[pg]:3d} 行{mark}")
    
    doc.Close(False)
    print("\nVERIFY COMPLETE")
except Exception as e:
    print(f"ERROR: {e}")
finally:
    try:
        app.Quit()
    except:
        pass
    pythoncom.CoUninitialize()
