import { select, isCancel, cancel, multiselect, confirm, spinner } from "@clack/prompts";
import { execa } from "execa";
import * as pc from "picocolors";
import { commitCommand } from "./commit";
import {
	getGitStatusInfo,
	displayGitStatusBox,
	parseGitStatusFiles,
	displayFileChangesInColumns,
} from "../utils/useGitStatus";

export async function stageUnstageCommand() {
	const s = spinner();
	
	// Display git status at the top
	try {
		s.start("Loading git status");
		const statusInfo = await getGitStatusInfo();
		s.stop();
		
		// Display status box
		displayGitStatusBox(statusInfo);
		
		// Display file changes
		const fileStatuses = parseGitStatusFiles(statusInfo.statusOutput);
		if (fileStatuses.length > 0) {
			displayFileChangesInColumns(fileStatuses, 2); // Changed to 2 columns
		} else {
			console.log(pc.green("\n✨ Working directory is clean!"));
		}
		
		console.log(""); // Add spacing
	} catch (error) {
		s.stop("❌ Failed to load git status");
		console.error(pc.red(error instanceof Error ? error.message : String(error)));
		return;
	}

	// Get both changed and staged files
	s.start("Checking file status");
	const { stdout: status } = await execa("git", ["status", "--porcelain"]);
	const { stdout: stagedStatus } = await execa("git", [
		"diff",
		"--name-only",
		"--cached",
	]);
	s.stop("✅ File status checked");

	const changedFiles = status
		.split("\n")
		.filter((line) => line.trim())
		.map((line) => {
			// Git status format: XY filename where X=index, Y=worktree
			// Examples: " M file.txt", "?? newfile.txt", "MM modified.txt"
			// We need to remove the first 3 characters (status + space)
			return line.length > 3 ? line.substring(3) : line;
		})
		.filter((file) => file.trim().length > 0);

	const stagedFiles = stagedStatus.split("\n").filter((file) => file.trim());

	if (changedFiles.length === 0 && stagedFiles.length === 0) {
		console.log(pc.yellow("No changes to stage or unstage"));
		return;
	}

	// Ask user what they want to do
	const action = await select({
		message: "What would you like to do?",
		options: [
			{ value: "stage", label: "Stage files" },
			{ value: "unstage", label: "Unstage files" },
			{ value: "reset", label: "Reset files", hint: "Unstage and discard changes" },
			{ value: "restore", label: "Restore files", hint: "Discard changes in working directory" },
		],
	});

	if (isCancel(action)) {
		cancel("Staging cancelled");
		return;
	}

	if (action === "stage") {
		if (changedFiles.length === 0) {
			console.log(pc.yellow("No files to stage"));
			return;
		}

		// Select files to stage
		const filesToStage = await multiselect({
			message: "Select files to stage",
			options: changedFiles.map((file) => ({
				value: file,
				label: file,
			})),
			required: true,
		});

		if (isCancel(filesToStage)) {
			cancel("Stage cancelled");
			return;
		}

		// Stage selected files
		s.start("Staging files");
		await execa("git", ["add", ...filesToStage]);
		s.stop(pc.green(`✅ Successfully staged ${filesToStage.length} file(s)`));

		// Ask if user wants to commit staged files
		const shouldCommit = await confirm({
			message: "Would you like to commit the staged files now?",
			initialValue: true,
		});

		if (!isCancel(shouldCommit) && shouldCommit) {
			await commitCommand([]);
		}
	} else if (action === "unstage") {
		if (stagedFiles.length === 0) {
			console.log(pc.yellow("No files to unstage"));
			return;
		}

		// Select files to unstage
		const filesToUnstage = await multiselect({
			message: "Select files to unstage",
			options: stagedFiles.map((file) => ({
				value: file,
				label: file,
			})),
			required: true,
		});

		if (isCancel(filesToUnstage)) {
			cancel("Unstage cancelled");
			return;
		}

		// Unstage selected files
		s.start("Unstaging files");
		await execa("git", ["reset", "HEAD", "--", ...filesToUnstage]);
		s.stop(
			pc.green(`✅ Successfully unstaged ${filesToUnstage.length} file(s)`),
		);
	} else if (action === "reset") {
		// Reset both staged and unstaged files
		const allFiles = [...changedFiles, ...stagedFiles];
		
		if (allFiles.length === 0) {
			console.log(pc.yellow("No files to reset"));
			return;
		}

		// Select files to reset
		const filesToReset = await multiselect({
			message: "Select files to reset (unstage and discard changes)",
			options: allFiles.map((file) => ({
				value: file,
				label: file,
			})),
			required: true,
		});

		if (isCancel(filesToReset)) {
			cancel("Reset cancelled");
			return;
		}

		// Confirm reset action
		const confirmReset = await confirm({
			message: `Reset ${filesToReset.length} file(s)? This will unstage and discard all changes!`,
			initialValue: false,
		});

		if (!confirmReset || isCancel(confirmReset)) {
			console.log(pc.gray("Reset cancelled"));
			return;
		}

		// Reset selected files
		s.start("Resetting files");
		// First unstage files if they are staged
		await execa("git", ["reset", "HEAD", "--", ...filesToReset]);
		// Then restore files to discard changes
		await execa("git", ["restore", "--", ...filesToReset]);
		s.stop(
			pc.green(`✅ Successfully reset ${filesToReset.length} file(s)`),
		);
	} else if (action === "restore") {
		// Restore files (discard changes in working directory)
		if (changedFiles.length === 0) {
			console.log(pc.yellow("No files to restore"));
			return;
		}

		// Select files to restore
		const filesToRestore = await multiselect({
			message: "Select files to restore (discard changes)",
			options: changedFiles.map((file) => ({
				value: file,
				label: file,
			})),
			required: true,
		});

		if (isCancel(filesToRestore)) {
			cancel("Restore cancelled");
			return;
		}

		// Confirm restore action
		const confirmRestore = await confirm({
			message: `Restore ${filesToRestore.length} file(s)? This will discard all changes!`,
			initialValue: false,
		});

		if (!confirmRestore || isCancel(confirmRestore)) {
			console.log(pc.gray("Restore cancelled"));
			return;
		}

		// Restore selected files
		s.start("Restoring files");
		await execa("git", ["restore", "--", ...filesToRestore]);
		s.stop(
			pc.green(`✅ Successfully restored ${filesToRestore.length} file(s)`),
		);
	}
}