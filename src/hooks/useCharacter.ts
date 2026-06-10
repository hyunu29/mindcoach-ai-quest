import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Breed } from '@/lib/character/types';
import { track } from '@/lib/analytics';

interface CharacterState {
  selectedBreed: Breed | null;
  recommendedBreed: Breed | null;
  changeCount: number;
}

type CharacterRow = {
  selected_breed: string | null;
  recommended_breed: string | null;
  character_changed_count: number | null;
};

// Supabase 타입은 마이그레이션 push 후 자동 재생성됨.
// 그 사이 빌드를 위한 좁은 타입 우회 (ProtectedRoute와 동일 패턴).
type SelectChain = {
  select: (cols: string) => {
    eq: (col: string, val: string) => {
      single: () => Promise<{ data: CharacterRow | null }>;
    };
  };
};

type UpdateChain = {
  update: (vals: Record<string, unknown>) => {
    eq: (col: string, val: string) => Promise<{ error: unknown }>;
  };
};

export function useCharacter() {
  const { user } = useAuth();
  const [state, setState] = useState<CharacterState>({
    selectedBreed: null,
    recommendedBreed: null,
    changeCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await (supabase.from('profiles') as unknown as SelectChain)
        .select('selected_breed, recommended_breed, character_changed_count')
        .eq('id', user.id)
        .single();
      setState({
        selectedBreed: (data?.selected_breed as Breed | null) ?? null,
        recommendedBreed: (data?.recommended_breed as Breed | null) ?? null,
        changeCount: data?.character_changed_count ?? 0,
      });
    } catch {
      // 마이그레이션 미적용 등 컬럼 누락 시 영원한 spinner 방지.
      // 사용자에게는 캐릭터 미선택 상태로 노출.
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectCharacter = useCallback(
    async (breed: Breed, source: 'recommended' | 'free' | 'changed') => {
      if (!user) return;
      const isChange = state.selectedBreed !== null && state.selectedBreed !== breed;
      const newCount = isChange ? state.changeCount + 1 : state.changeCount;
      const fromBreed = state.selectedBreed;

      await (supabase.from('profiles') as unknown as UpdateChain)
        .update({
          selected_breed: breed,
          character_chosen_at: new Date().toISOString(),
          character_changed_count: newCount,
        })
        .eq('id', user.id);

      if (isChange) {
        void track('character_changed', {
          from_breed: fromBreed,
          to_breed: breed,
          change_count: newCount,
        });
      } else {
        void track('character_selected', { breed, source });
      }
      await refresh();
    },
    [user, state, refresh],
  );

  return { ...state, loading, selectCharacter, refresh };
}
