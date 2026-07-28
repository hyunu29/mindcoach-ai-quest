import sys
try:
    import PyPDF2
    r = PyPDF2.PdfReader('C:/Users/ricky/Desktop/mindcoach-ai-quest/docs/plans/2026-07-28-academy-staff-test-source.pdf')
except ImportError:
    try:
        from pypdf import PdfReader
        r = PdfReader('C:/Users/ricky/Desktop/mindcoach-ai-quest/docs/plans/2026-07-28-academy-staff-test-source.pdf')
    except ImportError:
        print("Neither PyPDF2 nor pypdf installed")
        sys.exit(1)

print(f"pages: {len(r.pages)}")
for i in range(len(r.pages)):
    print(f"--- page {i+1} ---")
    print(r.pages[i].extract_text())
