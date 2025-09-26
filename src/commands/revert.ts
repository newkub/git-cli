import { execa } from "execa";
import { cancel, confirm, intro, isCancel, outro, select, spinner, text } from "@clack/prompts";
import * as pc from "picocolors";
import { showCommitLog } from "./log";

export async function revertCommand(args: string[] = []): Promise<void> {
	intro(pc.blue("↩️  Git Revert Tool"));
	
	const s = spinner();
	
	try {
		// If specific arguments provided, use them directly
		if (args.length > 0) {
			const confirmRevert = await confirm({
				message: `Revert commit(s): ${args.join(" ")}?`,
				initialValue: false,
			});
			
			if (!confirmRevert || isCancel(confirmRevert)) {
				console.log(pc.gray("Revert cancelled"));
				return;
			}
			
			s.start("Reverting");
			await execa("git", ["revert", ...args]);
			s.stop(pc.green("✅ Revert completed"));
			return;
		}
		
		// Interactive mode
		const action = await select({
			message: "What would you like to do?",
			options: [
				{ 
					value: "single", 
					label: "Revert Single Commit", 
					hint: "Revert a specific commit" 
				},
				{ 
					value: "range", 
					label: "Revert Commit Range", 
					hint: "Revert a range of commits" 
				},
				{ 
					value: "browse", 
					label: "Browse Commits", 
					hint: "Select commit from history" 
				},
			],
		});
		
		if (isCancel(action)) {
			cancel("Revert cancelled");
			return;
		}
		
		switch (action) {
			case "single":
				await revertSingleCommit();
				break;
			case "range":
				await revertCommitRange();
				break;
			case "browse":
				await showCommitLog();
				break;
		}
		
		outro(pc.green("✅ Revert operation completed"));
	} catch (error) {
		s.stop("❌ Revert failed");
		throw new Error(error instanceof Error ? error.message : String(error));
	}
}

async function revertSingleCommit(): Promise<void> {
	const commitHash = await text({
		message: "Enter commit hash to revert",
		placeholder: "abc123def",
		validate(value) {
			if (!value) return "Commit hash is required";
			if (value.length < 4) return "Commit hash is too short";
		},
	});
	
	if (isCancel(commitHash)) {
		cancel("Revert cancelled");
		return;
	}
	
	const options = await select({
		message: "Revert options",
		options: [
			{ 
				value: "default", 
				label: "Default Revert", 
				hint: "Create a new commit that reverts the changes" 
			},
			{ 
				value: "no-commit", 
				label: "No Commit", 
				hint: "Apply changes but don't commit" 
			},
			{ 
				value: "edit", 
				label: "Edit Message", 
				hint: "Edit commit message before committing" 
			},
		],
	});
	
	if (isCancel(options)) {
		cancel("Revert cancelled");
		return;
	}
	
	const s = spinner();
	
	switch (options) {
		case "default":
			s.start(`Reverting commit ${commitHash}`);
			await execa("git", ["revert", "--no-edit", commitHash as string]);
			s.stop(pc.green(`✅ Commit ${commitHash} reverted`));
			break;
		case "no-commit":
			s.start(`Reverting commit ${commitHash} without committing`);
			await execa("git", ["revert", "--no-commit", commitHash as string]);
			s.stop(pc.green(`✅ Commit ${commitHash} reverted (not committed)`));
			break;
		case "edit":
			s.start(`Reverting commit ${commitHash} with edit`);
			await execa("git", ["revert", commitHash as string]);
			s.stop(pc.green(`✅ Commit ${commitHash} reverted (message edited)`));
			break;
	}
}

async function revertCommitRange(): Promise<void> {
	const startCommit = await text({
		message: "Enter start commit hash",
		placeholder: "abc123def",
		validate(value) {
			if (!value) return "Commit hash is required";
			if (value.length < 4) return "Commit hash is too short";
		},
	});
	
	if (isCancel(startCommit)) {
		cancel("Revert cancelled");
		return;
	}
	
	const endCommit = await text({
		message: "Enter end commit hash",
		placeholder: "def456ghi",
		validate(value) {
			if (!value) return "Commit hash is required";
			if (value.length < 4) return "Commit hash is too short";
		},
	});
	
	if (isCancel(endCommit)) {
		cancel("Revert cancelled");
		return;
	}
	
	const confirmRevert = await confirm({
		message: `Revert commits from ${startCommit} to ${endCommit}?`,
		initialValue: false,
	});
	
	if (!confirmRevert || isCancel(confirmRevert)) {
		console.log(pc.gray("Revert cancelled"));
		return;
	}
	
	const s = spinner();
	s.start(`Reverting commit range ${startCommit}..${endCommit}`);
	await execa("git", ["revert", `${startCommit}^..${endCommit}`]);
	s.stop(pc.green(`✅ Commits from ${startCommit} to ${endCommit} reverted`));
}

function showRevertHelp(): void {
	console.log(pc.bold("git revert - Revert commits by creating new commits"));
	console.log("\nUsage:");
	console.log("  git revert <commit>");
	console.log("  git revert <commit1> <commit2> ...");
	console.log("  git revert <commit1>^..<commit2>");
	console.log("\nOptions:");
	console.log("  --no-commit    Apply changes but don't commit");
	console.log("  --edit         Edit commit message before committing");
	console.log("  --no-edit      Skip commit message editor");
	console.log("\nExamples:");
	console.log("  git revert abc123");
	console.log("  git revert --no-commit abc123");
	console.log("  git revert abc123 def456");
	console.log("  git revert HEAD~3..HEAD~1");
}