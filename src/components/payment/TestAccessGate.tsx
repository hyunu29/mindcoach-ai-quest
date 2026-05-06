import { Loader2 } from 'lucide-react';
import { useTestAccessCheck } from '@/hooks/useTestAccessCheck';
import { TestPaywall } from './TestPaywall';

interface TestAccessGateProps {
  testSlug: string;
  testName: string;
  children: React.ReactNode;
}

export function TestAccessGate({ testSlug, testName, children }: TestAccessGateProps) {
  const access = useTestAccessCheck(testSlug);

  if (access.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!access.allowed) {
    return (
      <TestPaywall
        testSlug={testSlug}
        testName={testName}
        reason={access.reason}
        expiresAt={access.expiresAt}
      />
    );
  }

  return (
    <>
      {access.reason === 'has_paid_access' &&
        access.daysRemaining !== undefined &&
        access.daysRemaining <= 7 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 mb-4">
            이 검사 이용권이 {access.daysRemaining}일 후 만료돼요
          </div>
        )}
      {children}
    </>
  );
}