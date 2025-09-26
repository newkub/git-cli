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
import { loadConfig } from "../utils/useConfig";
import type { KogitConfig } from "../types/config";
import {
	parseCommitArgs,
	selectCommitMode,
	showCommitHelp,
	type CommitOptions,
} from "../utils/useCommitOptions";
import {
	buildCommitMessage,
	generateAICommitMessage,
	enhanceCommitMessage,
	getUserCommitMessage,
	confirmCommitMessage,
	executeCommit,
} from "../utils/useCommitMessage";
import {
	getStagedFiles,
	hasChanges,
	autoCommitAllChanges,
} from "../utils/useGitChanges";

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
	{ value: "release", label: "release", hint: "Create a release commit" },
	{ value: "config", label: "config", hint: "Changes to configuration files" },
	{ value: "security", label: "security", hint: "Security related changes" },
];

export async function commitCommand(args: string[]): Promise<void> {
	const options = parseCommitArgs(args);
	const config = await loadConfig();
	const s = spinner();

	try {
		if (options.help) {
			showCommitHelp();
			return;
		}

		intro(pc.blue("📝 Git Commit Tool"));

		// Check if there are changes to commit
		s.start("Checking for changes");
		const hasAnyChanges = await hasChanges();
		s.stop("✅ Changes checked");

		if (!hasAnyChanges && options.mode !== "cherry-pick") {
			console.log(pc.cyan(`ℹ️  No changes to commit`));
			return;
		}

		if (options.message) {
			await executeCommit(options.message);
			return;
		}

		// Always ask user to choose mode first (unless specific flags are used)
		if (!options.mode && !options.ai && !options.no_ai) {
			const mode = await selectCommitMode();
			if (!mode) return;

			options.mode = mode;
		}

		// Handle different commit modes
		if (options.mode === "autocommit") {
			await createAutoCommit(config);
			return;
		}

		if (options.mode === "prompt-enhance") {
			await createPromptEnhanceCommit(config);
			return;
		}

		if (options.mode === "ai-generate") {
			await createAICommit(config);
			return;
		}

		if (options.mode === "interactive") {
			await createInteractiveCommit(options, config);
			return;
		}

		if (options.mode === "cherry-pick") {
			await createCherryPickCommit();
			return;
		}

		// Use AI only when explicitly requested
		if (options.ai && !options.no_ai) {
			await createAICommit(config);
			return;
		}

		// Fallback to interactive
		await createInteractiveCommit(options, config);
	} catch (error) {
		s.stop("❌ Operation failed");
		throw new Error(error instanceof Error ? error.message : String(error));
	}
}

async function createCherryPickCommit(): Promise<void> {
	try {
		const commitHash = await text({
			message: "Enter commit hash to cherry-pick",
			placeholder: "abc123def",
			validate(value) {
				if (!value) return "Commit hash is required";
				if (value.length < 4) return "Commit hash is too short";
			},
		});

		if (isCancel(commitHash)) {
			cancel("Cherry-pick cancelled");
			return;
		}

		const confirmPick = await confirm({
			message: `Cherry-pick commit ${commitHash}?`,
			initialValue: true,
		});

		if (!confirmPick || isCancel(confirmPick)) {
			console.log(pc.gray("Cherry-pick cancelled"));
			return;
		}

		const s = spinner();
		s.start(`Cherry-picking commit ${commitHash}`);
		await execa("git", ["cherry-pick", commitHash as string]);
		s.stop(pc.green(`✅ Commit ${commitHash} cherry-picked successfully`));
	} catch (error) {
		const s = spinner();
		s.stop("❌ Cherry-pick failed");
		console.log(pc.red(`❌ Failed to cherry-pick commit: ${error}`));
		throw error;
	}
}

async function createAICommit(config: KogitConfig): Promise<void> {
	try {
		const stagedFiles = await getStagedFiles();
		if (stagedFiles.length === 0) {
			console.log(pc.yellow(`⚠️  No staged changes to commit`));
			return;
		}

		const aiMessage = await generateAICommitMessage(config);
		if (!aiMessage) return;

		const confirmed = await confirmCommitMessage(aiMessage);
		if (!confirmed) return;

		await executeCommit(aiMessage);
		console.log(pc.green(`✅ AI commit created successfully`));
	} catch (error) {
		console.log(pc.red(`❌ Failed to create AI commit: ${error}`));
		throw error;
	}
}

async function createDirectCommit(message: string): Promise<void> {
	await executeCommit(message);
}

async function createAutoCommit(config: KogitConfig): Promise<void> {
	try {
		await autoCommitAllChanges(config);
		outro(pc.green("🎉 Auto-commit completed successfully!"));
	} catch (error) {
		console.log(pc.red(`❌ Failed to create auto-commit: ${error}`));
		console.log(pc.yellow(`⚠️  Please check your configuration and try again.`));
		throw error;
	}
}

function groupChangesByType(
	statusLines: string[],
): Array<{ type: string; files: string[] }> {
	const groups = new Map<string, string[]>();

	for (const line of statusLines) {
		const status = line.substring(0, 2);
		const file = line.substring(3);

		let type = "misc";
		if (status.includes("A")) type = "feat";
		else if (status.includes("M")) type = "fix";
		else if (status.includes("D")) type = "remove";
		else if (status.includes("R")) type = "refactor";

		if (!groups.has(type)) {
			groups.set(type, []);
		}
		groups.get(type)?.push(file);
	}

	return Array.from(groups.entries()).map(([type, files]) => ({ type, files }));
}

async function createPromptEnhanceCommit(config: KogitConfig): Promise<void> {
	try {
		const userMessage = await getUserCommitMessage();
		if (!userMessage) return;

		const enhancedMessage = await enhanceCommitMessage(userMessage, config);
		if (!enhancedMessage) return;

		const confirmed = await confirmCommitMessage(enhancedMessage);
		if (!confirmed) return;

		await executeCommit(enhancedMessage);
		console.log(pc.green(`✅ Enhanced commit created successfully`));
	} catch (error) {
		console.log(pc.red(`❌ Failed to create enhanced commit: ${error}`));
		throw error;
	}
}

async function createInteractiveCommit(
	options: CommitOptions,
	config: KogitConfig,
): Promise<void> {
	try {
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

		// Get breaking change description if needed
		let breakingDesc = "";
		if (breaking) {
			const breakingDescResult = await text({
				message: "Breaking change description",
				placeholder: "Describe the breaking change",
			});

			if (isCancel(breakingDescResult)) {
				cancel("Operation cancelled");
				return;
			}
			breakingDesc = breakingDescResult as string;
		}

		// Build commit message
		const commitMessage = buildCommitMessage(
			type,
			scope,
			message as string,
			breaking,
			breakingDesc,
		);

		await executeCommit(commitMessage);
		console.log(pc.green(`✅ Interactive commit created successfully`));
	} catch (error) {
		console.log(pc.red(`❌ Failed to create interactive commit: ${error}`));
		throw error;
	}
}