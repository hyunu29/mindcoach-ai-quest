import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * 배너 광고 섹션 (병원 광고 — 주 수입원)
 * v1: 전국/지역 문자열 타겟팅(ad_banners.region). 노출·클릭은 ad_events에 기록.
 * ⚠️ GPS 기반 근처 병원 타겟팅은 위치기반서비스사업 신고 후 v2에서 도입.
 */

interface AdBanner {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  advertiser: string;
}

type BannerRow = { id: string; title: string; image_url: string; link_url: string | null; advertiser: string };

export default function AdBannerSection() {
  const { user } = useAuth();
  const [banner, setBanner] = useState<AdBanner | null>(null);
  const impressionLogged = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await (supabase.from('ad_banners' as never) as unknown as {
        select: (cols: string) => {
          order: (col: string, opts: { ascending: boolean }) => {
            limit: (n: number) => Promise<{ data: BannerRow[] | null }>;
          };
        };
      })
        .select('id, title, image_url, link_url, advertiser')
        .order('priority', { ascending: false })
        .limit(5);
      if (cancelled || !data || data.length === 0) return;
      // 단순 로테이션: 우선순위 상위 중 무작위 1개
      setBanner(data[Math.floor(Math.random() * data.length)]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!banner || impressionLogged.current) return;
    impressionLogged.current = true;
    void (supabase.from('ad_events' as never) as unknown as {
      insert: (v: Record<string, unknown>) => Promise<unknown>;
    }).insert({ banner_id: banner.id, user_id: user?.id ?? null, event: 'impression' });
  }, [banner, user]);

  if (!banner) return null;

  const handleClick = () => {
    void (supabase.from('ad_events' as never) as unknown as {
      insert: (v: Record<string, unknown>) => Promise<unknown>;
    }).insert({ banner_id: banner.id, user_id: user?.id ?? null, event: 'click' });
    if (banner.link_url) window.open(banner.link_url, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={handleClick}
      className="relative w-full rounded-2xl overflow-hidden border border-border/50 shadow-sm block text-left transition-transform active:scale-[0.99]"
      aria-label={`광고: ${banner.title} — ${banner.advertiser}`}
    >
      <img src={banner.image_url} alt={banner.title} className="w-full h-auto block" loading="lazy" />
      <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/45 text-white tracking-wider">
        AD
      </span>
    </button>
  );
}
