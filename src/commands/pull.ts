import { cancel, confirm, isCancel, spinner } from "@clack/prompts";
import { execa } from "execa";
import * as pc from "picocolors";
import type { GitRemote, CommandResult } from "../types/git.js";

export async function pullChanges() {
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

		// Confirm pull
		const shouldPull = await confirm({
			message: `Pull changes for ${branch} from ${remote}?`,
			initialValue: true,
		});

		if (isCancel(shouldPull) || !shouldPull) {
			cancel("Pull cancelled");
			return;
		}

		// Execute pull
		s.start(`Pulling changes for ${branch} from ${remote}`);
		const { stdout } = await execa("git", ["pull", remote, branch]);
		s.stop(pc.green(`✅ Successfully pulled changes for ${branch}`));
		console.log(stdout);
	} catch (error) {
		s.stop("❌ Pull failed");
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
		process.exit(1);
	}
}
