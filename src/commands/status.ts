import { spinner } from "@clack/prompts";
import { execa } from "execa";
import * as pc from "picocolors";

export async function showGitStatus() {
	const s = spinner();

	try {
		// Get detailed status
		s.start("Checking repository status");
		const { stdout: status } = await execa("git", ["status", "-sb"]);
		s.stop("✅ Status checked");

		if (!status.trim()) {
			console.log(pc.yellow("Repository is clean"));
			return;
		}

		// Parse and format status
		const [branchLine, ...fileLines] = status.split("\n");

		// Show branch information
		console.log(pc.bold("Branch:"));
		console.log(`  ${branchLine.replace(/##\s+/, "")}`);

		// Show file status if any
		if (fileLines.length > 0) {
			console.log(pc.bold("\nChanges:"));
			fileLines.forEach((line) => {
				if (line.startsWith("??")) {
					console.log(
						`  ${pc.green("+")} ${pc.gray(line.substring(3))} (untracked)`,
					);
				} else if (line.startsWith(" M")) {
					console.log(
						`  ${pc.yellow("~")} ${pc.gray(line.substring(3))} (modified)`,
					);
				} else if (line.startsWith("D ")) {
					console.log(
						`  ${pc.red("-")} ${pc.gray(line.substring(3))} (deleted)`,
					);
				} else if (line.startsWith("A ")) {
					console.log(
						`  ${pc.green("+")} ${pc.gray(line.substring(3))} (added)`,
					);
				} else {
					console.log(`  ${pc.gray(line)}`);
				}
			});
		}
	} catch (error) {
		s.stop("❌ Status check failed");
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
		process.exit(1);
	}
}
