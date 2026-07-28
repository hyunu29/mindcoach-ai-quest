import fitz  # PyMuPDF
doc = fitz.open('C:/Users/ricky/Desktop/mindcoach-ai-quest/docs/plans/2026-07-28-academy-staff-test-source.pdf')
print(f"pages: {len(doc)}")
for i, page in enumerate(doc):
    print(f"--- page {i+1} ---")
    text = page.get_text()
    print(text)
doc.close()
