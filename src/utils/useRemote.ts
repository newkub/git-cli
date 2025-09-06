import {
	cancel,
	confirm,
	isCancel,
	select,
	spinner,
	text,
} from "@clack/prompts";
import { execa } from "execa";
import * as pc from "picocolors";

export interface RemoteInfo {
	name: string;
	url: string;
}

/**
 * Get current remote name
 */
export async function getCurrentRemote(): Promise<string> {
	const { stdout: remote } = await execa("git", ["remote"]);
	return remote.trim();
}

/**
 * Get current branch name
 */
export async function getCurrentBranch(): Promise<string> {
	const { stdout: branch } = await execa("git", ["branch", "--show-current"]);
	return branch.trim();
}

/**
 * Get all remotes with their URLs
 */
export async function getAllRemotes(): Promise<RemoteInfo[]> {
	const { stdout: remotes } = await execa("git", ["remote", "-v"]);
	if (!remotes.trim()) return [];

	return remotes
		.split("\n")
		.filter(Boolean)
		.map((line) => {
			const [name, url] = line.split("\t");
			return { name, url: url.replace(" (fetch)", "").replace(" (push)", "") };
		})
		.filter(
			(remote, index, arr) =>
				arr.findIndex((r) => r.name === remote.name) === index,
		);
}

/**
 * Pull changes from remote
 */
export async function pullChanges(): Promise<void> {
	const s = spinner();

	try {
		s.start("Checking remote");
		const remote = await getCurrentRemote();
		s.stop();

		if (!remote) {
			console.log(pc.yellow("No remote repository configured"));
			return;
		}

		s.start("Getting current branch");
		const branch = await getCurrentBranch();
		s.stop();

		const shouldPull = await confirm({
			message: `Pull changes for ${branch} from ${remote}?`,
			initialValue: true,
		});

		if (isCancel(shouldPull) || !shouldPull) {
			return;
		}

		s.start(`Pulling changes for ${branch}`);
		const { stdout } = await execa("git", ["pull", remote, branch]);
		s.stop(pc.green(`✅ Successfully pulled changes for ${branch}`));
		console.log(stdout);
	} catch (error) {
		s.stop("❌ Pull failed");
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
	}
}

/**
 * Push changes to remote
 */
export async function pushChanges(): Promise<void> {
	const s = spinner();

	try {
		s.start("Checking remote");
		const remote = await getCurrentRemote();
		s.stop();

		if (!remote) {
			console.log(pc.yellow("No remote repository configured"));
			return;
		}

		s.start("Getting current branch");
		const branch = await getCurrentBranch();
		s.stop();

		const shouldPush = await confirm({
			message: `Push ${branch} to ${remote}?`,
			initialValue: true,
		});

		if (isCancel(shouldPush) || !shouldPush) {
			return;
		}

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
	}
}

/**
 * Sync changes (pull then push)
 */
export async function syncChanges(): Promise<void> {
	const s = spinner();

	try {
		s.start("Syncing with remote");
		await pullChanges();
		await pushChanges();
		s.stop(pc.green("✅ Sync completed"));
	} catch (error) {
		s.stop("❌ Sync failed");
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
	}
}

/**
 * Add a new remote
 */
export async function addRemote(): Promise<void> {
	const remoteName = await text({
		message: "Remote name",
		placeholder: "origin",
	});

	if (isCancel(remoteName)) {
		return;
	}

	const remoteUrl = await text({
		message: "Remote URL",
		placeholder: "https://github.com/user/repo.git",
	});

	if (isCancel(remoteUrl)) {
		return;
	}

	const s = spinner();
	try {
		s.start(`Adding remote ${remoteName}`);
		await execa("git", [
			"remote",
			"add",
			remoteName as string,
			remoteUrl as string,
		]);
		s.stop(pc.green(`✅ Added remote ${remoteName}`));
	} catch (error) {
		s.stop("❌ Failed to add remote");
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
	}
}

/**
 * Remove an existing remote
 */
export async function removeRemote(): Promise<void> {
	const s = spinner();

	try {
		s.start("Getting remotes");
		const remotes = await getAllRemotes();
		s.stop();

		if (remotes.length === 0) {
			console.log(pc.yellow("No remotes configured"));
			return;
		}

		const remoteToRemove = await select({
			message: "Select remote to remove",
			options: remotes.map((remote) => ({
				value: remote.name,
				label: remote.name,
			})),
		});

		if (isCancel(remoteToRemove)) {
			return;
		}

		const confirmRemove = await confirm({
			message: `Remove remote ${remoteToRemove}?`,
			initialValue: false,
		});

		if (isCancel(confirmRemove) || !confirmRemove) {
			return;
		}

		s.start(`Removing remote ${remoteToRemove}`);
		await execa("git", ["remote", "remove", remoteToRemove as string]);
		s.stop(pc.green(`✅ Removed remote ${remoteToRemove}`));
	} catch (error) {
		s.stop("❌ Failed to remove remote");
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
	}
}

/**
 * Rename an existing remote
 */
export async function renameRemote(): Promise<void> {
	const s = spinner();

	try {
		s.start("Getting remotes");
		const remotes = await getAllRemotes();
		s.stop();

		if (remotes.length === 0) {
			console.log(pc.yellow("No remotes configured"));
			return;
		}

		const remoteToRename = await select({
			message: "Select remote to rename",
			options: remotes.map((remote) => ({
				value: remote.name,
				label: remote.name,
			})),
		});

		if (isCancel(remoteToRename)) {
			return;
		}

		const newName = await text({
			message: "New remote name",
			placeholder: "new-origin",
		});

		if (isCancel(newName)) {
			return;
		}

		s.start(`Renaming remote ${remoteToRename} to ${newName}`);
		await execa("git", [
			"remote",
			"rename",
			remoteToRename as string,
			newName as string,
		]);
		s.stop(pc.green(`✅ Renamed remote ${remoteToRename} to ${newName}`));
	} catch (error) {
		s.stop("❌ Failed to rename remote");
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
	}
}

/**
 * Fetch changes from remote
 */
export async function fetchChanges(): Promise<void> {
	const s = spinner();

	try {
		s.start("Checking remote");
		const remote = await getCurrentRemote();
		s.stop();

		if (!remote) {
			console.log(pc.yellow("No remote repository configured"));
			return;
		}

		const shouldFetch = await confirm({
			message: `Fetch changes from ${remote}?`,
			initialValue: true,
		});

		if (isCancel(shouldFetch) || !shouldFetch) {
			return;
		}

		s.start(`Fetching changes from ${remote}`);
		const { stdout } = await execa("git", ["fetch", remote]);
		s.stop(pc.green(`✅ Successfully fetched changes from ${remote}`));

		if (stdout.trim()) {
			console.log(stdout);
		} else {
			console.log(pc.blue("📡 Remote fetch completed - no new changes"));
		}
	} catch (error) {
		s.stop("❌ Fetch failed");
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
	}
}

/**
 * List all remotes
 */
export async function listRemotes(): Promise<void> {
	const s = spinner();

	try {
		s.start("Getting remotes");
		const { stdout: remotes } = await execa("git", ["remote", "-v"]);
		s.stop();

		if (!remotes.trim()) {
			console.log(pc.yellow("No remotes configured"));
			return;
		}

		console.log(pc.blue("\n📋 Remote Repositories:"));
		console.log(remotes);
	} catch (error) {
		s.stop("❌ Failed to list remotes");
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
	}
}
