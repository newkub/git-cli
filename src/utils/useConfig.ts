import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import {
	type WGitConfig,
	type ResolvedWGitConfig,
	defaultConfig,
} from "../types/config";

/**
 * Configuration file locations to search (in order of priority)
 */
const CONFIG_FILENAMES = [
	"w-git.config.ts",
	"w-git.config.js",
	"w-git.config.json",
	".w-git.config.ts",
	".w-git.config.js",
	".w-git.config.json",
];

/**
 * Get possible config file paths
 */
function getConfigPaths(): string[] {
	const cwd = process.cwd();
	const home = homedir();

	const paths: string[] = [];

	// Project-level configs (current directory)
	CONFIG_FILENAMES.forEach((filename) => {
		paths.push(join(cwd, filename));
	});

	// Global configs (home directory)
	CONFIG_FILENAMES.forEach((filename) => {
		paths.push(join(home, filename));
	});

	return paths;
}

/**
 * Find the first existing config file
 */
function findConfigFile(): string | null {
	const paths = getConfigPaths();

	for (const path of paths) {
		if (existsSync(path)) {
			return path;
		}
	}

	return null;
}

/**
 * Load configuration from file
 */
async function loadConfigFromFile(configPath: string): Promise<WGitConfig> {
	try {
		if (configPath.endsWith(".json")) {
			// JSON config
			const content = readFileSync(configPath, "utf-8");
			return JSON.parse(content);
		} else if (configPath.endsWith(".js") || configPath.endsWith(".ts")) {
			// JavaScript/TypeScript config
			// For now, we'll handle this as a dynamic import in the future
			// For development, we can read it as text and parse it
			const content = readFileSync(configPath, "utf-8");

			// Simple way to extract config from module.exports or export default
			if (
				content.includes("module.exports") ||
				content.includes("export default")
			) {
				// This is a simplified approach - in production, we'd use dynamic imports
				console.warn(
					"JavaScript/TypeScript config files are not fully supported yet. Please use JSON format.",
				);
				return {};
			}
		}
	} catch (error) {
		console.error(`Error loading config from ${configPath}:`, error);
	}

	return {};
}

/**
 * Deep merge two objects
 */
function deepMerge<T>(target: T, source: Partial<T>): T {
	const result = { ...target } as T;

	for (const key in source) {
		const sourceValue = source[key];
		if (sourceValue !== undefined) {
			if (
				sourceValue &&
				typeof sourceValue === "object" &&
				!Array.isArray(sourceValue) &&
				target[key] &&
				typeof target[key] === "object" &&
				!Array.isArray(target[key])
			) {
				// Both are objects, merge recursively
				(result as Record<string, unknown>)[key as string] = deepMerge(
					target[key] as Record<string, unknown>,
					sourceValue as Record<string, unknown>,
				);
			} else {
				// Direct assignment
				(result as Record<string, unknown>)[key as string] = sourceValue;
			}
		}
	}

	return result;
}

/**
 * Load and resolve configuration
 */
export async function loadConfig(): Promise<ResolvedWGitConfig> {
	const configPath = findConfigFile();
	let userConfig: WGitConfig = {};

	if (configPath) {
		userConfig = await loadConfigFromFile(configPath);
		console.log(`✅ Loaded config from: ${configPath}`);
	}

	// Merge with defaults
	return deepMerge(defaultConfig, userConfig);
}

/**
 * Get configuration file installation type and path
 */
export function getConfigInfo(): {
	type: "project" | "global" | "none";
	path?: string;
} {
	const configPath = findConfigFile();

	if (!configPath) {
		return { type: "none" };
	}

	const cwd = process.cwd();
	const isProject = configPath.startsWith(cwd);

	return {
		type: isProject ? "project" : "global",
		path: configPath,
	};
}

/**
 * Create a new config file
 */
export function createConfigFile(
	type: "project" | "global" = "project",
): string {
	const configTemplate = `import { defineConfig } from 'w-git-cli/config';

export default defineConfig({
	// AI Configuration
	ai: {
		provider: { provider: "openai" }, // "openai" | "anthropic" | "xai"
		enabled: true,
		commitPrompt: "Generate a conventional commit message for these changes:",
	},

	// Commit Configuration
	commit: {
		useAI: true,
		conventionalCommits: true,
		maxMessageLength: 72,
		requireScope: false,
		types: ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore", "revert"],
	},

	// Branch Configuration
	branch: {
		defaultBranch: "main",
		prefixes: ["feature/", "bugfix/", "hotfix/", "release/"],
		namingConvention: "kebab-case",
		autoDeleteMerged: false,
	},

	// UI Configuration
	ui: {
		theme: "auto", // "auto" | "light" | "dark"
		animations: true,
		emojis: true,
		colors: {
			primary: "#3b82f6",
			success: "#10b981",
			warning: "#f59e0b",
			error: "#ef4444",
		},
	},

	// Git Aliases
	aliases: {
		// "co": "checkout",
		// "br": "branch",
		// "st": "status",
	},

	// Project Information
	project: {
		name: "My Project",
		description: "Project description",
		maintainers: ["maintainer@example.com"],
	},

	// Workflow Configuration
	workflow: {
		gitflow: false,
		autoSync: false,
		syncBranches: ["main", "develop"],
	},

	// Integrations (optional)
	integrations: {
		// jira: {
		//   url: "https://company.atlassian.net",
		//   project: "PROJ",
		//   autoLink: true,
		// },
		// github: {
		//   autoCreatePR: false,
		// },
	},
});`;

	const baseDir = type === "project" ? process.cwd() : homedir();
	const configPath = join(baseDir, "w-git.config.ts");

	writeFileSync(configPath, configTemplate, "utf-8");

	return configPath;
}

/**
 * Validate configuration
 */
export function validateConfig(config: WGitConfig): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	// Validate AI provider
	if (
		config.ai?.provider?.provider &&
		!["openai", "anthropic", "xai"].includes(config.ai.provider.provider)
	) {
		errors.push(`Invalid AI provider: ${config.ai.provider.provider}`);
	}

	// Validate commit types
	if (config.commit?.types && !Array.isArray(config.commit.types)) {
		errors.push("commit.types must be an array");
	}

	// Validate branch naming convention
	if (
		config.branch?.namingConvention &&
		!["kebab-case", "camelCase", "snake_case"].includes(
			config.branch.namingConvention,
		)
	) {
		errors.push(
			`Invalid branch naming convention: ${config.branch.namingConvention}`,
		);
	}

	// Validate UI theme
	if (
		config.ui?.theme &&
		!["auto", "light", "dark"].includes(config.ui.theme)
	) {
		errors.push(`Invalid UI theme: ${config.ui.theme}`);
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}
