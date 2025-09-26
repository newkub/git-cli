import * as pc from "picocolors";

interface CommandInfo {
	name: string;
	description: string;
	example?: string;
}

// Commit Operations
const commitCommands: CommandInfo[] = [
	{
		name: "commit",
		description: "Create commits with AI assistance",
		example: "wgit commit"
	},
	{
		name: "reset",
		description: "Reset current HEAD to specified state",
		example: "wgit reset"
	},
	{
		name: "revert",
		description: "Revert commits by creating new commits",
		example: "wgit revert"
	},
	{
		name: "rebase",
		description: "Reapply commits on top of another base tip",
		example: "wgit rebase"
	},
	{
		name: "cherry-pick",
		description: "Apply commit from another branch",
		example: "wgit cherry-pick"
	}
];

// Branch Operations
const branchCommands: CommandInfo[] = [
	{
		name: "branch",
		description: "Manage branches (create, switch, delete)",
		example: "wgit branch"
	},
	{
		name: "merge",
		description: "Merge branches",
		example: "wgit merge"
	}
];

// File Operations
const fileCommands: CommandInfo[] = [
	{
		name: "stage",
		description: "Stage files for commit",
		example: "wgit stage"
	},
	{
		name: "unstage",
		description: "Unstage staged files",
		example: "wgit unstage"
	},
	{
		name: "status",
		description: "Show git repository status",
		example: "wgit status"
	}
];

// Repository Operations
const repoCommands: CommandInfo[] = [
	{
		name: "log",
		description: "Show commit history",
		example: "wgit log"
	},
	{
		name: "remote",
		description: "Manage remote repositories",
		example: "wgit remote"
	},
	{
		name: "submodules",
		description: "Manage git submodules",
		example: "wgit submodules"
	},
	{
		name: "search",
		description: "Search in codebase and history",
		example: "wgit search"
	}
];

const commands: CommandInfo[] = [
	...commitCommands,
	...branchCommands,
	...fileCommands,
	...repoCommands
];

export function showHelp() {
	console.log(pc.bold(pc.blue("\n🚀 WGIT - Interactive Git CLI")));
	console.log(pc.gray("=".repeat(60)));
	
	// Display commands grouped by category
	console.log(pc.cyan("\n📝 Commit Operations:"));
	commitCommands.forEach(cmd => {
		console.log(`  ${pc.bold(pc.green(cmd.name.padEnd(15)))} ${pc.gray(cmd.description)}`);
	});
	
	console.log(pc.cyan("\n🌿 Branch Operations:"));
	branchCommands.forEach(cmd => {
		console.log(`  ${pc.bold(pc.green(cmd.name.padEnd(15)))} ${pc.gray(cmd.description)}`);
	});
	
	console.log(pc.cyan("\n📁 File Operations:"));
	fileCommands.forEach(cmd => {
		console.log(`  ${pc.bold(pc.green(cmd.name.padEnd(15)))} ${pc.gray(cmd.description)}`);
	});
	
	console.log(pc.cyan("\n📦 Repository Operations:"));
	repoCommands.forEach(cmd => {
		console.log(`  ${pc.bold(pc.green(cmd.name.padEnd(15)))} ${pc.gray(cmd.description)}`);
	});

	console.log(pc.gray("\n" + "=".repeat(60)));
	console.log(pc.cyan("Usage examples:"));
	console.log(pc.yellow("  wgit commit                    # Interactive commit with AI"));
	console.log(pc.yellow("  wgit reset                     # Reset current HEAD"));
	console.log(pc.yellow("  wgit revert                    # Revert commits"));
	console.log(pc.yellow("  wgit rebase                    # Reapply commits"));
	console.log(pc.yellow("  wgit branch                    # Manage branches"));
	console.log(pc.yellow("  wgit status                    # View repository status"));
	console.log(pc.yellow("  wgit --help                    # Show this help"));
	console.log(pc.gray("=".repeat(60)));
}

export function showAvailableCommands() {
	console.log(pc.red("❌ Invalid command"));
	
	console.log(pc.cyan("📝 Commit Operations:"));
	commitCommands.forEach(cmd => {
		console.log(`  ${pc.green(cmd.name.padEnd(15))} ${pc.gray(`- ${cmd.description}`)}`);
	});
	
	console.log(pc.cyan("\n🌿 Branch Operations:"));
	branchCommands.forEach(cmd => {
		console.log(`  ${pc.green(cmd.name.padEnd(15))} ${pc.gray(`- ${cmd.description}`)}`);
	});
	
	console.log(pc.cyan("\n📁 File Operations:"));
	fileCommands.forEach(cmd => {
		console.log(`  ${pc.green(cmd.name.padEnd(15))} ${pc.gray(`- ${cmd.description}`)}`);
	});
	
	console.log(pc.cyan("\n📦 Repository Operations:"));
	repoCommands.forEach(cmd => {
		console.log(`  ${pc.green(cmd.name.padEnd(15))} ${pc.gray(`- ${cmd.description}`)}`);
	});
	
	console.log(pc.yellow("\nUse 'wgit --help' for more details"));
}
