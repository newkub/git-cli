import {
	cancel,
	confirm,
	intro,
	isCancel,
	outro,
	select,
	spinner,
} from "@clack/prompts";
import { execa } from "execa";
import * as pc from "picocolors";
import type { GitCommit, GitLogOptions, CommandResult } from "../types/git.js";

function getTimeAgo(date: Date): string {
	const now = new Date();
	const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

	if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
	if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
	if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
	return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

export async function showCommitLog() {
	const s = spinner();

	try {
		intro(pc.blue("📜 Git Commit Log"));

		s.start("Loading commits");
		const { stdout: logOutput } = await execa("git", [
			"log",
			"-n",
			"50",
			"--pretty=format:%h|%s|%an|%ai",
		]);
		s.stop();

		const commits: GitCommit[] = logOutput
			.split("\n")
			.filter(Boolean)
			.map((line) => {
				const [hash, message, author, isoDate] = line.split("|");
				return {
					hash,
					shortHash: hash,
					message,
					author,
					date: new Date(isoDate),
				};
			});

		const selectedCommitHash = await select({
			message: "Select a commit",
			options: commits.map((commit) => ({
				value: commit.hash,
				label: `${pc.cyan(commit.shortHash)} ${commit.message.slice(0, 60)}${commit.message.length > 60 ? "..." : ""} ${pc.gray(getTimeAgo(commit.date))}`,
			})),
		});

		if (isCancel(selectedCommitHash)) {
			return;
		}

		await showCommitDetails(selectedCommitHash as string);
	} catch (error) {
		s.stop("❌ Failed to load commits");
		throw new Error(error instanceof Error ? error.message : String(error));
	}
}

async function showCommitDetails(commitHash: string) {
	const s = spinner();

	try {
		s.start("Loading commit details");
		const { stdout: commitInfo } = await execa("git", [
			"show",
			"--pretty=format:%h|%s|%an|%ai|%B",
			"--name-status",
			commitHash,
		]);
		s.stop();

		const lines = commitInfo.split("\n");
		const [hash, subject, author, isoDate, ...bodyAndFiles] =
			lines[0].split("|");
		const date = new Date(isoDate);

		console.log(`\n${pc.blue("📋 Commit Details")}`);
		console.log(`${pc.cyan("Hash:")} ${hash}`);
		console.log(`${pc.yellow("Message:")} ${subject}`);
		console.log(`${pc.green("Author:")} ${author}`);
		console.log(
			`${pc.gray("Date:")} ${date.toLocaleString()} (${getTimeAgo(date)})`,
		);

		const action = await select({
			message: "What would you like to do?",
			options: [
				{ value: "diff", label: "🔍 View Changes", hint: "Show file diffs" },
				{ value: "revert", label: "↩️  Revert", hint: "Revert this commit" },
				{
					value: "cherry-pick",
					label: "🍒 Cherry Pick",
					hint: "Apply to current branch",
				},
				{
					value: "reset",
					label: "🔄 Reset to Here",
					hint: "Reset HEAD to this commit",
				},
				{ value: "back", label: "← Back", hint: "Return to commit list" },
			],
		});

		if (isCancel(action)) {
			return;
		}

		await handleCommitAction(action as string, commitHash);
	} catch (error) {
		s.stop("❌ Failed to load commit details");
		throw new Error(error instanceof Error ? error.message : String(error));
	}
}

async function handleCommitAction(action: string, commitHash: string) {
	const s = spinner();

	try {
		switch (action) {
			case "diff": {
				s.start("Loading changes");
				const { stdout: diff } = await execa("git", ["show", commitHash]);
				s.stop();
				console.log(`\n${pc.blue("🔄 Changes:")}`);
				console.log(diff);
				break;
			}

			case "revert": {
				const confirmRevert = await confirm({
					message: `Revert commit ${commitHash}?`,
					initialValue: false,
				});
				if (confirmRevert && !isCancel(confirmRevert)) {
					s.start("Reverting commit");
					await execa("git", ["revert", "--no-edit", commitHash]);
					s.stop();
					console.log(pc.green(`✅ Commit ${commitHash} reverted`));
				}
				break;
			}

			case "cherry-pick": {
				const confirmPick = await confirm({
					message: `Cherry-pick commit ${commitHash}?`,
					initialValue: false,
				});
				if (confirmPick && !isCancel(confirmPick)) {
					s.start("Cherry-picking commit");
					await execa("git", ["cherry-pick", commitHash]);
					s.stop();
					console.log(pc.green(`✅ Commit ${commitHash} cherry-picked`));
				}
				break;
			}

			case "reset": {
				const confirmReset = await confirm({
					message: `Reset HEAD to ${commitHash}? This will lose uncommitted changes!`,
					initialValue: false,
				});
				if (confirmReset && !isCancel(confirmReset)) {
					s.start("Resetting to commit");
					await execa("git", ["reset", "--hard", commitHash]);
					s.stop();
					console.log(pc.green(`✅ Reset to commit ${commitHash}`));
				}
				break;
			}

			case "back":
				await showCommitLog();
				break;
		}
	} catch (error) {
		s.stop("❌ Action failed");
		throw new Error(error instanceof Error ? error.message : String(error));
	}
}

export async function viewGitLog() {
	const s = spinner();

	try {
		// Select log format
		const format = await select({
			message: "Log format",
			options: [
				{ value: "oneline", label: "One-line summary", hint: "--oneline" },
				{ value: "short", label: "Short format", hint: "--pretty=short" },
				{ value: "full", label: "Full details", hint: "--pretty=full" },
				{ value: "graph", label: "Graph view", hint: "--graph --oneline" },
			],
			initialValue: "oneline",
		});

		if (isCancel(format)) {
			cancel("Log view cancelled");
			return;
		}

		// Build git command
		const args = ["log"];
		switch (format) {
			case "oneline":
				args.push("--oneline");
				break;
			case "short":
				args.push("--pretty=short");
				break;
			case "full":
				args.push("--pretty=full");
				break;
			case "graph":
				args.push("--graph", "--oneline");
				break;
		}

		// Get branch info for context
		s.start("Getting branch information");
		const { stdout: branch } = await execa("git", ["branch", "--show-current"]);
		s.stop("✅ Branch identified");

		// Show log
		s.start(`Loading ${format} log for ${branch}`);
		const { stdout } = await execa("git", args);
		s.stop(pc.green(`✅ Log loaded (${format} format)`));

		if (!stdout.trim()) {
			console.log(pc.yellow("No commits found"));
			return;
		}

		console.log(stdout);
	} catch (error) {
		s.stop("❌ Failed to load git log");
		throw new Error(error instanceof Error ? error.message : String(error));
	}
}
