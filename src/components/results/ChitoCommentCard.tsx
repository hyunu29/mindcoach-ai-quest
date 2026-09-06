import { Phone } from "lucide-react";
import { CHITO_POSES, type ChitoPose } from "@/lib/character/chito";

type RiskLevel = "safe" | "caution" | "warning" | "danger";

interface ChitoCommentCardProps {
  riskLevel: string;
}

/* 결과를 평가가 아니라 "마음이 보내는 신호"로 번역하는 치토의 한마디
 * (CHITO-STORY-SCENARIO.md 여정 4 · 점검 리포트 ⑥ "캐릭터 = 해석의 문법") */
const COMMENTS: Record<RiskLevel, { pose: ChitoPose; lines: string[] }> = {
  safe: {
    pose: "cheering",
    lines: [
      "지금 마음, 잘 버텨주고 있어.",
      "'괜찮음'도 그냥 생기는 게 아니라 네가 만들어낸 거야. 이 페이스 그대로 가자.",
    ],
  },
  caution: {
    pose: "main",
    lines: [
      "조금 지친 신호가 보여.",
      "네가 이상해서가 아니라, 마음이 쉬고 싶다고 말하는 거야. 같이 살펴보자.",
    ],
  },
  warning: {
    pose: "thinking",
    lines: [
      "요즘 마음이 꽤 무거웠구나.",
      "이건 네가 약해서가 아니라, 그만큼 애쓰고 있었다는 뜻이야. 혼자 감당하지 않아도 돼.",
    ],
  },
  danger: {
    pose: "main",
    lines: [
      "많이 힘들었겠다. 여기까지 와서 확인한 것만으로도 큰 용기야.",
      "혼자 감당하지 않아도 돼. 나랑 같이, 천천히 풀어가자.",
    ],
  },
};

const SHOW_HELP_LINE: RiskLevel[] = ["warning", "danger"];

export default function ChitoCommentCard({ riskLevel }: ChitoCommentCardProps) {
  const level: RiskLevel = (["safe", "caution", "warning", "danger"] as RiskLevel[]).includes(
    riskLevel as RiskLevel,
  )
    ? (riskLevel as RiskLevel)
    : "caution";
  const comment = COMMENTS[level];

  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary/[0.07] via-card to-secondary/[0.07] border border-primary/15 p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <img
          src={CHITO_POSES[comment.pose]}
          alt="치토"
          className="w-20 h-20 object-contain shrink-0 animate-chito-float"
          loading="eager"
        />
        <div className="flex-1 pt-0.5">
          <p className="text-xs font-bold gradient-text mb-1.5">치토의 한마디</p>
          <p className="text-sm font-semibold leading-relaxed">{comment.lines[0]}</p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-1">{comment.lines[1]}</p>
          {SHOW_HELP_LINE.includes(level) && (
            <a
              href="tel:1388"
              className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-primary hover:underline"
            >
              <Phone className="w-3.5 h-3.5" />
              누군가와 직접 이야기하고 싶다면 — 청소년전화 1388 (24시간)
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
