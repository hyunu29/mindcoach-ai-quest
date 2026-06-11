# Lovable 프롬프트 모음

Lovable workspace의 AI 에이전트에 던질 프롬프트 템플릿.

## 사용 원칙

- **GitHub push로 처리한 변경은 Lovable에서 코드 수정 금지.** Lovable이 자체적으로 코드를 고치면 GitHub와 충돌 + revert 사고 위험 (2026-05-06 사고 사례 참고).
- Lovable은 **QA + 자산 생성 + 시각 폴리시**에 한정해서 사용.
- 프롬프트 끝에 항상 ❌ 금지 사항 명시.

## 프롬프트 목록

| # | 파일 | 상태 | 용도 |
|---|---|---|---|
| 01 | [rebrand-qa-and-polish](./01-rebrand-qa-and-polish.md) | 🟢 실행 가능 | 마이치 리브랜드 QA + favicon/OG 생성 |
| 02 | [character-system-prep](./02-character-system-prep.md) | 🟡 보류 | 캐릭터 마스코트 통합 QA (자산 완성 후) |

## 실행 순서

1. **01-rebrand**: GitHub push (커밋 `e9c2f33`) 후 Lovable sync 완료되면 즉시 실행
2. **02-character**: 김민수 자산 + Storage 업로드 + 마이그레이션 push 완료 후
