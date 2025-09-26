import { execa } from "execa";
import { cancel, confirm, intro, isCancel, outro, select, spinner, text } from "@clack/prompts";
import * as pc from "picocolors";
import { branchCommand } from "./branch";

export async function rebaseCommand(args: string[] = []): Promise<void> {
	intro(pc.blue("🔀 Git Rebase Tool"));
	
	const s = spinner();
	
	try {
		// If specific arguments provided, use them directly
		if (args.length > 0) {
			const confirmRebase = await confirm({
				message: `Rebase with arguments: ${args.join(" ")}?`,
				initialValue: false,
			});
			
			if (!confirmRebase || isCancel(confirmRebase)) {
				console.log(pc.gray("Rebase cancelled"));
				return;
			}
			
			s.start("Rebasing");
			await execa("git", ["rebase", ...args]);
			s.stop(pc.green("✅ Rebase completed"));
			return;
		}
		
		// Interactive mode
		const action = await select({
			message: "What would you like to do?",
			options: [
				{ 
					value: "branch", 
					label: "Rebase onto Branch", 
					hint: "Rebase current branch onto another branch" 
				},
				{ 
					value: "interactive", 
					label: "Interactive Rebase", 
					hint: "Interactively edit commits" 
				},
				{ 
					value: "abort", 
					label: "Abort Rebase", 
					hint: "Abort current rebase operation" 
				},
				{ 
					value: "continue", 
					label: "Continue Rebase", 
					hint: "Continue after resolving conflicts" 
				},
				{ 
					value: "skip", 
					label: "Skip Commit", 
					hint: "Skip current commit during rebase" 
				},
			],
		});
		
		if (isCancel(action)) {
			cancel("Rebase cancelled");
			return;
		}
		
		switch (action) {
			case "branch":
				await rebaseOntoBranch();
				break;
			case "interactive":
				await interactiveRebase();
				break;
			case "abort":
				await abortRebase();
				break;
			case "continue":
				await continueRebase();
				break;
			case "skip":
				await skipCommit();
				break;
		}
		
		outro(pc.green("✅ Rebase operation completed"));
	} catch (error) {
		s.stop("❌ Rebase failed");
		throw new Error(error instanceof Error ? error.message : String(error));
	}
}

async function rebaseOntoBranch(): Promise<void> {
	// First, let user select a branch to rebase onto
	await branchCommand(["--list"]);
	
	const targetBranch = await text({
		message: "Enter branch to rebase onto",
		placeholder: "main, develop, feature/new-feature",
		validate(value) {
			if (!value) return "Branch name is required";
		},
	});
	
	if (isCancel(targetBranch)) {
		cancel("Rebase cancelled");
		return;
	}
	
	const confirmRebase = await confirm({
		message: `Rebase current branch onto ${targetBranch}?`,
		initialValue: false,
	});
	
	if (!confirmRebase || isCancel(confirmRebase)) {
		console.log(pc.gray("Rebase cancelled"));
		return;
	}
	
	const s = spinner();
	s.start(`Rebasing onto ${targetBranch}`);
	await execa("git", ["rebase", targetBranch as string]);
	s.stop(pc.green(`✅ Rebased onto ${targetBranch}`));
}

async function interactiveRebase(): Promise<void> {
	const commitRef = await text({
		message: "Enter commit reference to start interactive rebase from",
		placeholder: "HEAD~3, abc123, main",
		validate(value) {
			if (!value) return "Commit reference is required";
		},
	});
	
	if (isCancel(commitRef)) {
		cancel("Rebase cancelled");
		return;
	}
	
	const confirmRebase = await confirm({
		message: `Start interactive rebase from ${commitRef}?`,
		initialValue: false,
	});
	
	if (!confirmRebase || isCancel(confirmRebase)) {
		console.log(pc.gray("Rebase cancelled"));
		return;
	}
	
	const s = spinner();
	s.start(`Starting interactive rebase from ${commitRef}`);
	await execa("git", ["rebase", "-i", commitRef as string]);
	s.stop(pc.green(`✅ Interactive rebase started from ${commitRef}`));
}

async function abortRebase(): Promise<void> {
	const confirmAbort = await confirm({
		message: "Abort current rebase operation? All changes will be discarded.",
		initialValue: false,
	});
	
	if (!confirmAbort || isCancel(confirmAbort)) {
		console.log(pc.gray("Abort cancelled"));
		return;
	}
	
	const s = spinner();
	s.start("Aborting rebase");
	await execa("git", ["rebase", "--abort"]);
	s.stop(pc.green("✅ Rebase aborted"));
}

async function continueRebase(): Promise<void> {
	const confirmContinue = await confirm({
		message: "Continue rebase operation? Make sure all conflicts are resolved.",
		initialValue: false,
	});
	
	if (!confirmContinue || isCancel(confirmContinue)) {
		console.log(pc.gray("Continue cancelled"));
		return;
	}
	
	const s = spinner();
	s.start("Continuing rebase");
	await execa("git", ["rebase", "--continue"]);
	s.stop(pc.green("✅ Rebase continued"));
}

async function skipCommit(): Promise<void> {
	const confirmSkip = await confirm({
		message: "Skip current commit during rebase?",
		initialValue: false,
	});
	
	if (!confirmSkip || isCancel(confirmSkip)) {
		console.log(pc.gray("Skip cancelled"));
		return;
	}
	
	const s = spinner();
	s.start("Skipping commit");
	await execa("git", ["rebase", "--skip"]);
	s.stop(pc.green("✅ Commit skipped"));
}

function showRebaseHelp(): void {
	console.log(pc.bold("git rebase - Reapply commits on top of another base tip"));
	console.log("\nUsage:");
	console.log("  git rebase <branch>");
	console.log("  git rebase -i <commit>");
	console.log("\nOptions:");
	console.log("  -i, --interactive    Interactive rebase");
	console.log("  --abort              Abort current rebase");
	console.log("  --continue           Continue after resolving conflicts");
	console.log("  --skip               Skip current commit");
	console.log("\nExamples:");
	console.log("  git rebase main");
	console.log("  git rebase -i HEAD~3");
	console.log("  git rebase --abort");
	console.log("  git rebase --continue");
}