"""PDF 인코딩 이슈 시 pdfplumber로 재시도"""
try:
    import pdfplumber
    with pdfplumber.open('C:/Users/ricky/Desktop/mindcoach-ai-quest/docs/plans/2026-07-28-academy-staff-test-source.pdf') as pdf:
        print(f"pages: {len(pdf.pages)}")
        for i, page in enumerate(pdf.pages):
            print(f"--- page {i+1} ---")
            print(page.extract_text())
except ImportError as e:
    print(f"pdfplumber not installed: {e}")
