import { cancel, isCancel, select, spinner } from "@clack/prompts";
import { execa } from "execa";
import * as pc from "picocolors";
import type { GitBranch, MergeConflict, CommandResult } from "../types/git.js";

export async function mergeBranch() {
	const s = spinner();

	try {
		// List available branches
		s.start("Fetching branches");
		const { stdout: branches } = await execa("git", [
			"branch",
			"-a",
			"--format=%(refname:short)",
		]);
		s.stop("✅ Branches fetched");

		if (!branches.trim()) {
			console.log(pc.yellow("No branches found"));
			return;
		}

		const branchList = branches
			.split("\n")
			.filter((b) => b && !b.includes("HEAD"));

		// Get current branch
		s.start("Getting current branch");
		const { stdout: currentBranch } = await execa("git", [
			"branch",
			"--show-current",
		]);
		s.stop("✅ Current branch identified");

		// Select branch to merge
		const branchToMerge = await select({
			message: `Merge into ${currentBranch} from`,
			options: branchList
				.filter((b) => b !== currentBranch)
				.map((b) => ({
					value: b,
					label: b,
					hint: b.startsWith("remotes/") ? "Remote branch" : "Local branch",
				})),
		});

		if (isCancel(branchToMerge)) {
			cancel("Merge cancelled");
			return;
		}

		// Confirm merge
		s.start(`Merging ${branchToMerge} into ${currentBranch}`);
		const { stdout } = await execa("git", ["merge", branchToMerge]);
		s.stop(
			pc.green(`✅ Successfully merged ${branchToMerge} into ${currentBranch}`),
		);
		console.log(stdout);
	} catch (error) {
		s.stop("❌ Merge failed");
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
		process.exit(1);
	}
}
