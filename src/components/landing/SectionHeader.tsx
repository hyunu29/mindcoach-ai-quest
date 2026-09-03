import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}

/** 랜딩 공용 섹션 헤더 — 그라데이션 아이브로우 → 대형 잉크 헤드라인 위계 (docs/design/DESIGN-TEMPLATES.md) */
export default function SectionHeader({ eyebrow, title, subtitle, className }: SectionHeaderProps) {
  return (
    <div className={cn("text-center", className)}>
      <p className="gradient-text text-sm md:text-base font-bold mb-3">{eyebrow}</p>
      <h2 className="text-[1.75rem] leading-[1.3] md:text-4xl font-bold text-foreground tracking-[-0.02em]">
        {title}
      </h2>
      {subtitle && (
        <p className="text-muted-foreground text-sm md:text-base mt-4 max-w-lg mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}
