/**
 * 공유 유틸 — 카카오톡(JS SDK) / Web Share API / 클립보드 3단 폴백.
 * 카카오 버튼은 VITE_KAKAO_JS_KEY가 설정된 경우에만 활성화됩니다.
 * (카카오 개발자 콘솔 앱의 "JavaScript 키" + 플랫폼 Web 도메인 등록 필요)
 */

const KAKAO_SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.5/kakao.min.js';

interface KakaoSdk {
  init: (key: string) => void;
  isInitialized: () => boolean;
  Share: {
    sendDefault: (settings: Record<string, unknown>) => void;
  };
}

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

export function isKakaoShareAvailable(): boolean {
  return Boolean(import.meta.env.VITE_KAKAO_JS_KEY);
}

export function isWebShareAvailable(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

let kakaoLoading: Promise<KakaoSdk | null> | null = null;

async function loadKakao(): Promise<KakaoSdk | null> {
  const key = import.meta.env.VITE_KAKAO_JS_KEY as string | undefined;
  if (!key) return null;
  if (window.Kakao?.isInitialized()) return window.Kakao;

  kakaoLoading ??= (async () => {
    if (!window.Kakao) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = KAKAO_SDK_URL;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('카카오 SDK 로드 실패'));
        document.head.appendChild(script);
      });
    }
    if (window.Kakao && !window.Kakao.isInitialized()) window.Kakao.init(key);
    return window.Kakao ?? null;
  })();

  try {
    return await kakaoLoading;
  } catch {
    kakaoLoading = null;
    return null;
  }
}

export interface SharePayload {
  title: string;
  description: string;
  /** 공유 링크 (기본: 현재 origin) */
  url?: string;
  buttonTitle?: string;
}

/** 카카오톡 피드 공유. 성공 여부 반환 (키 미설정/로드 실패 시 false). */
export async function shareToKakao(payload: SharePayload): Promise<boolean> {
  const kakao = await loadKakao();
  if (!kakao) return false;
  const url = payload.url ?? window.location.origin;
  kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: payload.title,
      description: payload.description,
      imageUrl: `${window.location.origin}/og-image.png`,
      link: { mobileWebUrl: url, webUrl: url },
    },
    buttons: [
      {
        title: payload.buttonTitle ?? '마이치 시작하기',
        link: { mobileWebUrl: url, webUrl: url },
      },
    ],
  });
  return true;
}

/** OS 공유 시트(모바일이면 카톡 포함) → 실패 시 클립보드 복사 폴백. */
export async function shareViaSystem(
  text: string,
  url: string,
): Promise<'shared' | 'copied' | 'failed'> {
  if (isWebShareAvailable()) {
    try {
      await navigator.share({ text, url });
      return 'shared';
    } catch (e) {
      // 사용자가 공유 시트를 닫은 경우 — 폴백하지 않음
      if (e instanceof DOMException && e.name === 'AbortError') return 'failed';
    }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
