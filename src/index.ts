import { Command } from "commander";
import * as pc from "picocolors";
import { commitCommand } from "./commands/commit.ts";
import { branchCommand } from "./commands/branch.ts";
import { configCommand } from "./commands/config.ts";
import { initRepo } from "./commands/init.ts";
import { showCommitLog } from "./commands/log.ts";
import { mergeBranch } from "./commands/merge.ts";
import { pullChanges } from "./commands/pull.ts";
import { pushChanges } from "./commands/push.ts";

const program = new Command();

program
	.name("w-git")
	.description("Enhanced Git CLI with AI support")
	.version("1.0.0");

// Commands
program
	.command("commit")
	.description("Create commits with conventional format and AI support")
	.option("-a, --ai", "Use AI to generate commit message (default)", true)
	.option("--no-ai", "Disable AI commit message generation")
	.option("-m, --message <msg>", "Commit message")
	.option("-t, --type <type>", "Commit type (feat, fix, docs, etc.)")
	.option("-s, --scope <scope>", "Commit scope")
	.option("-b, --breaking", "Mark as breaking change")
	.action(async (options) => {
		const args: string[] = [];
		if (options.ai) args.push("--ai");
		if (options.noAi) args.push("--no-ai");
		if (options.message) args.push("--message", options.message);
		if (options.type) args.push("--type", options.type);
		if (options.scope) args.push("--scope", options.scope);
		if (options.breaking) args.push("--breaking");
		await commitCommand(args);
	});

program
	.command("branch")
	.description("Manage git branches - list, switch, create, delete")
	.option("-l, --list", "List all branches")
	.option("-c, --create <name>", "Create a new branch")
	.option("-o, --checkout <name>", "Checkout to branch")
	.option("-d, --delete <name>", "Delete branch")
	.option("-r, --remote", "Include remote branches")
	.action(async (options) => {
		const args: string[] = [];
		if (options.list) args.push("--list");
		if (options.create) args.push("--create", options.create);
		if (options.checkout) args.push("--checkout", options.checkout);
		if (options.delete) args.push("--delete", options.delete);
		if (options.remote) args.push("--remote");
		await branchCommand(args);
	});

program
	.command("config")
	.description("Manage w-git configuration")
	.option("-i, --init", "Initialize a new config file")
	.option("-s, --show", "Show current configuration")
	.option("-v, --validate", "Validate current configuration")
	.option("-g, --global", "Use global configuration")
	.action(async (options) => {
		const args: string[] = [];
		if (options.init) args.push("--init");
		if (options.show) args.push("--show");
		if (options.validate) args.push("--validate");
		if (options.global) args.push("--global");
		await configCommand(args);
	});

program
	.command("init")
	.description("Initialize a new git repository")
	.action(async () => {
		await initRepo();
	});

program
	.command("log")
	.description("View git commit history")
	.action(async () => {
		await showCommitLog();
	});

program
	.command("merge")
	.description("Merge branches")
	.action(async () => {
		await mergeBranch();
	});

program
	.command("pull")
	.description("Pull changes from remote repository")
	.action(async () => {
		await pullChanges();
	});

program
	.command("push")
	.description("Push changes to remote repository")
	.action(async () => {
		await pushChanges();
	});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
	console.error(pc.red("⚠️ Uncaught exception:"));
	console.error(error);
	process.exit(1);
});

// Handle unhandled rejections
process.on("unhandledRejection", (reason) => {
	console.error(pc.red("⚠️ Unhandled rejection:"));
	console.error(reason);
	process.exit(1);
});

// Parse arguments and run
if (import.meta.url === `file://${process.argv[1]}`) {
	program.parse();
}

export { program };
