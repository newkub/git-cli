import { cancel, confirm, isCancel, spinner, text } from "@clack/prompts";
import { execa } from "execa";
import * as pc from "picocolors";

export async function initRepo() {
	const s = spinner();

	try {
		// Check if already in a git repo
		s.start("Checking for existing repository");
		try {
			await execa("git", ["rev-parse", "--git-dir"]);
			console.log(pc.yellow("Already in a git repository"));
			return;
		} catch {
			// Not in a git repo, proceed
		}
		s.stop("✅ No existing repository found");

		// Get directory name
		const dirName = await text({
			message: "Directory name (leave empty for current directory)",
			placeholder: ".",
		});

		if (isCancel(dirName)) {
			cancel("Repository initialization cancelled");
			return;
		}

		// Confirm initialization
		const shouldInit = await confirm({
			message: `Initialize repository in ${dirName || "current directory"}?`,
			initialValue: true,
		});

		if (isCancel(shouldInit) || !shouldInit) {
			cancel("Repository initialization cancelled");
			return;
		}

		// Execute init
		s.start("Initializing repository");
		const initArgs = ["init"];
		if (dirName && dirName !== ".") initArgs.push(dirName);

		const { stdout } = await execa("git", initArgs);
		s.stop(pc.green("✅ Repository initialized successfully"));
		console.log(stdout);
	} catch (error) {
		s.stop("❌ Repository initialization failed");
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
		process.exit(1);
	}
}
