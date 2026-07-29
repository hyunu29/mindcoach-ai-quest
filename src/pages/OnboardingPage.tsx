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
import AcademyCodeInput from '@/components/academy/AcademyCodeInput';
import type { AcademyLookup } from '@/components/academy/AcademyCodeInput';
import PrivacyDisclosureModal from '@/components/academy/PrivacyDisclosureModal';
import { useConnectAcademy } from '@/hooks/useConnectAcademy';

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
  const [pendingAcademy, setPendingAcademy] = useState<AcademyLookup | null>(null);
  const [selectedAcademy, setSelectedAcademy] = useState<AcademyLookup | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const { connect } = useConnectAcademy();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    void (supabase.from('profiles') as unknown as {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          single: () => Promise<{ data: { onboarded_at: string | null; user_type: string | null } | null }>;
        };
      };
    })
      .select('onboarded_at, user_type')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        // 학원 관리자/시스템 어드민은 원생 온보딩 흐름을 건너뜀
        if (data?.user_type === 'academy_admin') {
          navigate('/admin', { replace: true });
          return;
        }
        if (data?.user_type === 'super_admin') {
          navigate('/sysadmin', { replace: true });
          return;
        }
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
    if (selectedAcademy) {
      await connect(selectedAcademy.id);
    }
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
        <div className="space-y-2">
          <Label>학원 코드 (선택)</Label>
          {selectedAcademy ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
              <div>
                <div className="text-sm font-medium">{selectedAcademy.name}</div>
                <div className="text-[10px] text-muted-foreground">연결 예약됨</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAcademy(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                취소
              </button>
            </div>
          ) : (
            <AcademyCodeInput
              onFound={(a) => {
                setPendingAcademy(a);
                setPrivacyOpen(true);
              }}
              buttonLabel="확인"
            />
          )}
        </div>
        <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl">
          시작하기
        </Button>
      </form>
      <PrivacyDisclosureModal
        open={privacyOpen}
        academyName={pendingAcademy?.name ?? ''}
        onConfirm={() => {
          setSelectedAcademy(pendingAcademy);
          setPrivacyOpen(false);
          setPendingAcademy(null);
        }}
        onCancel={() => {
          setPrivacyOpen(false);
          setPendingAcademy(null);
        }}
      />
    </div>
  );
}
