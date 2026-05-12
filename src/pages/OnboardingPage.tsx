import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { track } from '@/lib/analytics';

const GRADES = ['중1', '중2', '중3', '고1', '고2', '고3', 'N수', '대학생', '일반'];

// profiles 테이블에 school/onboarded_at 컬럼이 마이그레이션
// (20260508120100_phase1_profile_school_grade.sql)으로 추가되었으나
// Supabase TS types는 Lovable에서 마이그레이션 push 후 자동 재생성됨.
// 그 사이 빌드를 위한 좁은 타입 우회.
type ProfileUpsert = {
  id: string;
  nickname: string;
  school: string | null;
  grade: string;
  onboarded_at: string;
};

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [school, setSchool] = useState('');
  const [grade, setGrade] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    void (supabase.from('profiles') as unknown as {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          single: () => Promise<{ data: { onboarded_at: string | null } | null }>;
        };
      };
    })
      .select('onboarded_at')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.onboarded_at) navigate('/dashboard', { replace: true });
      });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !grade) {
      toast.error('닉네임과 학년을 입력해주세요.');
      return;
    }
    if (!user) return;
    setSubmitting(true);
    const payload: ProfileUpsert = {
      id: user.id,
      nickname: nickname.trim(),
      school: school.trim() || null,
      grade,
      onboarded_at: new Date().toISOString(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('profiles') as any).upsert(payload);
    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }
    void track('onboarding_completed', { grade });
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6 animate-reveal-up">
        <h1 className="text-2xl font-bold text-center">잠깐 자기소개를 부탁드려요</h1>
        <div className="space-y-2">
          <Label>닉네임 *</Label>
          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label>학교 (선택)</Label>
          <Input
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            maxLength={40}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label>학년 *</Label>
          <Select value={grade} onValueChange={setGrade}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {GRADES.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl">
          시작하기
        </Button>
      </form>
    </div>
  );
}
