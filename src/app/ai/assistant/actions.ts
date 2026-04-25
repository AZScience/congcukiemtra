"use server";

import { askAiAssistant } from "@/ai/flows/ai-assistant-flow";
import type { AiAssistantInput, AiAssistantOutput } from "@/ai/flows/ai-assistant-flow";

export async function callAiAssistant(input: AiAssistantInput): Promise<AiAssistantOutput> {
  return askAiAssistant(input);
}
