/**
 * Agent Engine — decides which actions to execute based on conversation context
 */
import { detectEmotionForEmotions, generateMemo, isDirectRecordRequest, isDenyRequest } from "./emotionDetector";
import { saveEmotionRecord, recommendTest } from "./agentActions";
import type { ChatMessage } from "@/lib/coaching-types";

export interface AgentDecision {
  saveEmotion: boolean;
  recommendTests: boolean;
  emotionData?: { emoji: string; score: number; memo: string; category: string };
  recommendedTests?: { id: string; name: string; related_syndrome: string }[];
  savedEmotionId?: string;
}

/**
 * Decide and execute agent actions based on user message and history.
 * Returns decision results including saved record IDs.
 */
export async function runAgentActions(
  userMessage: string,
  allMessages: ChatMessage[],
  userId: string,
  emotionAlreadySaved: boolean,
): Promise<AgentDecision> {
  const decision: AgentDecision = {
    saveEmotion: false,
    recommendTests: false,
  };

  // Never record if user denies
  if (isDenyRequest(userMessage)) return decision;

  const detected = detectEmotionForEmotions(userMessage);
  const userMessages = allMessages.filter(m => m.role === "user").map(m => m.content);
  const turnCount = userMessages.length;
  const directRequest = isDirectRecordRequest(userMessage);

  // Condition for auto-save: (≥2 turns + emotion detected + not already saved) OR direct request
  const shouldSave = !emotionAlreadySaved && detected && (turnCount >= 2 || directRequest);

  if (shouldSave && detected) {
    const memo = generateMemo([...userMessages, userMessage]);
    decision.saveEmotion = true;
    decision.emotionData = {
      emoji: detected.emoji,
      score: detected.score,
      memo,
      category: detected.category,
    };

    try {
      const saved = await saveEmotionRecord({
        userId,
        category: detected.category,
        score: detected.score,
        memo,
      });
      decision.savedEmotionId = saved.id;
    } catch (err) {
      console.error("Failed to save emotion:", err);
      decision.saveEmotion = false;
    }
  }

  // Condition for test recommendation: negative emotion + ≥3 turns
  const isNegative = detected && ['anxious', 'sad', 'angry'].includes(detected.category);
  if (isNegative && turnCount >= 3) {
    try {
      const tests = await recommendTest(detected.category);
      if (tests && tests.length > 0) {
        decision.recommendTests = true;
        decision.recommendedTests = tests as any;
      }
    } catch (err) {
      console.error("Failed to recommend test:", err);
    }
  }

  return decision;
}
