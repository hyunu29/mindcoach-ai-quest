import fitz  # PyMuPDF
import os

src = 'C:/Users/ricky/Desktop/mindcoach-ai-quest/docs/plans/2026-07-28-academy-staff-test-source.pdf'
out_dir = 'C:/Users/ricky/Desktop/mindcoach-ai-quest/docs/plans/'
os.makedirs(out_dir, exist_ok=True)

doc = fitz.open(src)
for i, page in enumerate(doc):
    # 2x zoom for higher DPI (matrix 2, 2)
    mat = fitz.Matrix(2.5, 2.5)
    pix = page.get_pixmap(matrix=mat)
    path = f'{out_dir}staff-test-page{i+1}.png'
    pix.save(path)
    print(f'saved: {path} ({pix.width}x{pix.height})')
doc.close()
