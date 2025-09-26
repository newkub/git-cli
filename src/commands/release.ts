import { text, select, confirm, spinner, isCancel, cancel } from "@clack/prompts";
import { execa } from "execa";
import * as pc from "picocolors";

export async function releaseCommand(args: string[] = []) {
	const s = spinner();
	const isDryRun = args.includes("--dry-run") || args.includes("-d");
	const isRollback = args.includes("--rollback") || args.includes("-r");
	
	if (isRollback) {
		return rollbackRelease();
	}
	
	try {
		// Get current branch
		const { stdout: branch } = await execa("git", ["branch", "--show-current"]);
		
		// Get latest tag
		const { stdout: latestTag } = await execa("git", ["describe", "--tags", "--abbrev=0"]).catch(() => ({ stdout: "v0.0.0" }));
		
		console.log(pc.blue(`Current branch: ${branch}`));
		console.log(pc.blue(`Latest tag: ${latestTag}`));
		
		// Check if repository is clean
		const { stdout: status } = await execa("git", ["status", "--porcelain"]);
		if (status.trim() !== "") {
			console.log(pc.red("Repository is not clean. Please commit or stash changes before creating a release."));
			console.log(pc.yellow("Uncommitted changes:"));
			console.log(status);
			return;
		}
		
		// Select version bump type
		const bumpType = await select({
			message: "Select version bump type",
			options: [
				{ value: "patch", label: "Patch (0.0.1 → 0.0.2)" },
				{ value: "minor", label: "Minor (0.0.1 → 0.1.0)" },
				{ value: "major", label: "Major (0.0.1 → 1.0.0)" },
				{ value: "pre", label: "Pre-release (alpha, beta, rc)" },
				{ value: "custom", label: "Custom version" },
			],
		});
		
		// Select tag type
		const tagType = await select({
			message: "Select tag type",
			options: [
				{ value: "annotated", label: "Annotated tag (recommended)" },
				{ value: "lightweight", label: "Lightweight tag" },
			],
			initialValue: "annotated",
		});
		
		if (isCancel(tagType)) {
			cancel("Release cancelled");
			return;
		}
		
		if (isCancel(bumpType)) {
			cancel("Release cancelled");
			return;
		}
		
		let newVersion: string;
		
		if (bumpType === "custom") {
			const customVersion = await text({
				message: "Enter new version",
				placeholder: "v1.2.3",
				validate: (value) => {
					if (!value) return "Version is required";
					if (!value.match(/^v?\d+\.\d+\.\d+/)) return "Invalid version format";
				},
			});
			
			if (isCancel(customVersion)) {
				cancel("Release cancelled");
				return;
			}
			
			newVersion = customVersion.startsWith("v") ? customVersion : `v${customVersion}`;
		} else if (bumpType === "pre") {
			// Handle pre-release versions
			const versionMatch = latestTag.match(/v?(\d+)\.(\d+)\.(\d+)(?:-([a-z]+)\.(\d+))?/);
			if (!versionMatch) {
				console.log(pc.red("Could not parse current version"));
				return;
			}
			
			let major = parseInt(versionMatch[1]);
			let minor = parseInt(versionMatch[2]);
			let patch = parseInt(versionMatch[3]);
			const preType = versionMatch[4] || "alpha";
			let preNumber = parseInt(versionMatch[5]) || 0;
			
			// Ask for pre-release type
			const preReleaseType = await select({
				message: "Select pre-release type",
				options: [
					{ value: "alpha", label: "Alpha" },
					{ value: "beta", label: "Beta" },
					{ value: "rc", label: "Release Candidate" },
				],
				initialValue: preType,
			});
			
			if (isCancel(preReleaseType)) {
				cancel("Release cancelled");
				return;
			}
			
			// Increment pre-release number or bump patch if changing type
			if (preReleaseType === preType) {
				preNumber++;
			} else {
				preNumber = 1;
				patch++;
			}
			
			newVersion = `v${major}.${minor}.${patch}-${preReleaseType}.${preNumber}`;
		} else {
			// Parse current version and bump
			const versionMatch = latestTag.match(/v?(\d+)\.(\d+)\.(\d+)/);
			if (!versionMatch) {
				console.log(pc.red("Could not parse current version"));
				return;
			}
			
			let major = parseInt(versionMatch[1]);
			let minor = parseInt(versionMatch[2]);
			let patch = parseInt(versionMatch[3]);
			
			switch (bumpType) {
				case "major":
					major++;
					minor = 0;
					patch = 0;
					break;
				case "minor":
					minor++;
					patch = 0;
					break;
				case "patch":
					patch++;
					break;
			}
			
			newVersion = `v${major}.${minor}.${patch}`;
		}
		
		// Option to create release branch
		const createBranch = await confirm({
			message: "Create and switch to a release branch?",
			initialValue: false,
		});
		
		if (createBranch) {
			try {
				const branchName = `release/${newVersion}`;
				await execa("git", ["checkout", "-b", branchName]);
				console.log(pc.green(`✅ Created and switched to release branch: ${branchName}`));
			} catch (error) {
				console.log(pc.red("Failed to create release branch:"), error);
			}
		}
		
		// Confirm release
		const shouldRelease = await confirm({
			message: `Create release ${newVersion}?` + (isDryRun ? " (DRY RUN MODE)" : ""),
			initialValue: true,
		});
		
		if (!shouldRelease) {
			console.log(pc.gray("Release cancelled"));
			return;
		}
		
		if (isDryRun) {
			console.log(pc.green(`\n[Dry Run] Would create release tag: ${newVersion}`));
			console.log(pc.gray("[Dry Run] Release creation skipped due to --dry-run flag"));
			return;
		}
		
		// Create and push tag
		s.start("Creating release tag");
		
		if (tagType === "lightweight") {
			await execa("git", ["tag", newVersion]);
		} else {
			await execa("git", ["tag", "-a", newVersion, "-m", `Release ${newVersion}`]);
		}
		
		s.stop(pc.green(`✅ Tag ${newVersion} created`));
		
		// Generate changelog
		const generateChangelog = await confirm({
			message: "Generate changelog for this release?",
			initialValue: true,
		});
		
		if (generateChangelog) {
			try {
				s.start("Generating changelog");
				
				// Get commits since last tag
				const { stdout: commits } = await execa("git", [
					"log",
					`--pretty=format:- %s (%an)`,
					`${latestTag}..HEAD`
				]);
				
				if (commits.trim()) {
					console.log(pc.blue("\n📝 Changelog:"));
					console.log(commits);
				} else {
					console.log(pc.yellow("\nNo changes since last release"));
				}
				
				s.stop(pc.green("✅ Changelog generated"));
			} catch (error) {
				console.log(pc.red("Failed to generate changelog:"), error);
			}
		}
		
		const shouldPush = await confirm({
			message: "Push tag to remote?",
			initialValue: true,
		});
		
		if (shouldPush) {
			s.start("Pushing tag to remote");
			await execa("git", ["push", "origin", newVersion]);
			s.stop(pc.green(`✅ Tag ${newVersion} pushed to remote`));
		}
		
		console.log(pc.green(`\n🎉 Release ${newVersion} created successfully!`));
		
		// Offer rollback option
		const offerRollback = await confirm({
			message: "Would you like to keep the rollback option for this release?",
			initialValue: true,
		});
		
		if (offerRollback) {
			console.log(pc.gray(`\nTo rollback this release, run: git tag -d ${newVersion} && git push --delete origin ${newVersion}`));
		}
		
		// Push release branch if created
		if (createBranch) {
			const pushBranch = await confirm({
				message: "Push release branch to remote?",
				initialValue: true,
			});
			
			if (pushBranch) {
				try {
					const branchName = `release/${newVersion}`;
					s.start(`Pushing branch ${branchName}`);
					await execa("git", ["push", "origin", branchName, "--set-upstream"]);
					s.stop(pc.green(`✅ Branch ${branchName} pushed to remote`));
				} catch (error) {
					s.stop(pc.red("❌ Failed to push branch"));
					console.log(pc.red("Error:"), error);
				}
			}
		}
	} catch (error) {
		s.stop("❌ Release failed");
		console.error(pc.red(error instanceof Error ? error.message : String(error)));
	}
}

async function rollbackRelease() {
	const s = spinner();
	
	try {
		// Get list of tags
		const { stdout: tags } = await execa("git", ["tag", "--sort=-v:refname"]);
		const tagList = tags.trim().split("\n").filter(Boolean);
		
		if (tagList.length === 0) {
			console.log(pc.yellow("No tags found in this repository"));
			return;
		}
		
		// Select tag to rollback
		const tagToRollback = await select({
			message: "Select tag to rollback",
			options: tagList.slice(0, 10).map(tag => ({
				value: tag,
				label: tag
			}))
		});
		
		if (isCancel(tagToRollback)) {
			cancel("Rollback cancelled");
			return;
		}
		
		// Confirm rollback
		const confirmRollback = await confirm({
			message: `Are you sure you want to rollback tag ${tagToRollback}? This will delete the tag locally and remotely.`,
			initialValue: false
		});
		
		if (!confirmRollback) {
			console.log(pc.gray("Rollback cancelled"));
			return;
		}
		
		// Delete local tag
		s.start(`Deleting local tag ${tagToRollback}`);
		await execa("git", ["tag", "-d", tagToRollback]);
		s.stop(pc.green(`✅ Local tag ${tagToRollback} deleted`));
		
		// Delete remote tag
		const shouldDeleteRemote = await confirm({
			message: "Also delete remote tag?",
			initialValue: true
		});
		
		if (shouldDeleteRemote) {
			s.start(`Deleting remote tag ${tagToRollback}`);
			await execa("git", ["push", "origin", "--delete", tagToRollback]);
			s.stop(pc.green(`✅ Remote tag ${tagToRollback} deleted`));
		}
		
		console.log(pc.green(`\n🎉 Tag ${tagToRollback} rolled back successfully!`));
	} catch (error) {
		s.stop("❌ Rollback failed");
		console.error(pc.red(error instanceof Error ? error.message : String(error)));
	}
}