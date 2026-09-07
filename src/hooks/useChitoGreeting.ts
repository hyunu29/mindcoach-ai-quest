import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const GREETING_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chito-greeting`;

/** 감정 기록 기반 생성형 치토 인사말.
 * 일 1회 + 마지막 기록이 바뀔 때만 재생성 (localStorage 캐시). 실패 시 fallback. */
export function useChitoGreeting(userId: string | null, fallback: string, lastRecordKey: string) {
  const [greeting, setGreeting] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const d = new Date();
    const dateKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const cacheKey = `chito_greeting:${userId}:${dateKey}:${lastRecordKey}`;

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setGreeting(cached);
        return;
      }
    } catch { /* localStorage unavailable */ }

    let cancelled = false;
    void (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) return;
        const res = await fetch(GREETING_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: '{}',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data.greeting) return;
        setGreeting(data.greeting);
        try {
          localStorage.setItem(cacheKey, data.greeting);
        } catch { /* ignore */ }
      } catch (e) {
        console.warn('[chito-greeting] failed', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, lastRecordKey]);

  return greeting ?? fallback;
}
