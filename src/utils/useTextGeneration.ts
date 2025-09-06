import { generateText as aiGenerateText } from "ai";
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

const ENHANCE_PROMPT = (userMessage: string) =>
	`Please enhance this commit message to follow conventional commit format and improve the English:
	
	Original message: "${userMessage}"
	
	Requirements:
	1. Use conventional commit format (type: description)
	2. Make it clear and professional English
	3. Keep the original meaning
	4. Use appropriate commit type (feat, fix, docs, style, refactor, test, chore, etc.)
	
	Return only the enhanced commit message, nothing else.`;

// OpenAI Provider
async function generateWithOpenAI(
	prompt: string,
	model = "gpt-4",
): Promise<string> {
	const { text } = await aiGenerateText({
		model: openai(model),
		prompt: prompt,
	});
	return text;
}

// Anthropic Provider
async function generateWithAnthropic(
	prompt: string,
	model = "claude-3-haiku-20240307",
): Promise<string> {
	const { text } = await aiGenerateText({
		model: anthropic(model),
		prompt: prompt,
	});
	return text;
}

// XAI Provider
async function generateWithXAI(
	prompt: string,
	model = "grok-3-beta",
): Promise<string> {
	const { text } = await aiGenerateText({
		model: xai(model),
		prompt: prompt,
	});
	return text;
}

// Helper functions (exported for backward compatibility)
export { generateWithOpenAI, generateWithAnthropic, generateWithXAI };

// Generic text generation function
export async function generateText(
	prompt: string,
	config: AIProviderConfig = { provider: "openai" },
): Promise<string> {
	switch (config.provider) {
		case "openai":
			return generateWithOpenAI(prompt, config.model);
		case "anthropic":
			return generateWithAnthropic(prompt, config.model);
		case "xai":
			return generateWithXAI(prompt, config.model);
		default:
			throw new Error(`Unsupported AI provider: ${config.provider}`);
	}
}

// Main function for commit messages
export async function generateCommitMessage(
	diff: string,
	config: AIProviderConfig = { provider: "openai" },
): Promise<string> {
	return generateText(COMMIT_PROMPT(diff), config);
}

// Function to enhance user commit message
export async function enhanceCommitMessage(
	userMessage: string,
	config: AIProviderConfig = { provider: "openai" },
): Promise<string> {
	return generateText(ENHANCE_PROMPT(userMessage), config);
}
