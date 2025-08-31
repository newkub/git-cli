import type { AIProviderConfig } from "./git";

// W-Git Configuration Types
export interface WGitConfig {
	/**
	 * Default AI provider configuration
	 */
	ai?: {
		provider: AIProviderConfig;
		enabled: boolean;
		commitPrompt?: string;
	};

	/**
	 * Commit configuration
	 */
	commit?: {
		useAI: boolean;
		conventionalCommits: boolean;
		template?: string;
		types?: string[];
		requireScope?: boolean;
		maxMessageLength?: number;
	};

	/**
	 * Branch configuration
	 */
	branch?: {
		defaultBranch: string;
		prefixes?: string[];
		namingConvention?: "kebab-case" | "camelCase" | "snake_case";
		autoDeleteMerged?: boolean;
	};

	/**
	 * Git hooks configuration
	 */
	hooks?: {
		preCommit?: string[];
		commitMsg?: string[];
		preRebase?: string[];
		prePush?: string[];
	};

	/**
	 * Display and UI preferences
	 */
	ui?: {
		theme?: "auto" | "light" | "dark";
		animations?: boolean;
		emojis?: boolean;
		colors?: {
			primary?: string;
			success?: string;
			warning?: string;
			error?: string;
		};
	};

	/**
	 * Git aliases and shortcuts
	 */
	aliases?: Record<string, string>;

	/**
	 * Project-specific settings
	 */
	project?: {
		name?: string;
		description?: string;
		maintainers?: string[];
		issueTemplate?: string;
		prTemplate?: string;
	};

	/**
	 * Remote repository settings
	 */
	remotes?: {
		origin?: {
			url: string;
			pushUrl?: string;
			protocol?: "https" | "ssh";
		};
		upstream?: {
			url: string;
			protocol?: "https" | "ssh";
		};
	};

	/**
	 * Workflow configurations
	 */
	workflow?: {
		gitflow?: boolean;
		autoSync?: boolean;
		syncBranches?: string[];
		releaseBranches?: string[];
	};

	/**
	 * Integration settings
	 */
	integrations?: {
		jira?: {
			url: string;
			project: string;
			autoLink?: boolean;
		};
		slack?: {
			webhook: string;
			channel: string;
			notifications?: string[];
		};
		github?: {
			token?: string;
			autoCreatePR?: boolean;
			prTemplate?: string;
		};
	};
}

/**
 * Configuration with defaults applied
 */
export interface ResolvedWGitConfig extends WGitConfig {
	ai: NonNullable<WGitConfig["ai"]>;
	commit: NonNullable<WGitConfig["commit"]>;
	branch: NonNullable<WGitConfig["branch"]>;
	ui: NonNullable<WGitConfig["ui"]>;
}

/**
 * Configuration file definition function
 */
export interface DefineConfigOptions extends WGitConfig {}

/**
 * Helper function to define configuration with TypeScript support
 */
export function defineConfig(config: DefineConfigOptions): WGitConfig {
	return config;
}

/**
 * Default configuration values
 */
export const defaultConfig: ResolvedWGitConfig = {
	ai: {
		provider: { provider: "openai" },
		enabled: true,
		commitPrompt: "Generate a conventional commit message for these changes:",
	},
	commit: {
		useAI: true,
		conventionalCommits: true,
		maxMessageLength: 72,
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
		requireScope: false,
	},
	branch: {
		defaultBranch: "main",
		prefixes: ["feature/", "bugfix/", "hotfix/", "release/"],
		namingConvention: "kebab-case",
		autoDeleteMerged: false,
	},
	ui: {
		theme: "auto",
		animations: true,
		emojis: true,
		colors: {
			primary: "#3b82f6",
			success: "#10b981",
			warning: "#f59e0b",
			error: "#ef4444",
		},
	},
	hooks: {},
	aliases: {},
	project: {},
	remotes: {},
	workflow: {
		gitflow: false,
		autoSync: false,
		syncBranches: ["main", "develop"],
		releaseBranches: ["main", "master"],
	},
	integrations: {},
};
