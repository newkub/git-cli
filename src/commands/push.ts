import { cancel, confirm, isCancel, spinner } from "@clack/prompts";
import { execa } from "execa";
import * as pc from "picocolors";
import type { GitRemote, CommandResult } from "../types/git.js";

export async function pushChanges() {
	const s = spinner();

	try {
		// Check if there's a remote
		s.start("Checking remote");
		const { stdout: remote } = await execa("git", ["remote"]);
		s.stop("✅ Remote checked");

		if (!remote.trim()) {
			console.log(pc.yellow("No remote repository configured"));
			return;
		}

		// Get current branch
		s.start("Getting current branch");
		const { stdout: branch } = await execa("git", ["branch", "--show-current"]);
		s.stop("✅ Branch identified");

		// Confirm push
		const shouldPush = await confirm({
			message: `Push ${branch} to ${remote}?`,
			initialValue: true,
		});

		if (isCancel(shouldPush) || !shouldPush) {
			cancel("Push cancelled");
			return;
		}

		// Execute push
		s.start(`Pushing ${branch} to ${remote}`);
		const { stdout } = await execa("git", [
			"push",
			"--set-upstream",
			remote,
			branch,
		]);
		s.stop(pc.green(`✅ Successfully pushed ${branch} to ${remote}`));
		console.log(stdout);
	} catch (error) {
		s.stop("❌ Push failed");
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
		process.exit(1);
	}
}
