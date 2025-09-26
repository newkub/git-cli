import { select, text, confirm, spinner, isCancel, cancel } from "@clack/prompts";
import { execa } from "execa";
import * as pc from "picocolors";

export async function worktreeCommand() {
	const s = spinner();
	
	try {
		// Get existing worktrees
		const { stdout: worktrees } = await execa("git", ["worktree", "list"]).catch(() => ({ stdout: "" }));
		
		// Always show worktree list first
		if (worktrees.trim()) {
			console.log(pc.blue("Existing Worktrees:"));
			console.log(worktrees);
			console.log(""); // Add spacing
		} else {
			console.log(pc.gray("No existing worktrees found\n"));
		}
		
		const action = await select({
			message: "What would you like to do with worktrees?",
			options: [
				{ value: "add", label: "Add new worktree" },
				{ value: "remove", label: "Remove worktree" },
			],
		});
		
		if (isCancel(action)) {
			cancel("Worktree operation cancelled");
			return;
		}
		
		switch (action) {
			case "add":
				const branchName = await text({
					message: "Branch name for new worktree",
					placeholder: "feature/new-feature",
				});
				
				if (isCancel(branchName)) {
					cancel("Worktree creation cancelled");
					return;
				}
				
				const path = await text({
					message: "Path for new worktree",
					placeholder: "../new-worktree",
				});
				
				if (isCancel(path)) {
					cancel("Worktree creation cancelled");
					return;
				}
				
				s.start("Creating worktree");
				await execa("git", ["worktree", "add", path, branchName]);
				s.stop(pc.green(`✅ Worktree created at ${path} for branch ${branchName}`));
				break;
				
			case "remove":
				const worktreePath = await text({
					message: "Path of worktree to remove",
					placeholder: "../existing-worktree",
				});
				
				if (isCancel(worktreePath)) {
					cancel("Worktree removal cancelled");
					return;
				}
				
				const confirmRemove = await confirm({
					message: `Remove worktree at ${worktreePath}? This cannot be undone!`,
					initialValue: false,
				});
				
				if (!confirmRemove) {
					console.log(pc.gray("Worktree removal cancelled"));
					return;
				}
				
				s.start("Removing worktree");
				await execa("git", ["worktree", "remove", worktreePath]);
				s.stop(pc.green(`✅ Worktree at ${worktreePath} removed`));
				break;
		}
	} catch (error) {
		s.stop("❌ Worktree operation failed");
		console.error(pc.red(error instanceof Error ? error.message : String(error)));
	}
}