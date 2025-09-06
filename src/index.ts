#!/usr/bin/env bun
import { intro, outro, select, isCancel, cancel, note } from "@clack/prompts";
import * as pc from "picocolors";
import { execa } from "execa";
import {
	branchCommand,
	commitCommand,
	showCommitLog,
	mergeBranch,
	remoteCommand,
	searchCommand,
	showGitStatus,
	stageFiles,
	unstageFiles,
	manageSubmodules,
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

export async function main() {
	// Check if command line arguments are provided
	const args = process.argv.slice(2);

	if (args.length > 0) {
		// Direct command execution
		const command = args[0];
		const commandArgs = args.slice(1);

		try {
			switch (command) {
				case "commit":
					await commitCommand(commandArgs);
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
					await stageFiles();
					break;
				case "unstage":
					await unstageFiles();
					break;
				case "submodules":
					await manageSubmodules();
					break;
				case "search":
					await searchCommand();
					break;
				default:
					console.log(pc.red(`❌ Unknown command: ${command}`));
					console.log(
						pc.cyan(
							"Available commands: commit, branch, status, log, remote, merge, stage, unstage, submodules, search",
						),
					);
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
	intro(WELCOME_ART);

	const status = await getGitStatus();

	if (status.branch !== "Not a git repo") {
		const fileCount = status.hasChanges
			? status.status.split("\n").filter(Boolean).length
			: 0;

		let statusLine = `${pc.cyan(status.branch)} | ${pc.yellow(`${status.lastCommitHash} ${status.lastCommitMessage}`)} | ${pc.green(status.remote)}`;
		if (status.ahead > 0) statusLine += ` | ${pc.blue(`↑${status.ahead}`)}`;
		if (status.behind > 0) statusLine += ` | ${pc.red(`↓${status.behind}`)}`;
		if (status.hasChanges)
			statusLine += ` | ${pc.yellow(`${fileCount} files changed`)}`;

		note(statusLine, "Git Status");
	}

	const command = await select({
		message: pc.bold("What would you like to do?"),
		options: [
			{
				value: "commit",
				label: `📝 Commit        ${pc.gray("→")} ${status.lastCommitMessage ? pc.yellow(status.lastCommitMessage.slice(0, 30) + (status.lastCommitMessage.length > 30 ? "..." : "")) : pc.gray("No commits")}`,
			},
			{
				value: "branch",
				label: `🌿 Branch        ${pc.gray("→")} ${pc.cyan(status.branch)}`,
			},
			{
				value: "status",
				label: `📊 Status        ${pc.gray("→")} ${status.stagedCount > 0 ? pc.green(`${status.stagedCount} staged`) : ""}${status.stagedCount > 0 && status.modifiedCount > 0 ? pc.gray("/") : ""}${status.modifiedCount > 0 ? pc.yellow(`${status.modifiedCount} changed`) : ""}${!status.hasChanges ? pc.green("Clean") : ""}`,
			},
			{
				value: "log",
				label: `📚 Log           ${pc.gray("→")} ${pc.yellow(status.lastCommitHash)}`,
			},
			{
				value: "remote",
				label: `🌐 Remote        ${pc.gray("→")} ${pc.green(status.remoteName)}`,
			},
			{
				value: "merge",
				label: `🔀 Merge         ${pc.gray("→")} ${status.behind > 0 ? pc.red(`Behind ${status.behind}`) : status.ahead > 0 ? pc.blue(`Ahead ${status.ahead}`) : pc.green("Up to date")}`,
			},
			{
				value: "stage",
				label: `➕ Stage         ${pc.gray("→")} ${status.stagedCount > 0 ? pc.green(`${status.stagedCount} staged`) : ""}${status.stagedCount > 0 && status.modifiedCount > 0 ? pc.gray("/") : ""}${status.modifiedCount > 0 ? pc.yellow(`${status.modifiedCount} to stage`) : ""}${!status.hasChanges ? pc.gray("Nothing") : ""}`,
			},
			{
				value: "unstage",
				label: `➖ Unstage       ${pc.gray("→")} ${status.stagedCount > 0 ? pc.green(`${status.stagedCount} staged`) : pc.gray("Nothing staged")}`,
			},
			{
				value: "submodules",
				label: `📦 Submodules    ${pc.gray("→")} ${status.submoduleCount > 0 ? pc.magenta(`${status.submoduleCount} connected`) : pc.gray("None")}`,
			},
			{
				value: "search",
				label: `🔍 Search        ${pc.gray("→")} ${pc.blue("Content, files, history")}`,
			},
		],
	});

	if (isCancel(command)) {
		cancel(pc.yellow("See you next time!"));
		outro(pc.blue("🚀 Happy coding!"));
		process.exit(0);
	}

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
			case "stage":
				await stageFiles();
				break;
			case "unstage":
				await unstageFiles();
				break;
			case "submodules":
				await manageSubmodules();
				break;
			case "search":
				await searchCommand();
				break;
		}
		outro(pc.blue("🚀 Happy coding!"));
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
