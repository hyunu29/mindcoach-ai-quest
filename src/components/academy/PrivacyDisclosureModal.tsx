import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Lock } from 'lucide-react';

interface Props {
  open: boolean;
  academyName: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PrivacyDisclosureModal({
  open,
  academyName,
  loading,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{academyName}과 공유되는 정보</DialogTitle>
          <DialogDescription>
            학원 관리자가 이 내용을 볼 수 있어요. 동의하면 학원에 연결돼요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm py-2">
          <div>
            <h3 className="flex items-center gap-1.5 font-semibold mb-2 text-primary">
              <Check className="w-4 h-4" /> 학원이 볼 수 있어요
            </h3>
            <ul className="space-y-1 text-muted-foreground ml-6 list-disc">
              <li>3색 심리 신호 (그린 / 옐로 / 레드)</li>
              <li>검사 위험 영역 개수</li>
              <li>감정 점수 평균</li>
              <li>검사 응시 이력</li>
            </ul>
          </div>
          <div>
            <h3 className="flex items-center gap-1.5 font-semibold mb-2">
              <Lock className="w-4 h-4" /> 학원이 볼 수 없어요
            </h3>
            <ul className="space-y-1 text-muted-foreground ml-6 list-disc">
              <li>감정 메모 원문</li>
              <li>AI 코칭 대화 내용</li>
              <li>개별 문항 응답 답변</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="flex-1"
          >
            취소
          </Button>
          <Button onClick={onConfirm} disabled={loading} className="flex-1">
            {loading ? '연결 중...' : '동의하고 연결'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
