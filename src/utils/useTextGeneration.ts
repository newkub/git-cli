import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { xai } from "@ai-sdk/xai";

// Types
export type AIProvider = "openai" | "anthropic" | "xai";

export interface AIProviderConfig {
	provider: AIProvider;
	model?: string;
}

// Constants
const COMMIT_PROMPT = (diff: string) =>
	`Generate a commit message for these changes:\n\n${diff}\n\nThe message should follow conventional commits format and be under 72 characters.`;

// OpenAI Provider
async function generateWithOpenAI(
	diff: string,
	model = "gpt-4",
): Promise<string> {
	const { text } = await generateText({
		model: openai(model),
		prompt: COMMIT_PROMPT(diff),
	});
	return text;
}

// Anthropic Provider
async function generateWithAnthropic(
	diff: string,
	model = "claude-3-haiku-20240307",
): Promise<string> {
	const { text } = await generateText({
		model: anthropic(model),
		prompt: COMMIT_PROMPT(diff),
	});
	return text;
}

// XAI Provider
async function generateWithXAI(
	diff: string,
	model = "grok-3-beta",
): Promise<string> {
	const { text } = await generateText({
		model: xai(model),
		prompt: COMMIT_PROMPT(diff),
	});
	return text;
}

// Helper functions (exported for backward compatibility)
export { generateWithOpenAI, generateWithAnthropic, generateWithXAI };

// Main function
export async function generateCommitMessage(
	diff: string,
	config: AIProviderConfig = { provider: "openai" },
): Promise<string> {
	switch (config.provider) {
		case "openai":
			return generateWithOpenAI(diff, config.model);
		case "anthropic":
			return generateWithAnthropic(diff, config.model);
		case "xai":
			return generateWithXAI(diff, config.model);
		default:
			throw new Error(`Unsupported AI provider: ${config.provider}`);
	}
}
