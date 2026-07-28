"""각 하위 영역을 개별 PNG로 크롭 렌더 (한 페이지를 4개로 쪼갬)"""
import fitz

src = 'C:/Users/ricky/Desktop/mindcoach-ai-quest/docs/plans/2026-07-28-academy-staff-test-source.pdf'
out_dir = 'C:/Users/ricky/Desktop/mindcoach-ai-quest/docs/plans/'

doc = fitz.open(src)

# Page 1: 3 sections (headers + Emotional depression, Emotional consumption, Work stress)
# Page 2: 1 section (Social isolation) + interpretation
# Just crop page1 into 3 vertical strips + page2 into 2 strips
zoom = 3.0
mat = fitz.Matrix(zoom, zoom)

for i, page in enumerate(doc):
    rect = page.rect  # e.g., (0, 0, 595, 842) in points
    W, H = rect.width, rect.height
    if i == 0:
        # Split page 1 into 3 vertical bands (each roughly 1/3 of page)
        bands = [
            (0, 0.0*H, W, 0.4*H),   # 상단(제목 + 척도 + 우울 첫 문항까지)
            (0, 0.30*H, W, 0.70*H), # 중단(우울 후반 + 감정소모)
            (0, 0.60*H, W, 1.0*H),  # 하단(감정소모 후반 + 업무스트레스)
        ]
    else:
        bands = [
            (0, 0.0*H, W, 0.5*H),   # 상단(스트레스 마지막 + 사회고립)
            (0, 0.4*H, W, 1.0*H),   # 하단(해석 결과 구간)
        ]
    for j, (x0, y0, x1, y1) in enumerate(bands):
        clip = fitz.Rect(x0, y0, x1, y1)
        pix = page.get_pixmap(matrix=mat, clip=clip)
        path = f'{out_dir}staff-test-p{i+1}-band{j+1}.png'
        pix.save(path)
        print(f'saved: {path} ({pix.width}x{pix.height})')

doc.close()
