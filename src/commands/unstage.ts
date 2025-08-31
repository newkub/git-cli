import { cancel, isCancel, multiselect, spinner } from "@clack/prompts";
import { execa } from "execa";
import * as pc from "picocolors";

export async function unstageFiles() {
	const s = spinner();

	try {
		// Get staged files
		s.start("Checking staged files");
		const { stdout: status } = await execa("git", [
			"diff",
			"--name-only",
			"--cached",
		]);
		s.stop("✅ Staged files checked");

		if (!status.trim()) {
			console.log(pc.yellow("No files are currently staged"));
			return;
		}

		const stagedFiles = status.split("\n").filter((file) => file.trim());

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
	} catch (error) {
		s.stop("❌ Unstage failed");
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
		process.exit(1);
	}
}
