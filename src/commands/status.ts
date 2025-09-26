import { spinner } from "@clack/prompts";
import { execa } from "execa";
import * as pc from "picocolors";
import {
	getGitStatusInfo,
	parseGitStatusFiles,
	displayGitStatusBox,
	displayFileChangesInColumns,
} from "../utils/useGitStatus.js";

export async function showGitStatus() {
	const s = spinner();

	try {
		s.start("Loading git status");

		// Get all status information using utility function
		const statusInfo = await getGitStatusInfo();

		s.stop();

		// Display status information without box
		displayGitStatusInfo(statusInfo);

		// Parse and display file changes
		const fileStatuses = parseGitStatusFiles(statusInfo.statusOutput);

		if (fileStatuses.length > 0) {
			// Display file changes in 2 columns format
			displayFileChangesInColumns(fileStatuses, 2);
		} else {
			console.log(pc.green("\n✨ Working directory is clean!"));
		}
	} catch (error) {
		s.stop("❌ Status check failed");
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
	}
}

function displayGitStatusInfo(statusInfo: any) {
	// Display status information without box formatting
	let statusLine = `Branch: ${statusInfo.branch} | Latest: ${statusInfo.lastCommit} | Remote: ${statusInfo.remote}`;
	if (statusInfo.ahead > 0)
		statusLine += ` | ${pc.blue(`↑${statusInfo.ahead}`)}`;
	if (statusInfo.behind > 0)
		statusLine += ` | ${pc.red(`↓${statusInfo.behind}`)}`;
	if (statusInfo.hasChanges) statusLine += ` | ${pc.yellow("● Changes")}`;
	
	console.log(statusLine);
	console.log(""); // Add spacing
}