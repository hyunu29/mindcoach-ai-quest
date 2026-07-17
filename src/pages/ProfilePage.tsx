import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, LogOut, ChevronRight, Loader2, Save } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useCharacter } from "@/hooks/useCharacter";
import { CharacterSelectModal } from "@/components/character/CharacterSelectModal";
import { BREED_PERSONAS, type Breed } from "@/lib/character/types";
import { getCharacterCardUrl } from "@/lib/character/asset-url";
import AcademyCodeInput, { type AcademyLookup } from "@/components/academy/AcademyCodeInput";
import PrivacyDisclosureModal from "@/components/academy/PrivacyDisclosureModal";
import { useConnectAcademy } from "@/hooks/useConnectAcademy";

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nickname, setNickname] = useState("");
  const [schoolType, setSchoolType] = useState("");
  const [grade, setGrade] = useState("");
  const [editMode, setEditMode] = useState(false);

  // Password change
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Character mascot
  const {
    selectedBreed,
    recommendedBreed,
    loading: characterLoading,
    selectCharacter,
  } = useCharacter();
  const [characterModalOpen, setCharacterModalOpen] = useState(false);

  // Academy connection
  const [academyId, setAcademyId] = useState<string | null>(null);
  const [academyName, setAcademyName] = useState<string | null>(null);
  const [academyJoinedAt, setAcademyJoinedAt] = useState<string | null>(null);
  const [pendingAcademy, setPendingAcademy] = useState<AcademyLookup | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const { connect, connecting } = useConnectAcademy();

  const handleCharacterSelect = async (breed: Breed) => {
    const source: 'recommended' | 'free' | 'changed' =
      breed === recommendedBreed
        ? 'recommended'
        : selectedBreed === null
        ? 'free'
        : 'changed';
    await selectCharacter(breed, source);
    setCharacterModalOpen(false);
  };

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (data) {
        setNickname(data.nickname || "");
        setSchoolType(data.school_type || "");
        setGrade(data.grade || "");
        const d = data as { academy_id?: string | null; academy_joined_at?: string | null };
        setAcademyId(d.academy_id ?? null);
        setAcademyJoinedAt(d.academy_joined_at ?? null);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (!academyId) {
      setAcademyName(null);
      return;
    }
    void (async () => {
      const { data } = await (supabase.from('academies') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            maybeSingle: () => Promise<{ data: { name: string } | null }>;
          };
        };
      })
        .select('name')
        .eq('id', academyId)
        .maybeSingle();
      if (data) setAcademyName(data.name);
    })();
  }, [academyId]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        nickname,
        school_type: schoolType,
        grade,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      toast.error("저장에 실패했습니다.");
    } else {
      toast.success("프로필이 저장되었습니다.");
      setEditMode(false);
    }
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast.error("비밀번호는 최소 6자리여야 합니다.");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error("비밀번호 변경에 실패했습니다.");
    } else {
      toast.success("비밀번호가 변경되었습니다.");
      setNewPassword("");
      setShowPasswordChange(false);
    }
    setChangingPassword(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const displayName = nickname || user?.email?.split("@")[0] || "사용자";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-reveal-up">
      <h1 className="text-2xl font-bold">마이페이지</h1>

      <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-7 h-7 text-primary" />
          </div>
          <div>
            <div className="font-bold">{displayName}</div>
            <div className="text-sm text-muted-foreground">{user?.email}</div>
          </div>
        </div>
      </Card>

      {/* Mascot Character */}
      {!characterLoading && (
        <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">내 마스코트</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCharacterModalOpen(true)}
            >
              {selectedBreed ? '변경' : '선택'}
            </Button>
          </div>
          <div className="flex items-center gap-4">
            {selectedBreed ? (
              <>
                <img
                  src={getCharacterCardUrl(selectedBreed)}
                  alt={BREED_PERSONAS[selectedBreed].koreanName}
                  className="w-20 h-20 object-contain"
                  loading="lazy"
                />
                <div className="flex-1">
                  <div className="font-bold">
                    {BREED_PERSONAS[selectedBreed].koreanName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {BREED_PERSONAS[selectedBreed].personaName}
                  </div>
                  <div className="text-xs mt-1">
                    {BREED_PERSONAS[selectedBreed].copy}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 text-sm text-muted-foreground">
                아직 마스코트를 선택하지 않았어요. 통합검사를 받으면 가장 잘 맞는 마스코트를 추천드려요.
              </div>
            )}
          </div>
        </Card>
      )}

      <CharacterSelectModal
        open={characterModalOpen}
        onOpenChange={setCharacterModalOpen}
        currentBreed={selectedBreed}
        recommendedBreed={recommendedBreed}
        onSelect={handleCharacterSelect}
      />

      {/* Profile Edit */}
      <Card className="p-5 rounded-2xl border-border/50 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">프로필 정보</h2>
          {!editMode && (
            <Button variant="ghost" size="sm" onClick={() => setEditMode(true)}>
              수정
            </Button>
          )}
        </div>

        {editMode ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>닉네임</Label>
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="닉네임을 입력하세요"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>학교 유형</Label>
              <Select value={schoolType} onValueChange={setSchoolType}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="중학생">중학생</SelectItem>
                  <SelectItem value="고등학생">고등학생</SelectItem>
                  <SelectItem value="재수생">재수생</SelectItem>
                  <SelectItem value="기타">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>학년</Label>
              <Input
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="예: 2학년"
                className="rounded-xl"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                저장
              </Button>
              <Button variant="outline" onClick={() => setEditMode(false)} className="flex-1">
                취소
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">닉네임</span>
              <span>{nickname || "미설정"}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">학교 유형</span>
              <span>{schoolType || "미설정"}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">학년</span>
              <span>{grade || "미설정"}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Academy connection */}
      <Card className="p-5 rounded-2xl border-border/50 shadow-sm space-y-3">
        <h2 className="font-bold">학원 연결</h2>
        {academyId && academyName ? (
          <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
            <div>
              <div className="text-sm font-medium">{academyName}</div>
              <div className="text-[10px] text-muted-foreground">
                {academyJoinedAt
                  ? `${new Date(academyJoinedAt).toLocaleDateString('ko-KR')} 연결`
                  : '연결됨'}
              </div>
            </div>
            <span className="text-xs text-primary font-medium">연결됨</span>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              학원에서 받은 코드를 입력하면 학원 관리자가 심리 신호로 여러분을 챙길 수 있어요.
            </p>
            <AcademyCodeInput
              onFound={(a) => {
                setPendingAcademy(a);
                setPrivacyOpen(true);
              }}
            />
          </>
        )}
      </Card>

      <PrivacyDisclosureModal
        open={privacyOpen}
        academyName={pendingAcademy?.name ?? ''}
        loading={connecting}
        onConfirm={async () => {
          if (!pendingAcademy) return;
          const ok = await connect(pendingAcademy.id);
          if (ok) {
            setAcademyId(pendingAcademy.id);
            setAcademyName(pendingAcademy.name);
            setAcademyJoinedAt(new Date().toISOString());
            toast.success(`${pendingAcademy.name}에 연결됐어요`);
            setPrivacyOpen(false);
            setPendingAcademy(null);
          } else {
            toast.error('연결에 실패했어요. 다시 시도해 주세요.');
          }
        }}
        onCancel={() => {
          setPrivacyOpen(false);
          setPendingAcademy(null);
        }}
      />

      {/* Menu Items */}
      <div className="space-y-2">
        <button
          onClick={() => navigate("/history")}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-card border border-border/50 text-sm font-medium hover:bg-muted transition-colors active:scale-[0.98]"
        >
          내 검사 기록
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          onClick={() => setShowPasswordChange(!showPasswordChange)}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-card border border-border/50 text-sm font-medium hover:bg-muted transition-colors active:scale-[0.98]"
        >
          비밀번호 변경
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {showPasswordChange && (
        <Card className="p-5 rounded-2xl border-border/50 shadow-sm space-y-3">
          <Label>새 비밀번호</Label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="최소 6자리"
            className="rounded-xl"
          />
          <Button onClick={handlePasswordChange} disabled={changingPassword} className="w-full">
            {changingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            비밀번호 변경
          </Button>
        </Card>
      )}

      <Button
        variant="ghost"
        className="w-full text-destructive hover:text-destructive rounded-xl"
        onClick={handleSignOut}
      >
        <LogOut className="w-4 h-4 mr-2" />
        로그아웃
      </Button>
    </div>
  );
}
