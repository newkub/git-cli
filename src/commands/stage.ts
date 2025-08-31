import { cancel, isCancel, multiselect, select, spinner } from "@clack/prompts";
import { execa } from "execa";
import * as pc from "picocolors";

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
			.map((line) => line.trim().substring(3)); // Remove status indicators

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
	} catch (error) {
		s.stop("❌ Stage failed");
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
		process.exit(1);
	}
}
