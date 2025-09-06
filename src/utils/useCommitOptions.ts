import { isCancel, cancel, select } from "@clack/prompts";
import type { KogitConfig } from "../types/config";

export type CommitMode =
	| "autocommit"
	| "prompt-enhance"
	| "ai-generate"
	| "interactive";

export interface CommitOptions {
	ai?: boolean;
	no_ai?: boolean;
	message?: string;
	type?: string;
	scope?: string;
	breaking?: boolean;
	help?: boolean;
	mode?: CommitMode;
}

/**
 * Parse command line arguments into CommitOptions
 */
export function parseCommitArgs(args: string[]): CommitOptions {
	const options: CommitOptions = { ai: true }; // AI enabled by default

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		switch (arg) {
			case "-a":
			case "--ai":
				options.ai = true;
				break;
			case "--no-ai":
				options.no_ai = true;
				options.ai = false;
				break;
			case "-m":
			case "--message":
				if (i + 1 < args.length) {
					options.message = args[++i];
				}
				break;
			case "-t":
			case "--type":
				if (i + 1 < args.length) {
					options.type = args[++i];
				}
				break;
			case "-s":
			case "--scope":
				if (i + 1 < args.length) {
					options.scope = args[++i];
				}
				break;
			case "-b":
			case "--breaking":
				options.breaking = true;
				break;
			case "--mode":
				if (i + 1 < args.length) {
					const mode = args[++i];
					if (
						mode === "autocommit" ||
						mode === "prompt-enhance" ||
						mode === "ai-generate" ||
						mode === "interactive"
					) {
						options.mode = mode;
					}
				}
				break;
			case "-h":
			case "--help":
				options.help = true;
				break;
		}
	}

	return options;
}

/**
 * Show interactive mode selection if not specified
 */
export async function selectCommitMode(): Promise<CommitMode | null> {
	const modeResult = await select({
		message: "Select commit mode",
		options: [
			{
				value: "autocommit",
				label: "Autocommit",
				hint: "Auto stage and commit all changes with AI",
			},
			{
				value: "prompt-enhance",
				label: "Prompt Enhance",
				hint: "Enhance your commit message with AI",
			},
			{
				value: "ai-generate",
				label: "AI Generate",
				hint: "Let AI generate commit message from staged changes",
			},
			{
				value: "interactive",
				label: "Interactive",
				hint: "Create commit message step by step",
			},
		],
	});

	if (isCancel(modeResult)) {
		cancel("Operation cancelled");
		return null;
	}

	return modeResult as CommitMode;
}

/**
 * Show help message for commit command
 */
export function showCommitHelp(): void {
	const pc = require("picocolors");

	console.log(pc.bold("git commit - Create commits with conventional format"));
	console.log("\nUsage:");
	console.log("  git commit [options]");
	console.log("\nOptions:");
	console.log(
		"  -a, --ai           Use AI to generate commit message (default)",
	);
	console.log("      --no-ai        Disable AI commit message generation");
	console.log(
		"      --mode         Commit mode: 'autocommit', 'prompt-enhance', 'ai-generate', or 'interactive'",
	);
	console.log("  -m, --message      Commit message");
	console.log("  -t, --type         Commit type (feat, fix, docs, etc.)");
	console.log("  -s, --scope        Commit scope");
	console.log("  -b, --breaking     Mark as breaking change");
	console.log("  -h, --help         Show this help message");
	console.log("\nExamples:");
	console.log("  git commit");
	console.log("  git commit --ai");
	console.log("  git commit --mode autocommit");
	console.log("  git commit --mode prompt-enhance");
	console.log("  git commit --message 'fix: resolve issue'");
	console.log("  git commit --type feat --scope api");
}
