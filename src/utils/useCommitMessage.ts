import { execa } from "execa";
import { text, confirm, isCancel, cancel, spinner } from "@clack/prompts";
import {
	generateCommitMessage,
	enhanceCommitMessage as enhanceWithAI,
	type AIProviderConfig,
} from "./useTextGeneration";
import type { KogitConfig } from "../types/config";
import type { CommitOptions } from "./useCommitOptions";

/**
 * Build conventional commit message format
 */
export function buildCommitMessage(
	type: string,
	scope: string | undefined,
	message: string,
	breaking: boolean,
	breakingDesc?: string,
): string {
	let commitMsg = `${type}`;
	if (scope?.trim()) commitMsg += `(${scope.trim()})`;
	commitMsg += `: ${message}`;

	if (breaking && breakingDesc?.trim()) {
		commitMsg += `\n\nBREAKING CHANGE: ${breakingDesc.trim()}`;
	}

	return commitMsg;
}

/**
 * Generate AI commit message from git diff
 */
export async function generateAICommitMessage(
	config: KogitConfig,
): Promise<string> {
	const { stdout: diff } = await execa("git", ["diff", "--cached"]);
	const aiConfig: AIProviderConfig = { provider: config.ai.provider.provider };
	return await generateCommitMessage(diff, aiConfig);
}

/**
 * Enhance user's commit message with AI
 */
export async function enhanceCommitMessage(
	userMessage: string,
	config: KogitConfig,
): Promise<string> {
	const aiConfig: AIProviderConfig = { provider: config.ai.provider.provider };
	return await enhanceWithAI(userMessage, aiConfig);
}

/**
 * Get user input for commit message
 */
export async function getUserCommitMessage(): Promise<string | null> {
	const userMessage = await text({
		message: "Enter your commit message (any language)",
		placeholder: "เพิ่ม feature ใหม่, fix bug, etc.",
		validate(value) {
			if (!value) return "Message is required";
		},
	});

	if (isCancel(userMessage)) {
		return null;
	}

	return userMessage as string;
}

/**
 * Get breaking change description from user
 */
export async function getBreakingChangeDescription(): Promise<string | null> {
	const breakingDescResult = await text({
		message: "Breaking change description",
		placeholder: "Describe the breaking change",
	});

	if (isCancel(breakingDescResult)) {
		return null;
	}

	return breakingDescResult as string;
}

/**
 * Confirm commit message with user
 */
export async function confirmCommitMessage(message: string): Promise<boolean> {
	const confirmResult = await confirm({
		message: `Enhanced message: "${message}"\n\nProceed with this commit?`,
		initialValue: true,
	});

	if (isCancel(confirmResult)) {
		return false;
	}

	return confirmResult as boolean;
}

/**
 * Create commit with message
 */
export async function executeCommit(message: string): Promise<void> {
	await execa("git", ["commit", "-m", message]);
}
