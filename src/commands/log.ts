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

export async function showCommitLog() {
	const s = spinner();

	try {
		intro(pc.blue("📜 Git Commit Log Viewer"));

		s.start("Fetching commit history");
		const { stdout: logOutput } = await execa("git", [
			"log",
			"-n",
			"100",
			"--pretty=format:%h|%s|%an|%ad",
			"--date=short",
		]);
		s.stop("✅ Commit history loaded");

		const commits: GitCommit[] = logOutput
			.split("\n")
			.filter(Boolean)
			.map((line) => {
				const [hash, message, author, date] = line.split("|");
				return {
					hash,
					shortHash: hash,
					message,
					author,
					date: new Date(date),
				};
			});

		const selectedCommitHash = await select({
			message: "Select a commit",
			options: commits.map((commit) => ({
				value: commit.hash,
				label: `${pc.gray(`[${commit.date}]`)} ${commit.message} ${pc.cyan(`(${commit.author})`)}`,
			})),
		});

		if (isCancel(selectedCommitHash)) {
			cancel("Operation cancelled");
			return;
		}

		s.start("Loading commit details");
		const { stdout: commitDetail } = await execa("git", [
			"show",
			"--name-status",
			selectedCommitHash,
		]);
		s.stop("✅ Commit details loaded");

		console.log(`\n${pc.green("📝 Commit Details:")}`);
		console.log(pc.gray("─".repeat(process.stdout.columns || 80)));
		console.log(commitDetail);

		const showDiff = await confirm({
			message: "Do you want to see the changes (diff)?",
			initialValue: false,
		});

		if (isCancel(showDiff)) {
			cancel("Operation cancelled");
			return;
		}

		if (showDiff) {
			s.start("Loading diff");
			const { stdout: diffOutput } = await execa("git", [
				"show",
				selectedCommitHash,
			]);
			s.stop("✅ Diff loaded");

			console.log(`\n${pc.blue("🔄 Changes:")}`);
			console.log(pc.gray("─".repeat(process.stdout.columns || 80)));
			console.log(diffOutput);
		}

		outro(pc.green("✅ Commit history viewed successfully"));
	} catch (error) {
		s.stop("❌ Operation failed");
		outro(pc.red("Error viewing commit history"));
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
		process.exit(1);
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
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
		process.exit(1);
	}
}
