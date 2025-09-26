#!/usr/bin/env bun
import { intro, outro, select, isCancel, cancel, note } from "@clack/prompts";
import * as pc from "picocolors";
import { execa } from "execa";
import {
	branchCommand,
	commitCommand,
	resetCommand,
	revertCommand,
	rebaseCommand,
	showCommitLog,
	mergeBranch,
	remoteCommand,
	searchCommand,
	showGitStatus,
	stageUnstageCommand,
	manageSubmodules,
	cleanCommand,
	worktreeCommand,
	releaseCommand,
} from "./commands";

const WELCOME_ART = `${pc.bold(pc.blue("wgit interactive cli"))}`;

async function getGitStatus() {
	try {
		const { stdout: branch } = await execa("git", ["branch", "--show-current"]);
		const { stdout: lastCommitHash } = await execa("git", [
			"log",
			"-1",
			"--pretty=format:%h",
		]);
		const { stdout: lastCommitMessage } = await execa("git", [
			"log",
			"-1",
			"--pretty=format:%s",
		]);
		const { stdout: remote } = await execa("git", [
			"remote",
			"get-url",
			"origin",
		]).catch(() => ({ stdout: "No remote" }));
		const { stdout: remoteName } = await execa("git", ["remote"]).catch(() => ({
			stdout: "No remote",
		}));
		const { stdout: status } = await execa("git", ["status", "--porcelain"]);
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
		const { stdout: submodules } = await execa("git", [
			"submodule",
			"status",
		]).catch(() => ({ stdout: "" }));

		// Count staged and modified files
		const statusLines = status.trim().split("\n").filter(Boolean);
		const stagedCount = statusLines.filter(
			(line) => line[0] !== " " && line[0] !== "?",
		).length;
		const modifiedCount = statusLines.filter(
			(line) => line[1] !== " " || line[0] === "?",
		).length;
		const submoduleCount = submodules.trim().split("\n").filter(Boolean).length;

		return {
			branch: branch || "No branch",
			lastCommitHash: lastCommitHash || "No commits",
			lastCommitMessage: lastCommitMessage || "No commits",
			remote:
				remote.replace("https://github.com/", "github:").replace(".git", "") ||
				"No remote",
			remoteName: remoteName.trim() || "No remote",
			hasChanges: status.trim().length > 0,
			status: status,
			stagedCount,
			modifiedCount,
			submoduleCount,
			ahead: parseInt(ahead, 10) || 0,
			behind: parseInt(behind, 10) || 0,
		};
	} catch {
		return {
			branch: "Not a git repo",
			lastCommitHash: "",
			lastCommitMessage: "",
			remote: "",
			remoteName: "",
			hasChanges: false,
			status: "",
			stagedCount: 0,
			modifiedCount: 0,
			submoduleCount: 0,
			ahead: 0,
			behind: 0,
		};
	}
}

function showHelp() {
	console.log(pc.bold(pc.blue("\n🚀 WGIT - Interactive Git CLI")));
	console.log(pc.gray("=".repeat(60)));
	console.log(pc.cyan("Available commands:\n"));

	const commands = [
		{
			name: "commit",
			description: "Create commits with AI assistance",
			example: "wgit commit"
		},
		{
			name: "branch",
			description: "Manage branches (create, switch, delete)",
			example: "wgit branch"
		},
		{
			name: "status",
			description: "Show git repository status",
			example: "wgit status"
		},
		{
			name: "log",
			description: "Show commit history",
			example: "wgit log"
		},
		{
			name: "remote",
			description: "Manage remote repositories",
			example: "wgit remote"
		},
		{
			name: "merge",
			description: "Merge branches",
			example: "wgit merge"
		},
		{
			name: "staging",
			description: "Stage or unstage files",
			example: "wgit staging"
		},
		{
			name: "submodules",
			description: "Manage git submodules",
			example: "wgit submodules"
		},
		{
			name: "search",
			description: "Search in codebase and history",
			example: "wgit search"
		},
		{
			name: "clean",
			description: "Remove untracked files",
			example: "wgit clean"
		},
		{
			name: "worktree",
			description: "Manage git worktrees",
			example: "wgit worktree"
		},
		{
			name: "release",
			description: "Create git releases/tags",
			example: "wgit release"
		}
	];

	// Display in 4 columns
	const columnWidth = 20;
	const columns = 4;

	for (let i = 0; i < commands.length; i += columns) {
		const row = commands.slice(i, i + columns);
		let line = "";

		for (let j = 0; j < columns; j++) {
			if (row[j]) {
				const command = pc.bold(pc.green(row[j].name.padEnd(columnWidth - 12)));
				const desc = pc.gray(row[j].description.substring(0, columnWidth - 8));
				line += `${command} ${desc}`;
			} else {
				line += " ".repeat(columnWidth);
			}
		}

		console.log(line);
	}

	console.log(pc.gray("\n" + "=".repeat(60)));
	console.log(pc.cyan("Usage examples:"));
	console.log(pc.yellow("  wgit commit                    # Interactive commit with AI"));
	console.log(pc.yellow("  wgit branch                    # Manage branches"));
	console.log(pc.yellow("  wgit status                    # View repository status"));
	console.log(pc.yellow("  wgit release                   # Create a new release"));
	console.log(pc.yellow("  wgit release --rollback        # Rollback a release"));
	console.log(pc.yellow("  wgit release --dry-run         # Preview a release"));
	console.log(pc.yellow("  wgit --help                    # Show this help"));
	console.log(pc.gray("=".repeat(60)));
}

export async function main() {
	// Check if command line arguments are provided
	const args = process.argv.slice(2);

	if (args.length > 0) {
		// Check for help flags first
		if (args.includes("--help") || args.includes("-h")) {
			showHelp();
			process.exit(0);
		}

		// Direct command execution
		const command = args[0];
		const commandArgs = args.slice(1);

		try {
			switch (command) {
				case "commit":
					await commitCommand(commandArgs);
					break;
				case "reset":
					await resetCommand(commandArgs);
					break;
				case "revert":
					await revertCommand(commandArgs);
					break;
				case "rebase":
					await rebaseCommand(commandArgs);
					break;
				case "branch":
					await branchCommand(commandArgs);
					break;
				case "status":
					await showGitStatus();
					break;
				case "log":
					await showCommitLog();
					break;
				case "remote":
					await remoteCommand();
					break;
				case "merge":
					await mergeBranch();
					break;
				case "stage":
				case "unstage":
				case "staging":
					await stageUnstageCommand();
					break;
				case "submodules":
					await manageSubmodules();
					break;
				case "search":
					await searchCommand();
					break;
				case "clean":
					await cleanCommand();
					break;
				case "worktree":
					await worktreeCommand();
					break;
				case "release":
					await releaseCommand(commandArgs);
					break;
				default:
					console.log(pc.red(`❌ Unknown command: ${command}`));
					console.log(
						pc.cyan(
							"Available commands: commit, reset, revert, rebase, branch, status, log, remote, merge, staging, submodules, search, clean, worktree, release",
						),
					);
					console.log(pc.yellow("Use 'wgit --help' to see all available commands"));
			}
			process.exit(0);
		} catch (error) {
			outro(
				pc.red(
					"❌ Error: " +
						(error instanceof Error ? error.message : String(error)),
				),
			);
			process.exit(1);
		}
	}

	// Interactive mode
	// intro(WELCOME_ART);

	const status = await getGitStatus();

	const command = await select({
		message: pc.bold("What would you like to do?"),
		options: [
			{
				value: "commit",
				label: `📝 Commit     ${status.lastCommitMessage ? pc.yellow(status.lastCommitMessage.slice(0, 30) + (status.lastCommitMessage.length > 30 ? "..." : "")) : pc.gray("No commits")}`,
			},
			{
				value: "branch",
				label: `🌿 Branch     ${pc.cyan(status.branch)}`,
			},
			{
				value: "status",
				label: `📊 Status     ${status.stagedCount > 0 ? pc.green(`${status.stagedCount} staged`) : ""}${status.stagedCount > 0 && status.modifiedCount > 0 ? pc.gray("/") : ""}${status.modifiedCount > 0 ? pc.yellow(`${status.modifiedCount} changed`) : ""}${!status.hasChanges ? pc.green("Clean") : ""}`,
			},
			{
				value: "log",
				label: `📚 Log        ${pc.yellow(status.lastCommitHash)}`,
			},
			{
				value: "remote",
				label: `🌐 Remote     ${pc.green(status.remoteName)}`,
			},
			{
				value: "merge",
				label: `🔀 Merge      ${status.behind > 0 ? pc.red(`Behind ${status.behind}`) : status.ahead > 0 ? pc.blue(`Ahead ${status.ahead}`) : pc.green("Up to date")}`,
			},
			{
				value: "staging",
				label: `📁 Staging    ${status.stagedCount > 0 ? pc.green(`${status.stagedCount} staged`) : ""}${status.stagedCount > 0 && status.modifiedCount > 0 ? pc.gray("/") : ""}${status.modifiedCount > 0 ? pc.yellow(`${status.modifiedCount} to stage`) : ""}${!status.hasChanges ? pc.gray("Nothing") : ""}`,
			},
			{
				value: "submodules",
				label: `📦 Submodules ${status.submoduleCount > 0 ? pc.magenta(`${status.submoduleCount} connected`) : pc.gray("None")}`,
			},
			{
				value: "search",
				label: `🔍 Search     ${pc.blue("Content, files, history")}`,
			},
			{
				value: "clean",
				label: `🧹 Clean      ${pc.blue("Remove untracked files")}`,
			},
			{
				value: "worktree",
				label: `🌳 Worktree   ${pc.blue("Manage worktrees")}`,
			},
			{
				value: "release",
				label: `📦 Release    ${pc.blue("Create releases")}`,
			},
		],
	});

	try {
		switch (command) {
			case "commit":
				await commitCommand([]);
				break;
			case "branch":
				await branchCommand([]);
				break;
			case "status":
				await showGitStatus();
				break;
			case "log":
				await showCommitLog();
				break;
			case "remote":
				await remoteCommand();
				break;
			case "merge":
				await mergeBranch();
				break;
			case "staging":
				await stageUnstageCommand();
				break;
			case "submodules":
				await manageSubmodules();
				break;
			case "search":
				await searchCommand();
				break;
			case "clean":
				await cleanCommand();
				break;
			case "worktree":
				await worktreeCommand();
				break;
			case "release":
				await releaseCommand([]);
				break;
		}
		process.exit(0);
	} catch (error) {
		outro(
			pc.red(
				`❌ Error: ${error instanceof Error ? error.message : String(error)}`,
			),
		);
		process.exit(1);
	}
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
	console.error(pc.red("⚠️ Uncaught exception:"));
	console.error(error);
	process.exit(1);
});

// Handle unhandled rejections
process.on("unhandledRejection", (reason) => {
	console.error(pc.red("⚠️ Unhandled rejection:"));
	console.error(reason);
	process.exit(1);
});

// Check if running directly
if (
	import.meta.url === `file://${process.argv[1]}` ||
	process.argv[1]?.endsWith("src/index.ts") ||
	process.argv[1]?.endsWith("index.ts")
) {
	main();
}