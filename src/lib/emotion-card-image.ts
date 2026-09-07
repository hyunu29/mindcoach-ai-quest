import { emotionOptions } from '@/lib/emotion-agent-types';
import { getChitoTransparentEmotionUrl } from '@/lib/character/chito';
import { getEmotionColor } from '@/lib/emotion-colors';
import type { EmotionJournalData } from '@/lib/emotion-agent-types';

/* 감정 기록 공유용 비주얼 카드 (1080×1350, 인스타 4:5)
 * ⚠️ 프라이버시: 상황 원문·신체반응은 절대 포함하지 않는다 — 감정·날짜·치토 한마디만.
 * (점검 리포트 ③ B-2 · ④ 가드레일 "임상 정보 미노출") */

const W = 1080;
const H = 1350;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const ch of text) {
    const test = current + ch;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = ch === ' ' ? '' : ch;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export async function generateEmotionCardImage(journal: EmotionJournalData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const opt = emotionOptions.find((e) => e.key === journal.primaryEmotion);
  const accent = getEmotionColor(journal.primaryEmotion);
  const font = (weight: number, size: number) =>
    `${weight} ${size}px "Pretendard Variable", Pretendard, "Apple SD Gothic Neo", sans-serif`;

  // 배경 — 감정 컬러 소프트 그라데이션
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, opt?.gradientFrom || '#F3F4F6');
  bg.addColorStop(1, '#FFFFFF');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 감정색 글로우
  const glow = ctx.createRadialGradient(W / 2, 560, 60, W / 2, 560, 520);
  glow.addColorStop(0, hexToRgba(accent, 0.28));
  glow.addColorStop(1, hexToRgba(accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';

  // 날짜
  ctx.fillStyle = 'rgba(35,38,58,0.55)';
  ctx.font = font(600, 34);
  ctx.fillText(journal.date, W / 2, 120);

  // 타이틀
  ctx.fillStyle = '#23263A';
  ctx.font = font(800, 52);
  ctx.fillText('오늘의 마음', W / 2, 190);

  // 치토 표정
  try {
    const chito = await loadImage(getChitoTransparentEmotionUrl(journal.primaryEmotion));
    ctx.drawImage(chito, W / 2 - 260, 280, 520, 520);
  } catch {
    /* 이미지 실패 시 텍스트 카드로 진행 */
  }

  // 감정 라벨 필
  const label = `${opt?.emoji ?? ''} ${journal.primaryEmotionLabel}`;
  ctx.font = font(800, 56);
  const labelW = ctx.measureText(label).width + 120;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(W / 2 - labelW / 2, 850, labelW, 110, 55);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(accent, 0.5);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#23263A';
  ctx.fillText(label, W / 2, 925);

  // 치토 한마디 (템플릿 코멘트 — 개인 입력 원문 아님)
  ctx.fillStyle = 'rgba(35,38,58,0.75)';
  ctx.font = font(500, 38);
  const lines = wrapText(ctx, `“${journal.aiComment}”`, 820).slice(0, 3);
  lines.forEach((line, i) => ctx.fillText(line, W / 2, 1060 + i * 58));

  // 푸터 — 브랜드
  ctx.fillStyle = 'rgba(35,38,58,0.45)';
  ctx.font = font(700, 30);
  ctx.fillText('마이치 · 치토와 함께한 오늘', W / 2, 1265);
  ctx.font = font(500, 26);
  ctx.fillText('mych.co.kr', W / 2, 1305);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png');
  });
}
