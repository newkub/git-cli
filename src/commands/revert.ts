import { cancel, confirm, isCancel, spinner } from "@clack/prompts";
import { execa } from "execa";
import * as pc from "picocolors";

export async function revertChanges() {
	const s = spinner();

	try {
		// Check for changes
		s.start("Checking for changes");
		const { stdout: status } = await execa("git", ["status", "--porcelain"]);
		s.stop("✅ Changes checked");

		if (!status.trim()) {
			console.log(pc.yellow("No changes to revert"));
			return;
		}

		// Show changes that will be reverted
		console.log(pc.bold("Changes that will be reverted:"));
		console.log(
			status
				.split("\n")
				.map((line) => `  ${line}`)
				.join("\n"),
		);

		// Confirm revert
		const shouldRevert = await confirm({
			message: "Are you sure you want to revert all changes?",
			initialValue: false,
		});

		if (isCancel(shouldRevert) || !shouldRevert) {
			cancel("Revert cancelled");
			return;
		}

		// Execute revert
		s.start("Reverting changes");
		await execa("git", ["checkout", "--", "."]);
		s.stop(pc.green("✅ All changes reverted successfully"));
	} catch (error) {
		s.stop("❌ Revert failed");
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
		process.exit(1);
	}
}
