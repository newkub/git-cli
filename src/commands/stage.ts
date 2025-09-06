import {
	cancel,
	isCancel,
	multiselect,
	select,
	spinner,
	confirm,
} from "@clack/prompts";
import { execa } from "execa";
import * as pc from "picocolors";
import { commitCommand } from "./commit";

export async function stageFiles() {
	const s = spinner();

	try {
		// Get changed files
		s.start("Checking for changes");
		const { stdout: status } = await execa("git", ["status", "--porcelain"]);
		s.stop("✅ Changes checked");

		if (!status.trim()) {
			console.log(pc.yellow("No changes to stage"));
			return;
		}

		// Parse changed files
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
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : String(error));
	}
}
