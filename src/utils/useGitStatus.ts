import { execa } from "execa";
import * as pc from "picocolors";

export interface GitStatusInfo {
	branch: string;
	lastCommit: string;
	remote: string;
	ahead: number;
	behind: number;
	hasChanges: boolean;
	statusOutput: string;
}

export interface GitFileStatus {
	status: string;
	filename: string;
	displayText: string;
	color: string;
	description: string;
}

/**
 * Get comprehensive git status information
 */
export async function getGitStatusInfo(): Promise<GitStatusInfo> {
	const { stdout: branch } = await execa("git", ["branch", "--show-current"]);
	const { stdout: lastCommit } = await execa("git", [
		"log",
		"-1",
		"--pretty=format:%h %s",
	]);
	const { stdout: remote } = await execa("git", [
		"remote",
		"get-url",
		"origin",
	]).catch(() => ({ stdout: "No remote" }));
	const { stdout: statusOutput } = await execa("git", [
		"status",
		"--porcelain",
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

	return {
		branch,
		lastCommit,
		remote: remote
			.replace("https://github.com/", "github:")
			.replace(".git", ""),
		ahead: parseInt(ahead, 10) || 0,
		behind: parseInt(behind, 10) || 0,
		hasChanges: statusOutput.trim().length > 0,
		statusOutput,
	};
}

/**
 * Parse git status output into structured file information
 */
export function parseGitStatusFiles(statusOutput: string): GitFileStatus[] {
	const files = statusOutput.split("\n").filter(Boolean);

	return files.map((line) => {
		const status = line.substring(0, 2);
		const filename = line.substring(3);

		let color = pc.gray;
		let description = "";

		switch (status) {
			case "??":
				color = pc.red;
				description = "(untracked)";
				break;
			case " M":
				color = pc.yellow;
				description = "(modified)";
				break;
			case "M ":
				color = pc.green;
				description = "(staged)";
				break;
			case "A ":
				color = pc.green;
				description = "(added)";
				break;
			case "D ":
				color = pc.red;
				description = "(deleted)";
				break;
			case "MM":
				color = pc.cyan;
				description = "(modified & staged)";
				break;
		}

		return {
			status,
			filename,
			displayText: `  ${color(status === "??" ? "?" : status.trim())} ${filename} ${pc.gray(description)}`,
			color: color.name,
			description,
		};
	});
}

/**
 * Display formatted git status box
 */
export function displayGitStatusBox(statusInfo: GitStatusInfo): void {
	let statusLine = `Branch: ${statusInfo.branch} | Latest: ${statusInfo.lastCommit} | Remote: ${statusInfo.remote}`;
	if (statusInfo.ahead > 0)
		statusLine += ` | ${pc.blue(`↑${statusInfo.ahead}`)}`;
	if (statusInfo.behind > 0)
		statusLine += ` | ${pc.red(`↓${statusInfo.behind}`)}`;
	if (statusInfo.hasChanges) statusLine += ` | ${pc.yellow("● Changes")}`;

	const boxWidth = Math.max(statusLine.length + 4, 80);
	console.log(pc.gray(`Git Status ${"─".repeat(boxWidth - 11)}╮`));
	console.log(pc.gray("│") + " ".repeat(boxWidth - 2) + pc.gray("│"));
	console.log(
		pc.gray("│  ") +
			statusLine +
			" ".repeat(boxWidth - statusLine.length - 4) +
			pc.gray("│"),
	);
	console.log(pc.gray("│") + " ".repeat(boxWidth - 2) + pc.gray("│"));
	console.log(pc.gray(`├${"─".repeat(boxWidth - 2)}╯`));
}

/**
 * Display file changes in columns format
 */
export function displayFileChangesInColumns(
	fileStatuses: GitFileStatus[],
	columns: number = 3,
): void {
	if (fileStatuses.length === 0) return;

	console.log(pc.bold("\n📂 Changes:"));

	// Group files by status type for better organization
	const statusGroups = {
		staged: fileStatuses.filter(
			(f) =>
				f.status.startsWith("M ") ||
				f.status.startsWith("A ") ||
				f.status.startsWith("D "),
		),
		modified: fileStatuses.filter(
			(f) => f.status.startsWith(" M") || f.status.startsWith(" D"),
		),
		untracked: fileStatuses.filter((f) => f.status === "??"),
		mixed: fileStatuses.filter(
			(f) => f.status === "MM" || f.status === "MD" || f.status === "AM",
		),
	};

	// Display each group
	Object.entries(statusGroups).forEach(([groupName, files]) => {
		if (files.length === 0) return;

		const groupTitle = {
			staged: pc.green("📋 Staged"),
			modified: pc.yellow("📝 Modified"),
			untracked: pc.red("❓ Untracked"),
			mixed: pc.cyan("🔄 Mixed"),
		}[groupName];

		console.log(`\n  ${groupTitle}:`);
		displayFilesInColumns(files, columns);
	});
}

/**
 * Display files in column format
 */
function displayFilesInColumns(files: GitFileStatus[], columns: number): void {
	const filesPerColumn = Math.ceil(files.length / columns);
	const maxRows = filesPerColumn;

	for (let row = 0; row < maxRows; row++) {
		let line = "";
		for (let col = 0; col < columns; col++) {
			const fileIndex = col * filesPerColumn + row;
			if (fileIndex < files.length) {
				const file = files[fileIndex];
				const statusChar =
					file.status === "??" ? "?" : file.status.trim() || file.status[0];
				const colorFn = getStatusColor(file.status);
				const fileDisplay = `${colorFn(statusChar)} ${file.filename}`;

				// Pad to column width (adjust based on terminal width)
				const columnWidth = Math.floor(80 / columns) - 2;
				line += fileDisplay.padEnd(columnWidth).substring(0, columnWidth);
			}
		}
		if (line.trim()) {
			console.log(`    ${line}`);
		}
	}
}

/**
 * Get color function for file status
 */
function getStatusColor(status: string) {
	switch (status) {
		case "??":
			return pc.red;
		case " M":
			return pc.yellow;
		case "M ":
			return pc.green;
		case "A ":
			return pc.green;
		case "D ":
			return pc.red;
		case "MM":
			return pc.cyan;
		default:
			return pc.gray;
	}
}
