-- ============================================================
-- 통합 심리검사 (게이트웨이) 시드
-- - tests.id = 'INT', is_integrated=true, is_free=true, price_krw=0
-- - 50문항 / 10영역 × 5문항 / 5점 Likert / 영역별 25점 만점
-- - 동시에 기존 26개 검사에 일회성 가격(price_krw) 기본값 부여
-- ============================================================

-- ─── 통합 심리검사 INSERT ────────────────────────────────────
INSERT INTO public.tests (
  id, name, category, related_syndrome, description,
  question_count, duration_minutes,
  is_recommended, is_coming_soon,
  is_integrated, is_free, price_krw,
  subdomains, questions
) VALUES (
  'INT',
  '통합 심리검사 (게이트웨이)',
  'INT',
  '',
  '50문항으로 10가지 심리 영역을 한 번에 점검하고, 점수가 높은 영역에 맞는 전문 심리검사를 추천해드립니다. 모든 사용자가 무료로 이용할 수 있습니다.',
  50,
  10,
  true,   -- is_recommended
  false,  -- is_coming_soon
  true,   -- is_integrated
  true,   -- is_free
  0,      -- price_krw
  '[
    "정서적 불안정 및 우울",
    "시험 및 무대 불안",
    "학습 강박 및 완벽주의",
    "루틴 및 시간 통제",
    "인지 및 집중력 저하",
    "학습 회피 및 미루기",
    "신체화 및 통증",
    "에너지 소진 및 번아웃",
    "자아 및 대인관계",
    "수면 및 생활 루틴"
  ]'::jsonb,
  '[
    {"id":1,"text":"하루에도 감정이 수시로 변해 갈피를 잡기 어렵다.","subdomain":"정서적 불안정 및 우울","subdomainEn":"emotional_instability","isReversed":false},
    {"id":2,"text":"작은 일에도 쉽게 울컥하거나 화가 조절되지 않는다.","subdomain":"정서적 불안정 및 우울","subdomainEn":"emotional_instability","isReversed":false},
    {"id":3,"text":"미래가 불투명하게 느껴지고 이유 없는 우울감이 지속된다.","subdomain":"정서적 불안정 및 우울","subdomainEn":"emotional_instability","isReversed":false},
    {"id":4,"text":"나도 모르게 주변 사람과 나를 비교하며 비참함을 느낀다.","subdomain":"정서적 불안정 및 우울","subdomainEn":"emotional_instability","isReversed":false},
    {"id":5,"text":"다른 사람들의 시선이나 평가에 지나치게 예민하게 반응한다.","subdomain":"정서적 불안정 및 우울","subdomainEn":"emotional_instability","isReversed":false},

    {"id":6,"text":"시험 당일이나 발표를 앞두면 머릿속이 하얘지는 경험을 한다.","subdomain":"시험 및 무대 불안","subdomainEn":"test_stage_anxiety","isReversed":false},
    {"id":7,"text":"중요한 시험을 앞두고 예상치 못한 상황이 생길까 봐 늘 불안하다.","subdomain":"시험 및 무대 불안","subdomainEn":"test_stage_anxiety","isReversed":false},
    {"id":8,"text":"시험지만 받으면 심장이 두근거리고 배가 아프거나 손이 떨린다.","subdomain":"시험 및 무대 불안","subdomainEn":"test_stage_anxiety","isReversed":false},
    {"id":9,"text":"남들 앞에서 나를 드러내는 상황(발표 등)이 공포스럽다.","subdomain":"시험 및 무대 불안","subdomainEn":"test_stage_anxiety","isReversed":false},
    {"id":10,"text":"시험을 망쳤을 때의 비극적인 시나리오를 자꾸 상상하게 된다.","subdomain":"시험 및 무대 불안","subdomainEn":"test_stage_anxiety","isReversed":false},

    {"id":11,"text":"공부를 쉬거나 잠시라도 딴짓을 하면 죄책감이 든다.","subdomain":"학습 강박 및 완벽주의","subdomainEn":"learning_obsession","isReversed":false},
    {"id":12,"text":"성적이 곧 내 존재의 가치라고 생각되어 성적 하락이 두렵다.","subdomain":"학습 강박 및 완벽주의","subdomainEn":"learning_obsession","isReversed":false},
    {"id":13,"text":"피곤해도 정해진 공부량을 다 채우기 전까지는 멈출 수 없다.","subdomain":"학습 강박 및 완벽주의","subdomainEn":"learning_obsession","isReversed":false},
    {"id":14,"text":"스스로 설정한 목표나 기준에 도달하지 못하면 자책이 심하다.","subdomain":"학습 강박 및 완벽주의","subdomainEn":"learning_obsession","isReversed":false},
    {"id":15,"text":"공부 외의 모든 활동은 시간 낭비처럼 느껴져 즐기지 못한다.","subdomain":"학습 강박 및 완벽주의","subdomainEn":"learning_obsession","isReversed":false},

    {"id":16,"text":"하루 계획표를 세운 대로 완벽하게 지키지 못하면 매우 불안하다.","subdomain":"루틴 및 시간 통제","subdomainEn":"routine_time_control","isReversed":false},
    {"id":17,"text":"공부 순서나 방식이 내 루틴에서 벗어나면 집중이 아예 안 된다.","subdomain":"루틴 및 시간 통제","subdomainEn":"routine_time_control","isReversed":false},
    {"id":18,"text":"예기치 않은 일정 변화가 생기면 극심한 스트레스를 받는다.","subdomain":"루틴 및 시간 통제","subdomainEn":"routine_time_control","isReversed":false},
    {"id":19,"text":"시간에 쫓기는 기분을 자주 느끼며 일분일초를 강박적으로 관리한다.","subdomain":"루틴 및 시간 통제","subdomainEn":"routine_time_control","isReversed":false},
    {"id":20,"text":"계획을 짜는 데만 너무 많은 시간을 쏟거나 계획에 집착한다.","subdomain":"루틴 및 시간 통제","subdomainEn":"routine_time_control","isReversed":false},

    {"id":21,"text":"공부를 시작해도 금세 딴생각이 나거나 집중이 안 된다.","subdomain":"인지 및 집중력 저하","subdomainEn":"cognitive_focus","isReversed":false},
    {"id":22,"text":"책을 읽어도 내용이 머리에 들어오지 않고 겉도는 느낌이다.","subdomain":"인지 및 집중력 저하","subdomainEn":"cognitive_focus","isReversed":false},
    {"id":23,"text":"새로운 정보를 받아들이는 것이 벅차고 머리가 과부하 된 것 같다.","subdomain":"인지 및 집중력 저하","subdomainEn":"cognitive_focus","isReversed":false},
    {"id":24,"text":"주변의 소음이나 환경적 자극에 매우 예민하게 반응한다.","subdomain":"인지 및 집중력 저하","subdomainEn":"cognitive_focus","isReversed":false},
    {"id":25,"text":"기억력이 예전만 못하고 아는 내용도 시험 때는 기억이 안 난다.","subdomain":"인지 및 집중력 저하","subdomainEn":"cognitive_focus","isReversed":false},

    {"id":26,"text":"실패할까 봐 아예 공부를 시작하는 것조차 망설이게 된다.","subdomain":"학습 회피 및 미루기","subdomainEn":"learning_avoidance","isReversed":false},
    {"id":27,"text":"공부해야 하는 것을 알지만 자꾸 스마트폰이나 딴짓으로 도피한다.","subdomain":"학습 회피 및 미루기","subdomainEn":"learning_avoidance","isReversed":false},
    {"id":28,"text":"완벽하게 해낼 자신이 없으면 차라리 미루는 것이 낫다고 생각한다.","subdomain":"학습 회피 및 미루기","subdomainEn":"learning_avoidance","isReversed":false},
    {"id":29,"text":"\"어차피 해도 안 될 거야\"라는 무기력한 생각이 지배적이다.","subdomain":"학습 회피 및 미루기","subdomainEn":"learning_avoidance","isReversed":false},
    {"id":30,"text":"공부 시작 전 준비 과정(책상 정리 등)에만 에너지를 다 쓴다.","subdomain":"학습 회피 및 미루기","subdomainEn":"learning_avoidance","isReversed":false},

    {"id":31,"text":"공부할 때 목, 어깨, 허리 등에 만성적인 통증을 느낀다.","subdomain":"신체화 및 통증","subdomainEn":"somatic_pain","isReversed":false},
    {"id":32,"text":"스트레스를 받으면 머리가 조이거나 찌르는 듯한 두통이 생긴다.","subdomain":"신체화 및 통증","subdomainEn":"somatic_pain","isReversed":false},
    {"id":33,"text":"긴장하거나 집중하면 소화가 안 되고 배가 자주 아프다.","subdomain":"신체화 및 통증","subdomainEn":"somatic_pain","isReversed":false},
    {"id":34,"text":"눈이 침침하거나 어지러움, 머리가 먹먹한 느낌을 자주 받는다.","subdomain":"신체화 및 통증","subdomainEn":"somatic_pain","isReversed":false},
    {"id":35,"text":"심리적인 긴장 상태가 몸의 통증으로 바로 이어진다.","subdomain":"신체화 및 통증","subdomainEn":"somatic_pain","isReversed":false},

    {"id":36,"text":"잠을 자도 개운하지 않고 만성적인 피로에 시달린다.","subdomain":"에너지 소진 및 번아웃","subdomainEn":"energy_burnout","isReversed":false},
    {"id":37,"text":"예전에는 열정적이었는데 지금은 모든 의욕이 사라진 상태다.","subdomain":"에너지 소진 및 번아웃","subdomainEn":"energy_burnout","isReversed":false},
    {"id":38,"text":"공부를 지속할 에너지가 완전히 방전된 것 같은 기분이다.","subdomain":"에너지 소진 및 번아웃","subdomainEn":"energy_burnout","isReversed":false},
    {"id":39,"text":"쉬어도 피로가 풀리지 않고 몸이 천근만근 무겁다.","subdomain":"에너지 소진 및 번아웃","subdomainEn":"energy_burnout","isReversed":false},
    {"id":40,"text":"성취를 해도 기쁘기보다 허무함과 냉소적인 마음이 든다.","subdomain":"에너지 소진 및 번아웃","subdomainEn":"energy_burnout","isReversed":false},

    {"id":41,"text":"\"나는 할 수 있다\"는 자신감보다 \"나는 안 될 거야\"라는 확신이 강하다.","subdomain":"자아 및 대인관계","subdomainEn":"self_relationships","isReversed":false},
    {"id":42,"text":"나는 남들보다 부족하고 못난 사람이라는 생각이 자주 든다.","subdomain":"자아 및 대인관계","subdomainEn":"self_relationships","isReversed":false},
    {"id":43,"text":"내가 누구인지, 무엇을 위해 공부하는지 정체성이 혼란스럽다.","subdomain":"자아 및 대인관계","subdomainEn":"self_relationships","isReversed":false},
    {"id":44,"text":"사람들을 만나는 것이 두렵거나 자꾸 혼자 숨고 싶어진다.","subdomain":"자아 및 대인관계","subdomainEn":"self_relationships","isReversed":false},
    {"id":45,"text":"주변 사람(가족, 친구)이 나를 한심하게 볼까 봐 두렵다.","subdomain":"자아 및 대인관계","subdomainEn":"self_relationships","isReversed":false},

    {"id":46,"text":"잠자리에 들어도 공부 생각이나 걱정 때문에 쉽게 잠들지 못한다.","subdomain":"수면 및 생활 루틴","subdomainEn":"sleep_routine","isReversed":false},
    {"id":47,"text":"자는 동안 자주 깨거나 꿈을 많이 꿔서 수면의 질이 낮다.","subdomain":"수면 및 생활 루틴","subdomainEn":"sleep_routine","isReversed":false},
    {"id":48,"text":"자고 나면 다음 날 공부를 못 할까 봐 잠자는 것조차 불안하다.","subdomain":"수면 및 생활 루틴","subdomainEn":"sleep_routine","isReversed":false},
    {"id":49,"text":"불규칙한 생활 패턴 때문에 낮 시간에 졸음이 쏟아진다.","subdomain":"수면 및 생활 루틴","subdomainEn":"sleep_routine","isReversed":false},
    {"id":50,"text":"수면 부족이 학습 효율을 떨어뜨려 다시 불안해지는 악순환을 겪는다.","subdomain":"수면 및 생활 루틴","subdomainEn":"sleep_routine","isReversed":false}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  question_count = EXCLUDED.question_count,
  duration_minutes = EXCLUDED.duration_minutes,
  is_recommended = EXCLUDED.is_recommended,
  is_coming_soon = EXCLUDED.is_coming_soon,
  is_integrated = EXCLUDED.is_integrated,
  is_free = EXCLUDED.is_free,
  price_krw = EXCLUDED.price_krw,
  subdomains = EXCLUDED.subdomains,
  questions = EXCLUDED.questions;

-- ─── 기존 26개 검사 일회성 가격 시드 ──────────────────────
-- 단품 구매 가격 ₩2,900 (Pro 구독자는 주 2회 무료 사용 가능)
-- INT(통합검사)는 무료라서 제외, 기본값 0 유지
UPDATE public.tests
   SET price_krw = 2900
 WHERE id <> 'INT'
   AND is_free = false
   AND price_krw = 0;
