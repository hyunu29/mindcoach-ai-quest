-- 무료 스타터 검사 3종 flag (E-3 시험불안, A-2 번아웃, D-1 미루기)
-- INT(통합검사)는 이미 is_free=true. 이 3종은 랜딩/유입 페이지에서 무료로 노출.
UPDATE public.tests
SET is_free = true, price_krw = 0
WHERE id IN ('E-3', 'A-2', 'D-1');
