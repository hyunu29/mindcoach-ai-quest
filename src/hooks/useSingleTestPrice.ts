import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// 2026-08-12 가격 확정: 검사 단품 개인 5,900원 / 학원 연결 학생 2,900원
// ⚠️ supabase/functions/_shared/pricing.ts 와 동기화 (서버가 최종 금액 결정)
export const SINGLE_TEST_PRICE = 5900;
export const ACADEMY_SINGLE_TEST_PRICE = 2900;

/** 현재 사용자의 검사 단품 가격 (학원 연결 시 혜택가) */
export function useSingleTestPrice() {
  const { user } = useAuth();
  const [isAcademyStudent, setIsAcademyStudent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAcademyStudent(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('academy_id')
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled) {
        setIsAcademyStudent(!!(data as { academy_id?: string | null } | null)?.academy_id);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return {
    price: isAcademyStudent ? ACADEMY_SINGLE_TEST_PRICE : SINGLE_TEST_PRICE,
    isAcademyStudent,
    loading,
  };
}
