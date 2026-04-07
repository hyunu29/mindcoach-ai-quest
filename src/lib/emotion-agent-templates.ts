/* ─── Emotion Agent Conversation Templates ─────────── */
import type { PrimaryEmotion } from './emotion-agent-types';

type TemplateMap = Record<PrimaryEmotion, string[]>;

/** Turn 1 responses – after emotion chip selection */
export const turn1Responses: TemplateMap = {
  happy: [
    "좋은 하루를 보냈구나! 😊 어떤 일이 기분 좋게 만들었어?",
  ],
  calm: [
    "편안한 하루였구나. 😌 오늘 마음이 평화로웠던 이유가 있어?",
  ],
  neutral: [
    "그렇구나, 특별할 것 없는 평범한 하루였어? 오늘 하루 어떻게 보냈는지 얘기해줄래?",
  ],
  sad: [
    "우울한 하루였구나. 오늘 특별히 그런 마음이 들게 한 일이 있었어?",
  ],
  angry: [
    "짜증나는 일이 있었구나. 😤 무슨 일이 있었는지 얘기해줄래?",
  ],
  anxious: [
    "불안한 하루였구나. 오늘 어떤 일이 마음을 불안하게 했어?",
  ],
};

/** Turn 2 responses – after situation input, asking for depth */
export const turn2Responses: TemplateMap = {
  happy: [
    "와, 정말 좋은 일이 있었구나! 그때 기쁨 말고 다른 감정도 있었어? 예를 들면 뿌듯하거나, 설레거나?",
  ],
  calm: [
    "그런 시간이 있었구나. 편안함 외에 다른 감정도 느꼈어? 만족감이나 안정감 같은?",
  ],
  neutral: [
    "그렇구나, 알려줘서 고마워. 그때 다른 감정도 살짝 느낀 건 없었어? 지루함이나 멍한 느낌 같은?",
  ],
  sad: [
    "그런 일이 있었구나, 힘들었겠다. 우울함 말고 다른 감정도 있었어? 예를 들면 무력감이나, 외로움 같은?",
  ],
  angry: [
    "그건 정말 짜증날 만하다. 화나는 마음 말고 다른 감정도 있었어? 답답하거나, 억울하거나?",
  ],
  anxious: [
    "그런 상황이면 불안할 수밖에 없어. 불안 외에 다른 감정도 있었어? 초조함이나, 압박감 같은?",
  ],
};

/** Turn 3 responses – after depth, asking body reaction */
export const turn3Responses: TemplateMap = {
  happy: [
    "감정을 잘 살펴봤어! 그때 몸에서도 뭔가 느껴졌어? 예를 들면 기분 좋게 가슴이 따뜻하거나?",
  ],
  calm: [
    "좋은 감정들이네. 😌 그때 몸에서도 뭔가 느껴졌어? 몸이 가볍거나 편안했어?",
  ],
  neutral: [
    "알겠어. 그때 몸에서도 뭔가 느껴진 게 있었어? 예를 들면 나른하거나, 특별한 건 없었거나?",
  ],
  sad: [
    "네 마음을 잘 들여다봤어. 그때 몸에서도 뭔가 느껴졌어? 가슴이 답답하거나, 몸이 무겁거나?",
  ],
  angry: [
    "그런 감정들이 있었구나. 그때 몸에서도 반응이 있었어? 어깨가 뻣뻣하거나, 가슴이 답답하거나?",
  ],
  anxious: [
    "잘 살펴봤어. 그때 몸에서도 뭔가 느껴졌어? 손이 떨리거나, 가슴이 두근거리거나?",
  ],
};

/** AI comments for journal card */
export const aiComments: TemplateMap = {
  happy: [
    "좋은 감정을 느낀 순간을 기억해두면, 힘든 날에 큰 힘이 돼. 오늘의 기쁨을 소중히 간직해!",
    "기쁜 순간을 알아차리는 것도 능력이야. 오늘 하루 잘했어! 😊",
  ],
  calm: [
    "마음이 편안한 날을 만들어낸 것도 너의 힘이야. 이 평온함을 잘 기억해둬!",
    "평온한 마음은 가장 좋은 컨디션이야. 이 느낌을 자주 찾아가 보자!",
  ],
  neutral: [
    "특별하지 않은 하루도 소중해. 이렇게 자신을 돌아보는 시간 자체가 의미 있어.",
    "평범한 하루도 감정을 기록하는 건 좋은 습관이야. 잘하고 있어!",
  ],
  sad: [
    "힘든 감정도 자연스러운 거야. 이렇게 마음을 들여다본 것만으로도 대단한 거야.",
    "우울한 날이 있어도 괜찮아. 이 감정은 지나갈 거고, 넌 충분히 잘하고 있어.",
  ],
  angry: [
    "화가 나는 건 자연스러운 감정이야. 이렇게 표현하고 정리하는 게 가장 건강한 방법이야.",
    "짜증나는 일이 있었지만, 감정을 알아차리고 기록한 네가 멋져!",
  ],
  anxious: [
    "불안은 네가 더 잘하고 싶다는 마음의 표현이야. 지금 이 순간 숨 한번 크게 쉬어봐.",
    "불안한 마음을 솔직히 꺼낸 것만으로도 절반은 해결한 거야. 잘하고 있어!",
  ],
};

/** Pick random from array */
export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
