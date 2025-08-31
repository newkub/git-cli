import { execa } from "execa";
import {
	cancel,
	confirm,
	intro,
	isCancel,
	outro,
	select,
	spinner,
	text,
} from "@clack/prompts";
import * as pc from "picocolors";
import type { CommitType } from "../types/git";
import {
	generateCommitMessage,
	type AIProviderConfig,
} from "../utils/useTextGeneration";

const COMMIT_TYPES: CommitType[] = [
	{ value: "feat", label: "feat", hint: "A new feature" },
	{ value: "fix", label: "fix", hint: "A bug fix" },
	{ value: "docs", label: "docs", hint: "Documentation only changes" },
	{
		value: "style",
		label: "style",
		hint: "Changes that do not affect the meaning of the code",
	},
	{
		value: "refactor",
		label: "refactor",
		hint: "A code change that neither fixes a bug nor adds a feature",
	},
	{
		value: "perf",
		label: "perf",
		hint: "A code change that improves performance",
	},
	{
		value: "test",
		label: "test",
		hint: "Adding missing tests or correcting existing tests",
	},
	{
		value: "build",
		label: "build",
		hint: "Changes that affect the build system or external dependencies",
	},
	{
		value: "ci",
		label: "ci",
		hint: "Changes to CI configuration files and scripts",
	},
	{
		value: "chore",
		label: "chore",
		hint: "Other changes that don't modify src or test files",
	},
	{ value: "revert", label: "revert", hint: "Reverts a previous commit" },
];

interface CommitOptions {
	ai?: boolean;
	no_ai?: boolean;
	message?: string;
	type?: string;
	scope?: string;
	breaking?: boolean;
	help?: boolean;
}

function logSuccess(message: string): void {
	console.log(pc.green(`✅ ${message}`));
}

function logError(message: string): void {
	console.log(pc.red(`❌ ${message}`));
}

function logWarning(message: string): void {
	console.log(pc.yellow(`⚠️  ${message}`));
}

function logInfo(message: string): void {
	console.log(pc.cyan(`ℹ️  ${message}`));
}

function showHelp(): void {
	console.log(
		pc.bold("w-git commit - Create commits with conventional format"),
	);
	console.log("\nUsage:");
	console.log("  w-git commit [options]");
	console.log("\nOptions:");
	console.log(
		"  -a, --ai           Use AI to generate commit message (default)",
	);
	console.log("      --no-ai        Disable AI commit message generation");
	console.log("  -m, --message      Commit message");
	console.log("  -t, --type         Commit type (feat, fix, docs, etc.)");
	console.log("  -s, --scope        Commit scope");
	console.log("  -b, --breaking     Mark as breaking change");
	console.log("  -h, --help         Show this help message");
	console.log("\nExamples:");
	console.log("  w-git commit");
	console.log("  w-git commit --ai");
	console.log("  w-git commit --message 'fix: resolve issue'");
	console.log("  w-git commit --type feat --scope api");
}

function parseArgs(args: string[]): CommitOptions {
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
			case "-h":
			case "--help":
				options.help = true;
				break;
		}
	}

	return options;
}

export async function commitCommand(args: string[]): Promise<void> {
	const options = parseArgs(args);
	const s = spinner();

	try {
		if (options.help) {
			showHelp();
			return;
		}

		intro(pc.blue("📝 Git Commit Tool"));

		// Check if there are changes to commit
		s.start("Checking for changes");
		const { stdout: status } = await execa("git", ["status", "--porcelain"]);
		s.stop("✅ Changes checked");

		if (!status.trim()) {
			outro(pc.yellow("⚠️  No changes to commit"));
			return;
		}

		if (options.message) {
			await createDirectCommit(options.message);
			return;
		}

		// Use AI by default unless explicitly disabled
		if (!options.no_ai && options.ai) {
			await createAICommit();
			return;
		}

		await createInteractiveCommit(options);
		outro(pc.green("✅ Commit completed successfully"));
	} catch (error) {
		s.stop("❌ Operation failed");
		outro(pc.red("Commit failed"));
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
		process.exit(1);
	}
}

async function createAICommit(): Promise<void> {
	const s = spinner();
	try {
		s.start("Generating AI commit message");
		const { stdout: diff } = await execa("git", ["diff", "--cached"]);

		if (!diff.trim()) {
			const { stdout: allDiff } = await execa("git", ["diff"]);
			if (!allDiff.trim()) {
				s.stop("❌ No changes to commit");
				outro(pc.yellow("⚠️  No changes found"));
				return;
			}
		}

		const aiConfig: AIProviderConfig = { provider: "openai" }; // Default to OpenAI
		const message = await generateCommitMessage(diff, aiConfig);
		await execa("git", ["commit", "-m", message]);
		s.stop(pc.green("✅ AI commit message generated and committed"));
		outro(pc.green(`🤖 Committed: ${message}`));
	} catch (error) {
		s.stop("❌ AI commit failed");
		throw error;
	}
}

async function createDirectCommit(message: string): Promise<void> {
	const s = spinner();
	s.start("Creating commit");
	await execa("git", ["commit", "-m", message]);
	s.stop(pc.green("✅ Commit created successfully"));
}

async function createInteractiveCommit(options: CommitOptions): Promise<void> {
	const s = spinner();

	// Select commit type
	let type = options.type;
	if (!type) {
		const typeResult = await select({
			message: "Select commit type",
			options: COMMIT_TYPES.map((t) => ({
				value: t.value,
				label: `${t.label} - ${t.hint}`,
			})),
		});

		if (isCancel(typeResult)) {
			cancel("Operation cancelled");
			return;
		}
		type = typeResult as string;
	}

	// Get scope (optional)
	let scope = options.scope;
	if (!scope) {
		const scopeResult = await text({
			message: "Scope (optional)",
			placeholder: "e.g., api, ui, auth",
		});

		if (isCancel(scopeResult)) {
			cancel("Operation cancelled");
			return;
		}
		scope = scopeResult as string;
	}

	// Get commit message
	const message = await text({
		message: "Commit message",
		placeholder: "Brief description of changes",
		validate(value) {
			if (!value) return "Message is required";
			if (value.length > 72) return "Message should be 72 characters or less";
		},
	});

	if (isCancel(message)) {
		cancel("Operation cancelled");
		return;
	}

	// Check for breaking change
	let breaking = options.breaking;
	if (breaking === undefined) {
		const breakingResult = await confirm({
			message: "Is this a breaking change?",
			initialValue: false,
		});

		if (isCancel(breakingResult)) {
			cancel("Operation cancelled");
			return;
		}
		breaking = breakingResult as boolean;
	}

	// Build commit message
	let commitMsg = `${type}`;
	if (scope?.trim()) commitMsg += `(${scope.trim()})`;
	commitMsg += `: ${message}`;

	if (breaking) {
		const breakingDescResult = await text({
			message: "Breaking change description",
			placeholder: "Describe the breaking change",
		});

		if (isCancel(breakingDescResult)) {
			cancel("Operation cancelled");
			return;
		}

		const breakingDesc = breakingDescResult as string;
		if (breakingDesc?.trim()) {
			commitMsg += `\n\nBREAKING CHANGE: ${breakingDesc.trim()}`;
		}
	}

	// Execute commit
	s.start("Creating commit");
	await execa("git", ["commit", "-m", commitMsg]);
	s.stop(pc.green("✅ Commit created successfully"));
}
