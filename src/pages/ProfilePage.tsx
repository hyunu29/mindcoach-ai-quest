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
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

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
