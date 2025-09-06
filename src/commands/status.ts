import { select, spinner, isCancel, confirm } from "@clack/prompts";
import { execa } from "execa";
import * as pc from "picocolors";
import { stageFiles } from "./stage";
import { unstageFiles } from "./unstage";
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

		// Display status box using utility function
		displayGitStatusBox(statusInfo);

		// Parse and display file changes
		const fileStatuses = parseGitStatusFiles(statusInfo.statusOutput);

		if (fileStatuses.length > 0) {
			// Display file changes in columns format instead of list
			displayFileChangesInColumns(fileStatuses);

			// Show actions menu
			const action = await select({
				message: "What would you like to do?",
				options: [
					{
						value: "stage-all",
						label: "➕ Stage All",
						hint: "Add all changes to staging area",
					},
					{
						value: "stage-files",
						label: "📝 Stage Files",
						hint: "Choose specific files to stage",
					},
					{
						value: "unstage-all",
						label: "➖ Unstage All",
						hint: "Remove all files from staging area",
					},
					{
						value: "unstage-files",
						label: "📤 Unstage Files",
						hint: "Choose specific files to unstage",
					},
					{
						value: "restore",
						label: "↶ Restore",
						hint: "Discard changes in working directory",
					},
					{ value: "clean", label: "🧹 Clean", hint: "Remove untracked files" },
					{
						value: "refresh",
						label: "🔄 Refresh",
						hint: "Refresh status display",
					},
					{ value: "back", label: "← Back", hint: "Return to main menu" },
				],
			});

			if (isCancel(action)) {
				return;
			}

			await handleStatusAction(action as string);
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

async function handleStatusAction(action: string) {
	const s = spinner();

	try {
		switch (action) {
			case "stage-all":
				s.start("Staging all changes");
				await execa("git", ["add", "."]);
				s.stop(pc.green("✅ All changes staged"));
				break;

			case "stage-files":
				await stageFiles();
				break;

			case "unstage-all":
				s.start("Unstaging all changes");
				await execa("git", ["reset", "HEAD"]);
				s.stop(pc.green("✅ All changes unstaged"));
				break;

			case "unstage-files":
				await unstageFiles();
				break;

			case "restore": {
				const confirmRestore = await confirm({
					message:
						"Discard all changes in working directory? This cannot be undone!",
					initialValue: false,
				});
				if (confirmRestore && !isCancel(confirmRestore)) {
					s.start("Restoring working directory");
					await execa("git", ["restore", "."]);
					s.stop(pc.green("✅ Working directory restored"));
				}
				break;
			}

			case "clean": {
				const confirmClean = await confirm({
					message: "Remove all untracked files? This cannot be undone!",
					initialValue: false,
				});
				if (confirmClean && !isCancel(confirmClean)) {
					s.start("Cleaning untracked files");
					await execa("git", ["clean", "-fd"]);
					s.stop(pc.green("✅ Untracked files removed"));
				}
				break;
			}

			case "refresh":
				await showGitStatus();
				break;

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
