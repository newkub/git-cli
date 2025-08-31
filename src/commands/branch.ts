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
import type {
	GitBranch,
	BaseCommandOptions,
	CommandResult,
} from "../types/git.js";

interface BranchOptions extends BaseCommandOptions {
	list?: boolean;
	create?: string;
	checkout?: string;
	delete?: string;
	remote?: boolean;
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
	console.log(pc.bold("w-git branch - Manage git branches"));
	console.log("\nUsage:");
	console.log("  w-git branch [options]");
	console.log("\nOptions:");
	console.log("  -l, --list         List all branches");
	console.log("  -c, --create NAME  Create a new branch");
	console.log("  -o, --checkout NAME Checkout to branch");
	console.log("  -d, --delete NAME  Delete branch");
	console.log("  -r, --remote       Include remote branches");
	console.log("  -h, --help         Show this help message");
	console.log("\nExamples:");
	console.log("  w-git branch");
	console.log("  w-git branch --list");
	console.log("  w-git branch --create feature-branch");
	console.log("  w-git branch --checkout main");
}

function parseArgs(args: string[]): BranchOptions {
	const options: BranchOptions = {};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		switch (arg) {
			case "-l":
			case "--list":
				options.list = true;
				break;
			case "-c":
			case "--create":
				if (i + 1 < args.length) {
					options.create = args[++i];
				}
				break;
			case "-o":
			case "--checkout":
				if (i + 1 < args.length) {
					options.checkout = args[++i];
				}
				break;
			case "-d":
			case "--delete":
				if (i + 1 < args.length) {
					options.delete = args[++i];
				}
				break;
			case "-r":
			case "--remote":
				options.remote = true;
				break;
			case "-h":
			case "--help":
				options.help = true;
				break;
		}
	}

	return options;
}

export async function branchCommand(args: string[]): Promise<void> {
	const options = parseArgs(args);
	const s = spinner();

	try {
		if (options.help) {
			showHelp();
			return;
		}

		intro(pc.blue("🌿 Git Branch Manager"));

		if (options.list) {
			await listBranches(options.remote);
			return;
		}

		if (options.create) {
			await createBranch(options.create);
			return;
		}

		if (options.checkout) {
			await checkoutBranch(options.checkout);
			return;
		}

		if (options.delete) {
			await deleteBranch(options.delete);
			return;
		}

		// Interactive mode
		await interactiveMode(options.remote);
		outro(pc.green("✅ Branch operation completed successfully"));
	} catch (error) {
		s.stop("❌ Operation failed");
		outro(pc.red("Branch operation failed"));
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
		process.exit(1);
	}
}

async function listBranches(includeRemote = false): Promise<void> {
	const s = spinner();
	s.start("Fetching branches");
	const args = ["branch"];
	if (includeRemote) args.push("-a");
	args.push("--format=%(refname:short)");

	const { stdout: branches } = await execa("git", args);
	s.stop("✅ Branches fetched");

	if (!branches.trim()) {
		outro(pc.yellow("⚠️  No branches found"));
		return;
	}

	const branchList = branches.split("\n").filter((b) => b);
	console.log(pc.bold("\nAvailable branches:"));
	branchList.forEach((branch) => {
		const isRemote = branch.startsWith("remotes/");
		const marker = isRemote ? "🌐" : "📝";
		console.log(`  ${marker} ${branch}`);
	});
	outro(pc.green("✅ Branch list displayed"));
}

async function createBranch(branchName: string): Promise<void> {
	const s = spinner();
	s.start(`Creating branch ${branchName}`);
	await execa("git", ["checkout", "-b", branchName]);
	s.stop(pc.green(`✅ Created and switched to branch ${branchName}`));
	outro(pc.green("✅ Branch created successfully"));
}

async function checkoutBranch(branchName: string): Promise<void> {
	const s = spinner();
	s.start(`Switching to ${branchName}`);
	await execa("git", ["checkout", branchName]);
	s.stop(pc.green(`✅ Switched to ${branchName}`));
	outro(pc.green("✅ Branch switched successfully"));
}

async function deleteBranch(branchName: string): Promise<void> {
	const shouldDelete = await confirm({
		message: `Are you sure you want to delete branch '${branchName}'?`,
		initialValue: false,
	});

	if (isCancel(shouldDelete) || !shouldDelete) {
		cancel("Delete cancelled");
		return;
	}

	const s = spinner();
	s.start(`Deleting branch ${branchName}`);
	await execa("git", ["branch", "-d", branchName]);
	s.stop(pc.green(`✅ Deleted branch ${branchName}`));
	outro(pc.green("✅ Branch deleted successfully"));
}

async function interactiveMode(includeRemote = false): Promise<void> {
	const s = spinner();
	s.start("Fetching branches");
	const args = ["branch"];
	if (includeRemote) args.push("-a");
	args.push("--format=%(refname:short)");

	const { stdout: branches } = await execa("git", args);
	s.stop("✅ Branches fetched");

	if (!branches.trim()) {
		outro(pc.yellow("⚠️  No branches found"));
		return;
	}

	const branchList = branches.split("\n").filter((b) => b);

	// Get current branch for context
	const { stdout: currentBranch } = await execa("git", [
		"branch",
		"--show-current",
	]);

	// Select action
	const action = await select({
		message: "What would you like to do?",
		options: [
			{
				value: "checkout",
				label: "🔄 Checkout branch",
				hint: "Switch to a different branch",
			},
			{
				value: "create",
				label: "🆕 Create new branch",
				hint: "Create and switch to a new branch",
			},
			{
				value: "delete",
				label: "🗑️  Delete branch",
				hint: "Delete an existing branch",
			},
			{
				value: "list",
				label: "📝 List all branches",
				hint: "Show all branches",
			},
		],
	});

	if (isCancel(action)) {
		cancel("Operation cancelled");
		return;
	}

	switch (action) {
		case "checkout": {
			const selectedBranch = await select({
				message: `Select branch to checkout from ${currentBranch}`,
				options: branchList
					.filter((b) => b !== currentBranch)
					.map((branch) => {
						const isRemote = branch.startsWith("remotes/");
						const marker = isRemote ? "🌐" : "📝";
						return {
							value: branch,
							label: `${marker} ${branch}`,
							hint: isRemote ? "Remote branch" : "Local branch",
						};
					}),
			});

			if (isCancel(selectedBranch)) {
				cancel("Operation cancelled");
				return;
			}

			await checkoutBranch(selectedBranch as string);
			break;
		}

		case "create": {
			const branchName = await text({
				message: "Enter new branch name",
				placeholder: "feature/awesome-feature",
				validate(value) {
					if (!value) return "Branch name is required";
					if (!/^[a-zA-Z0-9/_-]+$/.test(value))
						return "Invalid characters in branch name";
				},
			});

			if (isCancel(branchName)) {
				cancel("Operation cancelled");
				return;
			}

			await createBranch(branchName as string);
			break;
		}

		case "delete": {
			const branchToDelete = await select({
				message: "Select branch to delete",
				options: branchList
					.filter((b) => b !== currentBranch && !b.startsWith("remotes/"))
					.map((branch) => ({
						value: branch,
						label: `📝 ${branch}`,
					})),
			});

			if (isCancel(branchToDelete)) {
				cancel("Operation cancelled");
				return;
			}

			await deleteBranch(branchToDelete as string);
			break;
		}

		case "list":
			await listBranches(includeRemote);
			break;
	}
}
