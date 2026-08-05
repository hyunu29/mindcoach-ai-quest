import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/** 이용약관 — Google Play 심사 · 토스페이먼츠 가맹 심사 필수 페이지 */
export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-5 py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> 홈으로
        </Link>
        <h1 className="text-2xl font-bold mb-2">이용약관</h1>
        <p className="text-sm text-muted-foreground mb-8">시행일: 2026년 8월 5일</p>

        <div className="space-y-6 text-sm leading-relaxed [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          <h2>제1조 (목적)</h2>
          <p>
            본 약관은 마이치(이하 "서비스")가 제공하는 간이 심리검사, 감정 트래킹, AI 코칭 및 관련 제반
            서비스의 이용 조건과 절차, 이용자와 서비스의 권리·의무를 규정합니다.
          </p>

          <h2>제2조 (서비스의 성격 — 중요)</h2>
          <ul>
            <li>
              본 서비스가 제공하는 간이 심리검사와 AI 코칭은 <strong>자기 이해와 마음 관리를 돕는 참고
              도구</strong>이며, <strong>의료행위·심리치료·정신건강의학적 진단을 대체하지 않습니다.</strong>
            </li>
            <li>검사 결과와 AI의 답변은 전문가의 진단이 아니며, 지속적인 어려움이 있는 경우 전문기관 상담을 권장합니다.</li>
            <li>긴급한 위기 상황에서는 자살예방상담전화 <strong>1393</strong>(24시간) 또는 112·119에 연락해주세요.</li>
          </ul>

          <h2>제3조 (계정)</h2>
          <ul>
            <li>이용자는 카카오 로그인 또는 이메일로 가입할 수 있으며, 계정 정보를 정확하게 유지할 책임이 있습니다.</li>
            <li>계정의 부정 사용이 확인되면 서비스 이용이 제한될 수 있습니다.</li>
          </ul>

          <h2>제4조 (유료 서비스 및 환불)</h2>
          <ul>
            <li>서비스는 유료 간이 심리검사 이용권(30일), Pro 멤버십(30일), AI 크레딧 팩 등을 판매합니다.</li>
            <li>가격과 제공 내용은 결제 화면에 표시된 내용을 따릅니다.</li>
            <li>
              <strong>환불</strong>: 「전자상거래법」에 따라 결제일로부터 7일 이내, 해당 상품을 사용하지 않은
              경우(검사 미응시, 크레딧 미사용 등) 전액 환불을 요청할 수 있습니다. 이미 사용한 상품은 환불이
              제한될 수 있으며, 부분 사용 시 사용분을 제외한 금액의 환불 여부를 개별 협의합니다.
            </li>
            <li>이벤트·초대 보상으로 지급된 이용권과 크레딧은 환불 대상이 아닙니다.</li>
            <li>환불 문의: <a href="mailto:eduflo365@gmail.com" className="text-primary underline">eduflo365@gmail.com</a></li>
          </ul>

          <h2>제5조 (학원 연결)</h2>
          <ul>
            <li>이용자가 학원 코드를 직접 등록하면 해당 학원 관리자에게 심리 신호·검사 점수·감정 평균이 제공됩니다.</li>
            <li>감정 메모 원문과 AI 코칭 대화 내용은 학원에 제공되지 않습니다.</li>
            <li>이용자는 언제든 학원 연결을 해제할 수 있습니다.</li>
          </ul>

          <h2>제6조 (금지 행위)</h2>
          <ul>
            <li>타인의 계정 도용, 서비스의 부정 이용(이벤트·초대 보상 부정 수령 포함)</li>
            <li>서비스에 대한 무단 크롤링, 리버스 엔지니어링, 재판매</li>
            <li>AI 코칭에 대한 악의적 오남용</li>
          </ul>

          <h2>제7조 (책임의 제한)</h2>
          <ul>
            <li>서비스는 천재지변, 외부 인프라 장애 등 불가항력으로 인한 손해에 대해 책임지지 않습니다.</li>
            <li>검사 결과·AI 답변을 근거로 한 이용자의 판단과 행동에 대한 최종 책임은 이용자에게 있습니다.</li>
          </ul>

          <h2>제8조 (약관의 변경)</h2>
          <p>
            약관이 변경되는 경우 시행일 7일 전(이용자에게 불리한 변경은 30일 전) 서비스 내 공지합니다.
          </p>

          <h2>제9조 (문의)</h2>
          <p>
            이메일: <a href="mailto:eduflo365@gmail.com" className="text-primary underline">eduflo365@gmail.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
