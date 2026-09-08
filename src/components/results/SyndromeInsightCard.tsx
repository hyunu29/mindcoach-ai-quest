import { Card } from "@/components/ui/card";
import { syndromes } from "@/data/seed-data";
import { CHITO_POSES } from "@/lib/character/chito";

interface SyndromeInsightCardProps {
  syndromeName: string;
}

/* 매칭 증후군 심층 리포트 — 원인·신호·해볼 수 있는 것.
 * 김종환 심리코치 『수험생 심리 증후군 종합 가이드』의 원인(Causes)/증상(Symptoms)/
 * 노력 방안(Solutions) 구조를 치토 화법으로 노출. (기존: 이름만 표시 → 심층 카드로 승격) */
export default function SyndromeInsightCard({ syndromeName }: SyndromeInsightCardProps) {
  const syndrome = syndromes.find((s) => s.name === syndromeName);
  if (!syndrome) return null;

  return (
    <Card className="p-5 rounded-2xl border-border/50 shadow-sm overflow-hidden">
      {/* 헤더 — 치토가 번역자 역할 */}
      <div className="flex items-start gap-3 mb-4">
        <img
          src={CHITO_POSES.thinking}
          alt=""
          className="w-14 h-14 object-contain shrink-0"
          loading="lazy"
        />
        <div className="min-w-0">
          <p className="text-[11px] font-bold gradient-text mb-0.5">치토가 풀어주는</p>
          <h2 className="font-bold">{syndrome.name}</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {syndrome.description}
          </p>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 mb-4 leading-relaxed">
        이건 병명이 아니라, 비슷한 마음 패턴에 붙인 이름이야. 의학적 진단이 아니니
        "내가 이상한가"가 아니라 "내 마음이 이런 신호를 보내는구나"로 읽어줘.
      </p>

      <div className="space-y-4">
        {/* 원인 */}
        <div>
          <h3 className="text-sm font-bold mb-2">🌱 왜 이런 마음이 들까</h3>
          <ul className="space-y-1.5">
            {syndrome.causes.map((c) => (
              <li key={c} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                <span className="w-1 h-1 rounded-full bg-primary/60 mt-1.5 shrink-0" />
                {c}
              </li>
            ))}
          </ul>
        </div>

        {/* 증상 — 셀프 체크 느낌의 칩 */}
        <div>
          <h3 className="text-sm font-bold mb-2">🔍 이런 신호가 나타나곤 해</h3>
          <div className="flex flex-wrap gap-1.5">
            {syndrome.symptoms.map((s) => (
              <span
                key={s}
                className="text-[11px] font-medium px-2.5 py-1.5 rounded-full bg-primary/5 border border-primary/15 text-foreground/75"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* 해결 방안 — 실천 스텝 */}
        <div>
          <h3 className="text-sm font-bold mb-2">💪 치토랑 같이 해볼 수 있는 것</h3>
          <ol className="space-y-2">
            {syndrome.solutions.map((sol, i) => (
              <li key={sol} className="flex items-start gap-2.5 text-xs leading-relaxed">
                <span className="w-5 h-5 rounded-full gradient-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="pt-0.5">{sol}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground mt-4 pt-3 border-t border-border/50">
        김종환 심리코치의 『수험생 심리 증후군 종합 가이드』(32종 분류 체계)를 바탕으로
        구성했어요. 더 깊은 맞춤 해석은 AI 코칭에서 치토와 대화하며 받아볼 수 있어.
      </p>
    </Card>
  );
}
