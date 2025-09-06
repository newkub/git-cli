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

export async function manageSubmodules() {
	const s = spinner();

	try {
		// Check if there are existing submodules
		s.start("Checking for submodules");
		const { stdout: submodules } = await execa("git", ["submodule", "status"]);
		s.stop("✅ Submodules checked");

		if (!submodules.trim()) {
			console.log(pc.yellow("No submodules found"));

			const shouldAdd = await confirm({
				message: "Would you like to add a submodule?",
				initialValue: false,
			});

			if (shouldAdd && !isCancel(shouldAdd)) {
				const repoUrl = await text({
					message: "Repository URL",
					placeholder: "https://github.com/user/repo.git",
				});

				if (repoUrl && !isCancel(repoUrl)) {
					s.start("Adding submodule");
					await execa("git", ["submodule", "add", repoUrl]);
					s.stop(pc.green("✅ Submodule added successfully"));
				}
			}
			return;
		}

		// Show existing submodules
		const submoduleList = submodules
			.split("\n")
			.filter((s) => s.trim())
			.map((s) => s.trim().split(" ")[1]); // Extract submodule paths

		// Select action
		const action = await select({
			message: "Submodule action",
			options: [
				{
					value: "update",
					label: "Update all submodules",
					hint: "git submodule update --init --recursive",
				},
				{ value: "add", label: "Add new submodule", hint: "git submodule add" },
				{
					value: "specific",
					label: "Update specific submodule",
					hint: "Select from list",
				},
			],
		});

		if (isCancel(action)) {
			cancel("Submodule operation cancelled");
			return;
		}

		// Handle selected action
		switch (action) {
			case "update":
				s.start("Updating all submodules");
				await execa("git", ["submodule", "update", "--init", "--recursive"]);
				s.stop(pc.green("✅ All submodules updated"));
				break;

			case "add": {
				const repoUrl = await text({
					message: "Repository URL",
					placeholder: "https://github.com/user/repo.git",
				});

				if (repoUrl && !isCancel(repoUrl)) {
					s.start("Adding submodule");
					await execa("git", ["submodule", "add", repoUrl]);
					s.stop(pc.green("✅ Submodule added successfully"));
				}
				break;
			}

			case "specific": {
				const selected = await select({
					message: "Select submodule to update",
					options: submoduleList.map((path) => ({ value: path, label: path })),
				});

				if (selected && !isCancel(selected)) {
					s.start(`Updating ${selected}`);
					await execa("git", ["submodule", "update", "--init", selected]);
					s.stop(pc.green(`✅ ${selected} updated successfully`));
				}
				break;
			}
		}
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : String(error));
	}
}
