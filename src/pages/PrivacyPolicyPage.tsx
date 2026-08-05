import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/** 개인정보처리방침 — Google Play 심사 · 토스페이먼츠 가맹 심사 필수 페이지 */
export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-5 py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> 홈으로
        </Link>
        <h1 className="text-2xl font-bold mb-2">개인정보처리방침</h1>
        <p className="text-sm text-muted-foreground mb-8">시행일: 2026년 8월 5일</p>

        <div className="prose prose-sm max-w-none space-y-6 text-sm leading-relaxed [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          <p>
            마이치(이하 "서비스")는 이용자의 개인정보를 소중히 여기며, 「개인정보 보호법」 등 관련 법령을
            준수합니다. 본 방침은 서비스가 어떤 정보를 수집하고, 어떻게 이용·보관·파기하는지 알려드립니다.
          </p>

          <h2>1. 수집하는 개인정보</h2>
          <ul>
            <li><strong>계정 정보</strong>: 이메일 주소, 카카오 계정 식별자(카카오 로그인 시), 닉네임</li>
            <li><strong>프로필 정보</strong>: 학교 유형, 학년, 학교명(선택)</li>
            <li>
              <strong>민감정보(심리 관련 정보)</strong>: 간이 심리검사 응답·결과, 감정 기록(감정 상태·상황
              메모·신체 반응), AI 코칭 대화 내용 — <strong>서비스 제공 목적에 한해 별도 동의를 받아 처리</strong>합니다.
            </li>
            <li><strong>결제 정보</strong>: 주문 내역, 결제 승인 정보(카드번호 등 민감 결제정보는 결제대행사(토스페이먼츠)가 처리하며 서비스는 저장하지 않습니다)</li>
            <li><strong>자동 수집</strong>: 서비스 이용 기록, 접속 로그, 기기 정보</li>
          </ul>

          <h2>2. 이용 목적</h2>
          <ul>
            <li>간이 심리검사 결과 제공 및 AI 코칭 등 핵심 기능 제공</li>
            <li>감정 트래킹, 주간 리포트 등 개인 맞춤 기능 제공</li>
            <li>학원 연결 서비스: 이용자가 학원 코드를 직접 등록한 경우, 해당 학원 관리자에게
              심리 신호(그린/옐로/레드)·검사 점수·감정 평균을 제공 (감정 메모 원문과 AI 대화 내용은 제공하지 않음)</li>
            <li>유료 서비스 결제 및 환불 처리</li>
            <li>서비스 개선 및 문의 대응</li>
          </ul>

          <h2>3. 보유 및 이용 기간</h2>
          <ul>
            <li>회원 탈퇴 시 지체 없이 파기합니다. 단, 관련 법령에 따라 보존이 필요한 정보는 해당 기간 동안 보관합니다.</li>
            <li>전자상거래법에 따른 계약·결제 기록: 5년 / 소비자 불만·분쟁 처리 기록: 3년</li>
          </ul>

          <h2>4. 제3자 제공</h2>
          <p>
            이용자의 별도 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 학원 관리자에 대한 심리 신호
            제공은 이용자가 학원 코드를 등록하며 동의한 경우에만 이루어지며, 마이페이지에서 학원 연결을
            해제하여 언제든 중단할 수 있습니다.
          </p>

          <h2>5. 처리 위탁</h2>
          <ul>
            <li>Supabase Inc. — 데이터 보관 및 인증 처리</li>
            <li>Vercel Inc. — 서비스 호스팅</li>
            <li>Google LLC — AI 코칭 응답 생성 (대화 내용이 AI 모델 학습에 사용되지 않는 API를 사용)</li>
            <li>토스페이먼츠(주) — 결제 처리</li>
            <li>카카오(주) — 소셜 로그인</li>
          </ul>

          <h2>6. 이용자의 권리</h2>
          <p>
            이용자는 언제든지 자신의 개인정보에 대한 열람·정정·삭제·처리정지를 요청할 수 있습니다.
            회원 탈퇴 및 개인정보 관련 요청은 아래 문의처로 연락해주세요.
          </p>

          <h2>7. 안전성 확보 조치</h2>
          <ul>
            <li>전송 구간 암호화(HTTPS) 및 데이터베이스 접근 제어(행 수준 보안)</li>
            <li>심리 관련 민감정보에 대한 접근 최소화 원칙 적용</li>
          </ul>

          <h2>8. 만 14세 미만 아동</h2>
          <p>
            만 14세 미만 아동의 경우 법정대리인의 동의가 필요합니다. 법정대리인 동의 없이 가입된 사실이
            확인되면 해당 계정과 정보를 삭제합니다.
          </p>

          <h2>9. 문의처</h2>
          <p>
            개인정보 보호책임자: 마이치 팀<br />
            이메일: <a href="mailto:eduflo365@gmail.com" className="text-primary underline">eduflo365@gmail.com</a>
          </p>

          <p className="text-muted-foreground">
            본 방침은 법령이나 서비스 변경에 따라 개정될 수 있으며, 개정 시 서비스 내 공지합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
