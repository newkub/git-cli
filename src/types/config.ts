import type { AIProviderConfig } from "./git";

/**
 * AI Provider types
 */
export type AIProvider = "openai" | "anthropic" | "xai";

/**
 * Commit types for conventional commits
 */
export type CommitType =
	| "feat"
	| "fix"
	| "docs"
	| "style"
	| "refactor"
	| "perf"
	| "test"
	| "build"
	| "ci"
	| "chore"
	| "revert";

/**
 * Simplified configuration for git CLI
 */
export interface KogitConfig {
	/**
	 * AI configuration
	 */
	ai: {
		provider: {
			provider: AIProvider;
			model?: string;
		};
		enabled: boolean;
	};

	/**
	 * Commit configuration
	 */
	commit: {
		useAI: boolean;
		conventionalCommits: boolean;
		types: CommitType[];
		maxMessageLength?: number;
		requireScope?: boolean;
	};

	/**
	 * Branch configuration
	 */
	branch?: {
		defaultBranch?: string;
		namingConvention?: string;
		autoDeleteMerged?: boolean;
	};

	/**
	 * UI configuration
	 */
	ui?: {
		theme?: string;
		animations?: boolean;
		emojis?: boolean;
	};

	/**
	 * Command aliases
	 */
	aliases?: Record<string, string>;
}

/**
 * Configuration file definition function
 */
export function defineConfig(config: KogitConfig): KogitConfig {
	return config;
}

/**
 * Default configuration values
 */
export const defaultConfig: KogitConfig = {
	ai: {
		provider: { provider: "openai" },
		enabled: true,
	},
	commit: {
		useAI: true,
		conventionalCommits: true,
		types: [
			"feat",
			"fix",
			"docs",
			"style",
			"refactor",
			"perf",
			"test",
			"build",
			"ci",
			"chore",
			"revert",
		],
	},
};
