"""각 하위 영역을 좁게 크롭. Read tool이 큰 이미지를 축소 표시하므로 세로 짧게."""
import fitz

src = 'C:/Users/ricky/Desktop/mindcoach-ai-quest/docs/plans/2026-07-28-academy-staff-test-source.pdf'
out_dir = 'C:/Users/ricky/Desktop/mindcoach-ai-quest/docs/plans/'

doc = fitz.open(src)

zoom = 3.0
mat = fitz.Matrix(zoom, zoom)

# 각 영역 좌표는 페이지 상 y 비율. PDF 관찰 후 조정.
# Page 1 (heights):
#   0.00-0.20 : 헤더/척도 설명
#   0.20-0.53 : Emotional and physical depression (9 items)
#   0.53-0.85 : Emotional consumption (9 items)
#   0.85-1.00 : Work environment (첫 3~4 items)
# Page 2:
#   0.00-0.20 : Work environment 후반
#   0.20-0.45 : Social isolation
#   0.45-1.00 : 결과 해석

sections = [
    (0, 0.75, 1.00, 'p1-worktop2'),
    (1, 0.00, 0.20, 'p2-workbot'),
    (1, 0.15, 0.42, 'p2-isolation'),
    (1, 0.40, 0.70, 'p2-interpret-a'),
    (1, 0.68, 1.00, 'p2-interpret-b'),
]

for page_i, y0, y1, name in sections:
    page = doc[page_i]
    rect = page.rect
    clip = fitz.Rect(0, y0 * rect.height, rect.width, y1 * rect.height)
    pix = page.get_pixmap(matrix=mat, clip=clip)
    path = f'{out_dir}staff-{name}.png'
    pix.save(path)
    print(f'saved: {path} ({pix.width}x{pix.height})')

doc.close()
