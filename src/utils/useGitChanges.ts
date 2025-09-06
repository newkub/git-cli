import { execa } from "execa";
import { spinner } from "@clack/prompts";
import { generateAICommitMessage, executeCommit } from "./useCommitMessage";
import type { KogitConfig } from "../types/config";

export interface GitChangeGroup {
	type: string;
	files: string[];
}

/**
 * Check if there are staged files
 */
export async function getStagedFiles(): Promise<string[]> {
	const { stdout: stagedFiles } = await execa("git", [
		"diff",
		"--cached",
		"--name-only",
	]);
	return stagedFiles.trim().split("\n").filter(Boolean);
}

/**
 * Check git status for all changes
 */
export async function getAllChanges(): Promise<string> {
	const { stdout: status } = await execa("git", ["status", "--porcelain"]);
	return status;
}

/**
 * Check if repository has any changes
 */
export async function hasChanges(): Promise<boolean> {
	const { stdout: status } = await execa("git", ["status", "--porcelain"]);
	return status.trim().length > 0;
}

/**
 * Group changes by commit type based on git status
 */
export function groupChangesByType(statusLines: string[]): GitChangeGroup[] {
	const groups = new Map<string, string[]>();

	for (const line of statusLines) {
		const status = line.substring(0, 2);
		const file = line.substring(3);

		let type = "misc";
		if (status.includes("A")) type = "feat";
		else if (status.includes("M")) type = "fix";
		else if (status.includes("D")) type = "remove";
		else if (status.includes("R")) type = "refactor";

		if (!groups.has(type)) {
			groups.set(type, []);
		}
		groups.get(type)?.push(file);
	}

	return Array.from(groups.entries()).map(([type, files]) => ({ type, files }));
}

/**
 * Stage files for commit
 */
export async function stageFiles(files: string[]): Promise<void> {
	for (const file of files) {
		await execa("git", ["add", file]);
	}
}

/**
 * Process staged files commit with AI
 */
export async function processStagedCommit(config: KogitConfig): Promise<void> {
	const s = spinner();
	try {
		s.start("Generating commit message for staged files");
		const message = await generateAICommitMessage(config);
		await executeCommit(message);
		s.stop("✅ Staged files committed successfully");
	} catch (error) {
		s.stop("❌ Staged commit failed");
		throw error;
	}
}

/**
 * Process changes by groups with AI commits
 */
export async function processGroupedCommits(
	groups: GitChangeGroup[],
	config: KogitConfig,
): Promise<void> {
	const s = spinner();

	for (const group of groups) {
		try {
			s.start(`Processing ${group.type} changes`);

			// Stage files for this group
			await stageFiles(group.files);

			// Generate and execute commit
			const message = await generateAICommitMessage(config);
			await executeCommit(message);

			s.stop(`✅ ${group.type} changes committed`);
		} catch (error) {
			s.stop(`❌ Failed to commit ${group.type} changes`);
			throw error;
		}
	}
}

/**
 * Auto commit all changes intelligently
 */
export async function autoCommitAllChanges(config: KogitConfig): Promise<void> {
	const allChanges = await getAllChanges();

	if (!allChanges.trim()) {
		console.log("ℹ️  No changes to commit");
		return;
	}

	// Stage and commit all changes intelligently
	const statusLines = allChanges.trim().split("\n").filter(Boolean);
	const groups = groupChangesByType(statusLines);

	await processGroupedCommits(groups, config);
}
