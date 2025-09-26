import { confirm, spinner, select, multiselect, isCancel } from "@clack/prompts";
import { execa } from "execa";
import * as pc from "picocolors";
import { getGitStatusInfo } from "../utils/useGitStatus";

export async function cleanCommand() {
	// Ask user what type of clean operation they want to perform
	const cleanType = await select({
		message: "What type of clean operation would you like to perform?",
		options: [
			{ value: "untracked", label: "Clean Untracked Files", hint: "Remove untracked files and directories" },
			{ value: "gc", label: "Garbage Collection", hint: "Cleanup and optimize repository" },
			{ value: "prune", label: "Prune Objects", hint: "Remove unreachable objects" },
			{ value: "fsck", label: "Verify Repository", hint: "Check repository integrity" },
		],
	});
	
	if (isCancel(cleanType)) {
		console.log(pc.gray("Clean cancelled"));
		return;
	}
	
	switch (cleanType) {
		case "untracked":
			await performUntrackedClean();
			break;
		case "gc":
			await performGarbageCollection();
			break;
		case "prune":
			await performPruneObjects();
			break;
		case "fsck":
			await performVerifyRepository();
			break;
	}
}

async function performUntrackedClean() {
	const s = spinner();
	
	try {
		// Get git status to check for untracked files
		s.start("Checking for untracked files");
		const statusInfo = await getGitStatusInfo();
		s.stop();
		
		// Parse untracked files and directories
		const untrackedItems = statusInfo.statusOutput
			.split("\n")
			.filter(line => line.trim() && line.startsWith("??"))
			.map(line => line.substring(3));
		
		if (untrackedItems.length === 0) {
			console.log(pc.green("No untracked files or directories to clean"));
			return;
		}
		
		// Show what would be cleaned
		console.log(pc.yellow(`Found ${untrackedItems.length} untracked item(s):`));
		untrackedItems.slice(0, 15).forEach(item => {
			console.log(`  ${pc.gray("??")} ${item}`);
		});
		
		if (untrackedItems.length > 15) {
			console.log(pc.gray(`  ... and ${untrackedItems.length - 15} more`));
		}
		
		// Ask user what type of clean they want to perform
		const cleanOperation = await select({
			message: "What type of clean operation would you like to perform?",
			options: [
				{ value: "interactive", label: "Interactive", hint: "Select specific files/directories to remove" },
				{ value: "all", label: "Remove All", hint: "Remove all untracked files and directories" },
				{ value: "dry-run", label: "Dry Run", hint: "Show what would be removed without removing" },
			],
		});
		
		if (isCancel(cleanOperation)) {
			console.log(pc.gray("Clean cancelled"));
			return;
		}
		
		switch (cleanOperation) {
			case "interactive":
				await performInteractiveClean(untrackedItems);
				break;
			case "all":
				await performAllClean(untrackedItems);
				break;
			case "dry-run":
				await performDryRunClean();
				break;
		}
	} catch (error) {
		s.stop("❌ Clean failed");
		console.error(pc.red(error instanceof Error ? error.message : String(error)));
	}
}

async function performInteractiveClean(untrackedItems: string[]) {
	// Let user select which items to clean
	const itemsToClean = await multiselect({
		message: "Select files/directories to remove",
		options: untrackedItems.map(item => ({
			value: item,
			label: item,
		})),
		required: false,
	});
	
	if (isCancel(itemsToClean)) {
		console.log(pc.gray("Clean cancelled"));
		return;
	}
	
	if (!itemsToClean || itemsToClean.length === 0) {
		console.log(pc.gray("No items selected for cleaning"));
		return;
	}
	
	// Confirm with user
	const shouldClean = await confirm({
		message: `Remove ${itemsToClean.length} selected item(s)? This cannot be undone!`,
		initialValue: false,
	});
	
	if (!shouldClean) {
		console.log(pc.gray("Clean cancelled"));
		return;
	}
	
	// Perform clean operation on selected items
	const s = spinner();
	s.start("Cleaning selected files");
	
	try {
		// For each selected item, we need to run git rm or handle differently
		// For simplicity, we'll use git clean with specific paths
		const args = ["clean", "-f"].concat(itemsToClean as string[]);
		await execa("git", args);
		s.stop(pc.green(`✅ Successfully removed ${itemsToClean.length} item(s)`));
	} catch (error) {
		s.stop("❌ Clean failed");
		console.error(pc.red(error instanceof Error ? error.message : String(error)));
	}
}

async function performAllClean(untrackedItems: string[]) {
	// Confirm with user
	const shouldClean = await confirm({
		message: `Remove all ${untrackedItems.length} untracked item(s)? This cannot be undone!`,
		initialValue: false,
	});
	
	if (!shouldClean) {
		console.log(pc.gray("Clean cancelled"));
		return;
	}
	
	// Perform clean operation
	const s = spinner();
	s.start("Cleaning all untracked files");
	
	try {
		await execa("git", ["clean", "-fd"]);
		s.stop(pc.green(`✅ Successfully removed ${untrackedItems.length} untracked item(s)`));
	} catch (error) {
		s.stop("❌ Clean failed");
		console.error(pc.red(error instanceof Error ? error.message : String(error)));
	}
}

async function performDryRunClean() {
	// Perform dry run clean operation
	const s = spinner();
	s.start("Performing dry run");
	
	try {
		const { stdout } = await execa("git", ["clean", "-n"]);
		s.stop("✅ Dry run completed");
		
		if (stdout.trim()) {
			console.log(pc.blue("The following items would be removed:"));
			console.log(stdout);
		} else {
			console.log(pc.green("No items would be removed"));
		}
		
		const shouldProceed = await confirm({
			message: "Would you like to proceed with the actual clean operation?",
			initialValue: false,
		});
		
		if (shouldProceed) {
			// Get git status again for fresh data
			const statusInfo = await getGitStatusInfo();
			const untrackedItems = statusInfo.statusOutput
				.split("\n")
				.filter(line => line.trim() && line.startsWith("??"))
				.map(line => line.substring(3));
			await performAllClean(untrackedItems);
		}
	} catch (error) {
		s.stop("❌ Dry run failed");
		console.error(pc.red(error instanceof Error ? error.message : String(error)));
	}
}

async function performGarbageCollection() {
	const s = spinner();
	
	try {
		// Confirm with user
		const shouldGc = await confirm({
			message: "Perform garbage collection? This will clean up unnecessary files and optimize the repository.",
			initialValue: false,
		});
		
		if (!shouldGc) {
			console.log(pc.gray("Garbage collection cancelled"));
			return;
		}
		
		s.start("Performing garbage collection");
		const { stdout } = await execa("git", ["gc"]);
		s.stop(pc.green("✅ Garbage collection completed"));
		
		if (stdout.trim()) {
			console.log(stdout);
		}
	} catch (error) {
		s.stop("❌ Garbage collection failed");
		console.error(pc.red(error instanceof Error ? error.message : String(error)));
	}
}

async function performPruneObjects() {
	const s = spinner();
	
	try {
		// Confirm with user
		const shouldPrune = await confirm({
			message: "Prune unreachable objects? This will remove objects that are no longer referenced.",
			initialValue: false,
		});
		
		if (!shouldPrune) {
			console.log(pc.gray("Prune cancelled"));
			return;
		}
		
		s.start("Pruning unreachable objects");
		const { stdout } = await execa("git", ["prune"]);
		s.stop(pc.green("✅ Object pruning completed"));
		
		if (stdout.trim()) {
			console.log(stdout);
		}
	} catch (error) {
		s.stop("❌ Prune failed");
		console.error(pc.red(error instanceof Error ? error.message : String(error)));
	}
}

async function performVerifyRepository() {
	const s = spinner();
	
	try {
		s.start("Verifying repository integrity");
		const { stdout } = await execa("git", ["fsck"]);
		s.stop("✅ Repository verification completed");
		
		if (stdout.trim()) {
			console.log(pc.blue("Repository check results:"));
			console.log(stdout);
		} else {
			console.log(pc.green("Repository is clean and consistent"));
		}
	} catch (error) {
		s.stop("❌ Repository verification failed");
		console.error(pc.red(error instanceof Error ? error.message : String(error)));
	}
}