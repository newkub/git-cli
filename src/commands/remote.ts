import { isCancel, select } from "@clack/prompts";
import {
	pullChanges,
	pushChanges,
	syncChanges,
	fetchChanges,
	addRemote,
	removeRemote,
	renameRemote,
	listRemotes,
} from "../utils/useRemote";

export async function remoteCommand() {
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
			{ value: "list", label: "📋 List Remotes", hint: "Show all remotes" },
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
		case "list":
			await listRemotes();
			break;
	}
}
