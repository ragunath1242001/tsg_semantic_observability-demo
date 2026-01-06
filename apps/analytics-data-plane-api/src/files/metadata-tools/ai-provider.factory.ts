import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
// import LanguageModelV3 from "ai" does not work, needs to use the provider package
import { LanguageModelV3 } from "@ai-sdk/provider";
import { Logger } from "@nestjs/common";

import { LLMConfig } from "../../config";

export function createModelFromConfig(config: LLMConfig): LanguageModelV3 {
  const baseURL = config.baseUrl;
  const model = config.model ?? "gpt-5-mini";

  if (!baseURL) {
    throw new Error("(Open)AI baseUrl is required");
  }

  if (!config.apiKey) {
    throw new Error("(Open)AI apiKey is required");
  }

  // Log configuration for debugging (without sensitive data)
  Logger.log(`[AI Provider] Creating (Open)AI model`);
  Logger.log(`[AI Provider] Endpoint: ${baseURL}`);
  Logger.log(`[AI Provider] Model: ${model}`);

  const provider = createOpenAICompatible({
    name: "openai-compatible",
    baseURL,
    apiKey: config.apiKey,
    supportsStructuredOutputs: true
  });

  return provider(model);
}
