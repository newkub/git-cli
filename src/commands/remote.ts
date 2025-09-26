import { isCancel, select } from "@clack/prompts";
import { execa } from "execa";
import * as pc from "picocolors";
import {
	pullChanges,
	pushChanges,
	syncChanges,
	fetchChanges,
	addRemote,
	removeRemote,
	renameRemote,
} from "../utils/useRemote";

export async function remoteCommand() {
	// Display list of remotes at the top
	try {
		const { stdout: remotes } = await execa("git", ["remote", "-v"]);
		
		if (remotes.trim()) {
			console.log(pc.blue("📋 Remote Repositories:"));
			console.log(remotes);
			console.log(""); // Add spacing
		} else {
			console.log(pc.yellow("No remotes configured\n"));
		}
	} catch (error) {
		console.log(pc.red("Failed to get remotes:"), error instanceof Error ? error.message : String(error));
		console.log(""); // Add spacing
	}

	const action = await select({
		message: "Remote repository actions",
		options: [
			{
				value: "fetch",
				label: "📡 Fetch",
				hint: "Fetch changes from remote without merging",
			},
			{ value: "pull", label: "⬇️  Pull", hint: "Fetch and merge from remote" },
			{ value: "push", label: "⬆️  Push", hint: "Push commits to remote" },
			{ value: "sync", label: "🔄 Sync", hint: "Pull then push" },
			{
				value: "add",
				label: "➕ Add Remote",
				hint: "Add new remote repository",
			},
			{
				value: "remove",
				label: "➖ Remove Remote",
				hint: "Remove existing remote",
			},
			{
				value: "rename",
				label: "✏️  Rename Remote",
				hint: "Rename existing remote",
			},
		],
	});

	if (isCancel(action)) {
		return;
	}

	switch (action) {
		case "fetch":
			await fetchChanges();
			break;
		case "pull":
			await pullChanges();
			break;
		case "push":
			await pushChanges();
			break;
		case "sync":
			await syncChanges();
			break;
		case "add":
			await addRemote();
			break;
		case "remove":
			await removeRemote();
			break;
		case "rename":
			await renameRemote();
			break;
	}
}