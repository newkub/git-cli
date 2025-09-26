import { execa } from "execa";
import { cancel, confirm, intro, isCancel, outro, select, spinner, text } from "@clack/prompts";
import * as pc from "picocolors";
import { getGitStatusInfo } from "../utils/useGitStatus";

export async function resetCommand(args: string[] = []): Promise<void> {
	intro(pc.blue("🔄 Git Reset Tool"));
	
	const s = spinner();
	
	try {
		// Check if there are uncommitted changes
		s.start("Checking for changes");
		const status = await getGitStatusInfo();
		s.stop("✅ Changes checked");
		
		// If specific arguments provided, use them directly
		if (args.length > 0) {
			const confirmReset = await confirm({
				message: `Reset with arguments: ${args.join(" ")}? This may lose changes!`,
				initialValue: false,
			});
			
			if (!confirmReset || isCancel(confirmReset)) {
				console.log(pc.gray("Reset cancelled"));
				return;
			}
			
			s.start("Resetting");
			await execa("git", ["reset", ...args]);
			s.stop(pc.green("✅ Reset completed"));
			return;
		}
		
		// Interactive mode
		const resetType = await select({
			message: "Select reset type",
			options: [
				{ 
					value: "soft", 
					label: "Soft Reset", 
					hint: "Move HEAD to specified commit, keep staged and unstaged changes" 
				},
				{ 
					value: "mixed", 
					label: "Mixed Reset", 
					hint: "Move HEAD, unstage changes, keep unstaged changes" 
				},
				{ 
					value: "hard", 
					label: "Hard Reset", 
					hint: "Move HEAD, discard all changes (DANGEROUS!)" 
				},
				{ 
					value: "commit", 
					label: "Reset to Commit", 
					hint: "Reset to a specific commit" 
				},
			],
		});
		
		if (isCancel(resetType)) {
			cancel("Reset cancelled");
			return;
		}
		
		switch (resetType) {
			case "soft":
				await performSoftReset();
				break;
			case "mixed":
				await performMixedReset();
				break;
			case "hard":
				await performHardReset();
				break;
			case "commit":
				await performCommitReset();
				break;
		}
		
		outro(pc.green("✅ Reset operation completed"));
	} catch (error) {
		s.stop("❌ Reset failed");
		throw new Error(error instanceof Error ? error.message : String(error));
	}
}

async function performSoftReset(): Promise<void> {
	const commitHash = await text({
		message: "Enter commit hash (or leave empty for HEAD~1)",
		placeholder: "abc123 or HEAD~1",
	});
	
	if (isCancel(commitHash)) {
		cancel("Reset cancelled");
		return;
	}
	
	const target = commitHash && commitHash.toString().trim() ? commitHash.toString().trim() : "HEAD~1";
	
	const confirmReset = await confirm({
		message: `Soft reset to ${target}?`,
		initialValue: true,
	});
	
	if (!confirmReset || isCancel(confirmReset)) {
		console.log(pc.gray("Reset cancelled"));
		return;
	}
	
	const s = spinner();
	s.start(`Soft resetting to ${target}`);
	await execa("git", ["reset", "--soft", target]);
	s.stop(pc.green(`✅ Soft reset to ${target} completed`));
}

async function performMixedReset(): Promise<void> {
	const commitHash = await text({
		message: "Enter commit hash (or leave empty for HEAD~1)",
		placeholder: "abc123 or HEAD~1",
	});
	
	if (isCancel(commitHash)) {
		cancel("Reset cancelled");
		return;
	}
	
	const target = commitHash && commitHash.toString().trim() ? commitHash.toString().trim() : "HEAD~1";
	
	const confirmReset = await confirm({
		message: `Mixed reset to ${target}? This will unstage all changes!`,
		initialValue: false,
	});
	
	if (!confirmReset || isCancel(confirmReset)) {
		console.log(pc.gray("Reset cancelled"));
		return;
	}
	
	const s = spinner();
	s.start(`Mixed resetting to ${target}`);
	await execa("git", ["reset", "--mixed", target]);
	s.stop(pc.green(`✅ Mixed reset to ${target} completed`));
}

async function performHardReset(): Promise<void> {
	const commitHash = await text({
		message: "Enter commit hash (or leave empty for HEAD~1)",
		placeholder: "abc123 or HEAD~1",
	});
	
	if (isCancel(commitHash)) {
		cancel("Reset cancelled");
		return;
	}
	
	const target = commitHash && commitHash.toString().trim() ? commitHash.toString().trim() : "HEAD~1";
	
	const confirmReset = await confirm({
		message: `HARD RESET to ${target}? This will DELETE all uncommitted changes!`,
		initialValue: false,
	});
	
	if (!confirmReset || isCancel(confirmReset)) {
		console.log(pc.gray("Reset cancelled"));
		return;
	}
	
	const s = spinner();
	s.start(`HARD resetting to ${target}`);
	await execa("git", ["reset", "--hard", target]);
	s.stop(pc.green(`✅ HARD reset to ${target} completed`));
}

async function performCommitReset(): Promise<void> {
	const commitHash = await text({
		message: "Enter commit hash to reset to",
		placeholder: "abc123def",
		validate(value) {
			if (!value) return "Commit hash is required";
			if (value.length < 4) return "Commit hash is too short";
		},
	});
	
	if (isCancel(commitHash)) {
		cancel("Reset cancelled");
		return;
	}
	
	const resetType = await select({
		message: "Select reset type for this commit",
		options: [
			{ value: "soft", label: "Soft Reset", hint: "Keep all changes" },
			{ value: "mixed", label: "Mixed Reset", hint: "Unstage changes" },
			{ value: "hard", label: "Hard Reset", hint: "Discard all changes (DANGEROUS!)" },
		],
	});
	
	if (isCancel(resetType)) {
		cancel("Reset cancelled");
		return;
	}
	
	const confirmReset = await confirm({
		message: `Reset to commit ${commitHash} with ${resetType} mode?`,
		initialValue: false,
	});
	
	if (!confirmReset || isCancel(confirmReset)) {
		console.log(pc.gray("Reset cancelled"));
		return;
	}
	
	const s = spinner();
	s.start(`Resetting to commit ${commitHash}`);
	await execa("git", ["reset", `--${resetType}`, commitHash as string]);
	s.stop(pc.green(`✅ Reset to commit ${commitHash} completed`));
}

function showResetHelp(): void {
	console.log(pc.bold("git reset - Reset current HEAD to the specified state"));
	console.log("\nUsage:");
	console.log("  git reset [options] [<commit>]");
	console.log("\nOptions:");
	console.log("  --soft     Reset HEAD to <commit>, keep staged and unstaged changes");
	console.log("  --mixed    Reset HEAD and unstage changes, keep unstaged changes (default)");
	console.log("  --hard     Reset HEAD, unstage and discard all changes");
	console.log("\nExamples:");
	console.log("  git reset");
	console.log("  git reset --soft HEAD~1");
	console.log("  git reset --hard abc123");
	console.log("  git reset --mixed HEAD~2");
}