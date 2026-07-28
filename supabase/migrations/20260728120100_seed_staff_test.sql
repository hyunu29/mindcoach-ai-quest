-- =============================================================
-- STAFF-1 학원 교직원 심리건강 자가 진단검사 30문항 seed
-- 4개 하위 영역 · 4점 Likert(0~3) · 90점 만점
-- =============================================================

insert into public.tests (
  id, name, category, related_syndrome, description,
  question_count, duration_minutes,
  is_recommended, is_coming_soon, is_integrated, is_free, price_krw,
  likert_min, likert_max, likert_labels, is_staff_only,
  subdomains, questions
) values (
  'STAFF-1',
  '학원 교직원 심리건강 자가 진단검사',
  'STAFF',
  '교직원 번아웃',
  '학원 종사자의 우울, 감정소모, 근무환경 스트레스, 사회적 고립을 측정합니다.',
  30, 10,
  false, false, false, true, 0,
  0, 3,
  '["전혀 그렇지 않다", "가끔 그렇다 (주 1~2회)", "자주 그렇다 (주 3~4회)", "거의 항상 그렇다 (주 5회 이상)"]'::jsonb,
  true,
  '["정서적 및 신체적 우울 증상","학생 및 학부모 관리에 따른 감정소모","근무환경 및 직무 스트레스","사회적 고립 및 냉소성"]'::jsonb,
  '[
    {"id":1,"text":"아침에 눈을 뜰 때 깊은 무기력감이나 우울함을 느낀다.","subdomain":"정서적 및 신체적 우울 증상","subdomainEn":"Depression","isReversed":false},
    {"id":2,"text":"예전에 즐겁게 하던 일이나 취미 활동에 아무런 흥미를 느끼지 못한다.","subdomain":"정서적 및 신체적 우울 증상","subdomainEn":"Depression","isReversed":false},
    {"id":3,"text":"푹 자고 일어나도 피로가 저혀 풀리지 않거나, 오히려 온 몸이 묵직하다.","subdomain":"정서적 및 신체적 우울 증상","subdomainEn":"Depression","isReversed":false},
    {"id":4,"text":"이유 없이 눈물이 나거나 마음이 쉽게 쿵쾅거리고 불안해진다.","subdomain":"정서적 및 신체적 우울 증상","subdomainEn":"Depression","isReversed":false},
    {"id":5,"text":"식욕이 급격히 떨어지거나, 반대로 스트레스로 인한 폭식을 하게 된다.","subdomain":"정서적 및 신체적 우울 증상","subdomainEn":"Depression","isReversed":false},
    {"id":6,"text":"밤에 잠들기 어렵거나, 자다가 자주 깨서 다시 잠들지 못한다.","subdomain":"정서적 및 신체적 우울 증상","subdomainEn":"Depression","isReversed":false},
    {"id":7,"text":"내가 가치 없는 사람처럼 느껴지거나, 나만 뒤처지고 있다는 자괴감이 든다.","subdomain":"정서적 및 신체적 우울 증상","subdomainEn":"Depression","isReversed":false},
    {"id":8,"text":"하루 중 대부분의 시간에 마음이 멍하고 집중하기가 어렵다.","subdomain":"정서적 및 신체적 우울 증상","subdomainEn":"Depression","isReversed":false},
    {"id":9,"text":"학생들의 성적 하락이나 수시/정시 결과에 대해 과도한 죄책감이나 중압감을 느낀다.","subdomain":"학생 및 학부모 관리에 따른 감정소모","subdomainEn":"Consumption","isReversed":false},
    {"id":10,"text":"학생이나 학부모의 컴플레인(민원)을 접할 때 필요 이상으로 가슴이 답답하고 두렵다.","subdomain":"학생 및 학부모 관리에 따른 감정소모","subdomainEn":"Consumption","isReversed":false},
    {"id":11,"text":"학생들을 진심으로 대하기보다 영혼 없이 기계적으로 응대하게 된다.","subdomain":"학생 및 학부모 관리에 따른 감정소모","subdomainEn":"Consumption","isReversed":false},
    {"id":12,"text":"학생들의 둔감하거나 비협조적인 태도를 볼 때 감정 조절이 어렵고 울컥 화가 난다.","subdomain":"학생 및 학부모 관리에 따른 감정소모","subdomainEn":"Consumption","isReversed":false},
    {"id":13,"text":"상담이나 생활지도 업무를 앞두고 심한 부담감과 피하고 싶은 마음이 든다.","subdomain":"학생 및 학부모 관리에 따른 감정소모","subdomainEn":"Consumption","isReversed":false},
    {"id":14,"text":"학원 내에서 일어나는 학생 관련 문제나 사고가 모두 내 탓으로 느껴진다.","subdomain":"학생 및 학부모 관리에 따른 감정소모","subdomainEn":"Consumption","isReversed":false},
    {"id":15,"text":"퇴근 후(또는 휴게시간)에도 학생이나 학부모에게 연락이 올까 봐 불안해한다.","subdomain":"학생 및 학부모 관리에 따른 감정소모","subdomainEn":"Consumption","isReversed":false},
    {"id":16,"text":"학생들에게 더 이상 긍정적인 영향을 주지 못하는 ''무능한 선생님''이라는 생각이 든다.","subdomain":"학생 및 학부모 관리에 따른 감정소모","subdomainEn":"Consumption","isReversed":false},
    {"id":17,"text":"출근할 때나 학원 정문을 통과할 때 가슴이 답답하고 숨이 막히는 느낌을 느낀다.","subdomain":"근무환경 및 직무 스트레스","subdomainEn":"WorkStress","isReversed":false},
    {"id":18,"text":"과도한 근무 시간이나 불규칙한 생활 패턴으로 인해 삶의 균형이 깨졌다고 느낀다.","subdomain":"근무환경 및 직무 스트레스","subdomainEn":"WorkStress","isReversed":false},
    {"id":19,"text":"나에게 주어진 역할(강의/관리/입시 등)의 양이 혼자 감당하기 버겁다.","subdomain":"근무환경 및 직무 스트레스","subdomainEn":"WorkStress","isReversed":false},
    {"id":20,"text":"학원 특유의 폐쇄적이거나 고립된 환경 때문에 갇혀 있다는 답답함을 느낀다.","subdomain":"근무환경 및 직무 스트레스","subdomainEn":"WorkStress","isReversed":false},
    {"id":21,"text":"직장 내(동료, 상사, 원장 등)와의 소통이 원활하지 않고 혼자 고립된 것 같다.","subdomain":"근무환경 및 직무 스트레스","subdomainEn":"WorkStress","isReversed":false},
    {"id":22,"text":"나의 노력이 성과나 보상으로 충분히 인정받지 못한다고 느낀다.","subdomain":"근무환경 및 직무 스트레스","subdomainEn":"WorkStress","isReversed":false},
    {"id":23,"text":"쉬는 날에도 학원 업무나 학생 관리 생각에서 벗어나지 못한다.","subdomain":"근무환경 및 직무 스트레스","subdomainEn":"WorkStress","isReversed":false},
    {"id":24,"text":"이 일을 언제까지 계속 할 수 있을지 미래에 대한 불확실성으로 우울해진다.","subdomain":"근무환경 및 직무 스트레스","subdomainEn":"WorkStress","isReversed":false},
    {"id":25,"text":"퇴근 후나 쉬는 날에 가족, 친구 등 지인들과 연락하거나 만나는 것이 귀찮고 피하고 싶다.","subdomain":"사회적 고립 및 냉소성","subdomainEn":"Isolation","isReversed":false},
    {"id":26,"text":"타인에게 내 힘듦을 털어놓아도 아무것도 바뀌지 않을 것이라 생각하여 말을 아끼게 된다.","subdomain":"사회적 고립 및 냉소성","subdomainEn":"Isolation","isReversed":false},
    {"id":27,"text":"주변 사람들이 나를 이해하지 못하거나 나에게 관심이 없다고 느낀다.","subdomain":"사회적 고립 및 냉소성","subdomainEn":"Isolation","isReversed":false},
    {"id":28,"text":"\"다 의미없다\", \"어차피 안 될 것이다.\"와 같은 냉소적인 생각이 자주 든다.","subdomain":"사회적 고립 및 냉소성","subdomainEn":"Isolation","isReversed":false},
    {"id":29,"text":"혼자 있을 때 원인을 알 수 없는 외로움이나 고립감이 강하게 밀려온다.","subdomain":"사회적 고립 및 냉소성","subdomainEn":"Isolation","isReversed":false},
    {"id":30,"text":"현재 상황을 벗어날 수 있는 방법이 없다는 무기력함이나 절망감이 든다.","subdomain":"사회적 고립 및 냉소성","subdomainEn":"Isolation","isReversed":false}
  ]'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  related_syndrome = excluded.related_syndrome,
  description = excluded.description,
  question_count = excluded.question_count,
  duration_minutes = excluded.duration_minutes,
  is_free = excluded.is_free,
  price_krw = excluded.price_krw,
  likert_min = excluded.likert_min,
  likert_max = excluded.likert_max,
  likert_labels = excluded.likert_labels,
  is_staff_only = excluded.is_staff_only,
  subdomains = excluded.subdomains,
  questions = excluded.questions;
