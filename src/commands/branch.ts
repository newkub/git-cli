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
	console.log(pc.bold("git branch - Manage git branches"));
	console.log("\nUsage:");
	console.log("  git branch [options]");
	console.log("\nOptions:");
	console.log("  -l, --list         List all branches");
	console.log("  -c, --create NAME  Create a new branch");
	console.log("  -o, --checkout NAME Checkout to branch");
	console.log("  -d, --delete NAME  Delete branch");
	console.log("  -r, --remote       Include remote branches");
	console.log("  -h, --help         Show this help message");
	console.log("\nExamples:");
	console.log("  git branch");
	console.log("  git branch --list");
	console.log("  git branch --create feature-branch");
	console.log("  git branch --checkout main");
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
	const s = spinner();

	try {
		s.start("Loading branch information");

		// Get branch information
		const { stdout: currentBranch } = await execa("git", [
			"branch",
			"--show-current",
		]);
		const { stdout: allBranches } = await execa("git", ["branch", "-a"]);
		const { stdout: upstream } = await execa("git", [
			"rev-parse",
			"--abbrev-ref",
			"@{u}",
		]).catch(() => ({ stdout: "No upstream" }));
		const { stdout: lastCommit } = await execa("git", [
			"log",
			"-1",
			"--pretty=format:%h %s",
		]);
		const { stdout: ahead } = await execa("git", [
			"rev-list",
			"--count",
			"@{u}..HEAD",
		]).catch(() => ({ stdout: "0" }));
		const { stdout: behind } = await execa("git", [
			"rev-list",
			"--count",
			"HEAD..@{u}",
		]).catch(() => ({ stdout: "0" }));

		s.stop();

		// Create branch status box
		let statusLine = `Current: ${currentBranch} | Upstream: ${upstream} | Latest: ${lastCommit}`;
		if (parseInt(ahead, 10) > 0) statusLine += ` | ${pc.blue(`↑${ahead}`)}`;
		if (parseInt(behind, 10) > 0) statusLine += ` | ${pc.red(`↓${behind}`)}`;

		const boxWidth = Math.max(statusLine.length + 4, 80);
		console.log(pc.gray(`Branch Status ${"─".repeat(boxWidth - 14)}╮`));
		console.log(pc.gray("│") + " ".repeat(boxWidth - 2) + pc.gray("│"));
		console.log(
			pc.gray("│  ") +
				statusLine +
				" ".repeat(boxWidth - statusLine.length - 4) +
				pc.gray("│"),
		);
		console.log(pc.gray("│") + " ".repeat(boxWidth - 2) + pc.gray("│"));
		console.log(pc.gray(`├${"─".repeat(boxWidth - 2)}╯`));

		// Display all branches
		const branches = allBranches.split("\n").filter(Boolean);
		console.log(pc.bold("\n🌿 All Branches:"));
		branches.forEach((branch) => {
			const cleanBranch = branch.trim();
			if (cleanBranch.startsWith("* ")) {
				console.log(
					`  ${pc.green("●")} ${pc.green(cleanBranch.substring(2))} ${pc.gray("(current)")}`,
				);
			} else if (cleanBranch.startsWith("remotes/")) {
				console.log(
					`  ${pc.blue("○")} ${pc.blue(cleanBranch)} ${pc.gray("(remote)")}`,
				);
			} else {
				console.log(`  ${pc.gray("○")} ${cleanBranch}`);
			}
		});

		// Show actions menu
		const action = await select({
			message: "What would you like to do?",
			options: [
				{
					value: "switch",
					label: "🔄 Switch Branch",
					hint: "Change to different branch",
				},
				{
					value: "create",
					label: "🆕 Create Branch",
					hint: "Create new branch from current",
				},
				{
					value: "rename",
					label: "✏️  Rename Branch",
					hint: "Rename current or other branch",
				},
				{
					value: "delete",
					label: "🗑️  Delete Branch",
					hint: "Delete local branch",
				},
				{
					value: "merge",
					label: "🔀 Merge Branch",
					hint: "Merge branch into current",
				},
				{
					value: "rebase",
					label: "📐 Rebase Branch",
					hint: "Rebase current branch",
				},
				{
					value: "track",
					label: "🔗 Track Remote",
					hint: "Set upstream for current branch",
				},
				{
					value: "push",
					label: "⬆️  Push Branch",
					hint: "Push current branch to remote",
				},
				{ value: "back", label: "← Back", hint: "Return to main menu" },
			],
		});

		if (isCancel(action)) {
			return;
		}

		await handleBranchAction(action as string, currentBranch, branches);
	} catch (error) {
		s.stop("❌ Operation failed");
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
	}
}

async function handleBranchAction(
	action: string,
	currentBranch: string,
	allBranches: string[],
) {
	const s = spinner();

	try {
		switch (action) {
			case "switch": {
				const localBranches = allBranches
					.filter((b) => !b.includes("remotes/") && !b.startsWith("*"))
					.map((b) => b.trim());

				if (localBranches.length === 0) {
					console.log(pc.yellow("No other local branches available"));
					return;
				}

				const branchToSwitch = await select({
					message: "Select branch to switch to",
					options: localBranches.map((branch) => ({
						value: branch,
						label: branch,
					})),
				});

				if (!isCancel(branchToSwitch)) {
					s.start(`Switching to ${branchToSwitch}`);
					await execa("git", ["checkout", branchToSwitch as string]);
					s.stop(pc.green(`✅ Switched to ${branchToSwitch}`));
				}
				break;
			}

			case "create": {
				const newBranchName = await text({
					message: "Enter new branch name",
					placeholder: "feature/new-feature",
				});

				if (!isCancel(newBranchName)) {
					s.start(`Creating branch ${newBranchName}`);
					await execa("git", ["checkout", "-b", newBranchName as string]);
					s.stop(pc.green(`✅ Created and switched to ${newBranchName}`));
				}
				break;
			}

			case "rename": {
				const newName = await text({
					message: `Rename current branch (${currentBranch})`,
					placeholder: "new-branch-name",
				});

				if (!isCancel(newName)) {
					s.start(`Renaming branch to ${newName}`);
					await execa("git", ["branch", "-m", newName as string]);
					s.stop(pc.green(`✅ Renamed branch to ${newName}`));
				}
				break;
			}

			case "delete": {
				const localBranchesToDelete = allBranches
					.filter((b) => !b.includes("remotes/") && !b.startsWith("*"))
					.map((b) => b.trim());

				if (localBranchesToDelete.length === 0) {
					console.log(pc.yellow("No other local branches to delete"));
					return;
				}

				const branchToDelete = await select({
					message: "Select branch to delete",
					options: localBranchesToDelete.map((branch) => ({
						value: branch,
						label: branch,
					})),
				});

				if (!isCancel(branchToDelete)) {
					const confirmDelete = await confirm({
						message: `Delete branch ${branchToDelete}?`,
						initialValue: false,
					});

					if (confirmDelete && !isCancel(confirmDelete)) {
						s.start(`Deleting branch ${branchToDelete}`);
						await execa("git", ["branch", "-d", branchToDelete as string]);
						s.stop(pc.green(`✅ Deleted branch ${branchToDelete}`));
					}
				}
				break;
			}

			case "merge": {
				const branchesToMerge = allBranches
					.filter((b) => !b.includes("remotes/") && !b.startsWith("*"))
					.map((b) => b.trim());

				if (branchesToMerge.length === 0) {
					console.log(pc.yellow("No other branches to merge"));
					return;
				}

				const branchToMerge = await select({
					message: `Select branch to merge into ${currentBranch}`,
					options: branchesToMerge.map((branch) => ({
						value: branch,
						label: branch,
					})),
				});

				if (!isCancel(branchToMerge)) {
					s.start(`Merging ${branchToMerge} into ${currentBranch}`);
					await execa("git", ["merge", branchToMerge as string]);
					s.stop(pc.green(`✅ Merged ${branchToMerge} into ${currentBranch}`));
				}
				break;
			}

			case "rebase": {
				const branchesToRebase = allBranches
					.filter((b) => !b.includes("remotes/") && !b.startsWith("*"))
					.map((b) => b.trim());

				if (branchesToRebase.length === 0) {
					console.log(pc.yellow("No other branches to rebase onto"));
					return;
				}

				const rebaseTarget = await select({
					message: `Select branch to rebase ${currentBranch} onto`,
					options: branchesToRebase.map((branch) => ({
						value: branch,
						label: branch,
					})),
				});

				if (!isCancel(rebaseTarget)) {
					s.start(`Rebasing ${currentBranch} onto ${rebaseTarget}`);
					await execa("git", ["rebase", rebaseTarget as string]);
					s.stop(pc.green(`✅ Rebased ${currentBranch} onto ${rebaseTarget}`));
				}
				break;
			}

			case "track": {
				const remoteName = await text({
					message: "Enter remote name",
					placeholder: "origin",
				});

				if (!isCancel(remoteName)) {
					s.start(`Setting upstream to ${remoteName}/${currentBranch}`);
					await execa("git", [
						"branch",
						"--set-upstream-to",
						`${remoteName}/${currentBranch}`,
					]);
					s.stop(pc.green(`✅ Set upstream to ${remoteName}/${currentBranch}`));
				}
				break;
			}

			case "push": {
				const confirmPush = await confirm({
					message: `Push ${currentBranch} to remote?`,
					initialValue: true,
				});

				if (confirmPush && !isCancel(confirmPush)) {
					s.start(`Pushing ${currentBranch}`);
					await execa("git", ["push", "-u", "origin", currentBranch]);
					s.stop(pc.green(`✅ Pushed ${currentBranch} to origin`));
				}
				break;
			}

			case "back":
				break;
		}
	} catch (error) {
		s.stop("❌ Action failed");
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
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
}

async function createBranch(branchName: string): Promise<void> {
	const s = spinner();
	s.start(`Creating branch ${branchName}`);
	await execa("git", ["checkout", "-b", branchName]);
	s.stop(pc.green(`✅ Created and switched to branch ${branchName}`));
}

async function checkoutBranch(branchName: string): Promise<void> {
	const s = spinner();
	s.start(`Switching to ${branchName}`);
	await execa("git", ["checkout", branchName]);
	s.stop(pc.green(`✅ Switched to ${branchName}`));
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
