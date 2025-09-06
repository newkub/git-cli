import {
	cancel,
	confirm,
	intro,
	isCancel,
	outro,
	select,
	spinner,
	text,
} from "@clack/prompts";
import * as pc from "picocolors";
import {
	loadConfig,
	getConfigInfo,
	createConfigFile,
	validateConfig,
} from "../utils/useConfig";

interface ConfigOptions {
	init?: boolean;
	show?: boolean;
	validate?: boolean;
	global?: boolean;
	help?: boolean;
}

function logSuccess(message: string): void {
	console.log(pc.green(`✅ ${message}`));
}

function logError(message: string): void {
	console.log(pc.red(`❌ ${message}`));
}

function logWarning(message: string): void {
	console.log(pc.yellow(`⚠️  ${message}`));
}

function logInfo(message: string): void {
	console.log(pc.cyan(`ℹ️  ${message}`));
}

function showHelp(): void {
	console.log(pc.bold("git config - Manage git configuration"));
	console.log("\nUsage:");
	console.log("  git config [options]");
	console.log("\nOptions:");
	console.log("  -i, --init      Initialize a new config file");
	console.log("  -s, --show      Show current configuration");
	console.log("  -v, --validate  Validate current configuration");
	console.log("  -g, --global    Use global configuration (in home directory)");
	console.log("  -h, --help      Show this help message");
	console.log("\nExamples:");
	console.log("  git config");
	console.log("  git config --init");
	console.log("  git config --show");
	console.log("  git config --validate");
}

function parseArgs(args: string[]): ConfigOptions {
	const options: ConfigOptions = {};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		switch (arg) {
			case "-i":
			case "--init":
				options.init = true;
				break;
			case "-s":
			case "--show":
				options.show = true;
				break;
			case "-v":
			case "--validate":
				options.validate = true;
				break;
			case "-g":
			case "--global":
				options.global = true;
				break;
			case "-h":
			case "--help":
				options.help = true;
				break;
		}
	}

	return options;
}

export async function configCommand(args: string[]): Promise<void> {
	const options = parseArgs(args);
	const s = spinner();

	try {
		if (options.help) {
			showHelp();
			return;
		}

		intro(pc.blue("⚙️  git Configuration Manager"));

		if (options.init) {
			await initConfig(options.global);
			return;
		}

		if (options.show) {
			await showConfig();
			return;
		}

		if (options.validate) {
			await validateCurrentConfig();
			return;
		}

		// Interactive mode
		await interactiveMode();
	} catch (error) {
		s.stop("❌ Operation failed");
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
	}
}

async function initConfig(global = false): Promise<void> {
	const s = spinner();

	try {
		// Check if config already exists
		const configInfo = getConfigInfo();
		if (configInfo.type !== "none") {
			const overwrite = await confirm({
				message: `Configuration already exists at ${configInfo.path}. Overwrite?`,
				initialValue: false,
			});

			if (isCancel(overwrite) || !overwrite) {
				cancel("Initialization cancelled");
				return;
			}
		}

		s.start(`Creating ${global ? "global" : "project"} configuration file`);
		const configPath = createConfigFile(global ? "global" : "project");
		s.stop(pc.green(`✅ Configuration file created`));

		logSuccess(`Configuration created at: ${configPath}`);
		logInfo("Edit the file to customize your git settings");
	} catch (error) {
		s.stop("❌ Failed to create configuration");
		throw error;
	}
}

async function showConfig(): Promise<void> {
	const s = spinner();

	try {
		s.start("Loading configuration");
		const config = await loadConfig();
		const configInfo = getConfigInfo();
		s.stop("✅ Configuration loaded");

		console.log(pc.bold("\n📋 Current Configuration:"));
		console.log(pc.gray("─".repeat(50)));

		if (configInfo.type !== "none") {
			logInfo(`Config source: ${configInfo.path} (${configInfo.type})`);
		} else {
			logInfo("Using default configuration (no config file found)");
		}

		console.log(pc.bold("\n🤖 AI Settings:"));
		console.log(`  Provider: ${config.ai.provider.provider}`);
		console.log(`  Enabled: ${config.ai.enabled}`);
		console.log(`  Model: ${config.ai.provider.model || "default"}`);

		console.log(pc.bold("\n📝 Commit Settings:"));
		console.log(`  Use AI: ${config.commit.useAI}`);
		console.log(`  Conventional Commits: ${config.commit.conventionalCommits}`);
		console.log(`  Max Message Length: ${config.commit.maxMessageLength || 72}`);
		console.log(`  Require Scope: ${config.commit.requireScope || false}`);

		console.log(pc.bold("\n🌿 Branch Settings:"));
		console.log(`  Default Branch: ${config.branch?.defaultBranch || "main"}`);
		console.log(`  Naming Convention: ${config.branch?.namingConvention || "default"}`);
		console.log(`  Auto Delete Merged: ${config.branch?.autoDeleteMerged || false}`);

		console.log(pc.bold("\n🎨 UI Settings:"));
		console.log(`  Theme: ${config.ui?.theme || "default"}`);
		console.log(`  Animations: ${config.ui?.animations || true}`);
		console.log(`  Emojis: ${config.ui?.emojis || true}`);

		if (Object.keys(config.aliases || {}).length > 0) {
			console.log(pc.bold("\n🔧 Aliases:"));
			for (const [alias, command] of Object.entries(config.aliases || {})) {
				console.log(`  ${alias} -> ${command}`);
			}
		}
	} catch (error) {
		s.stop("❌ Failed to load configuration");
		throw error;
	}
}

async function validateCurrentConfig(): Promise<void> {
	const s = spinner();

	try {
		s.start("Validating configuration");
		const config = await loadConfig();
		const validation = validateConfig(config);
		s.stop("✅ Validation completed");

		if (validation.valid) {
			logSuccess("Configuration is valid");
		} else {
			logError("Configuration validation failed:");
			validation.errors.forEach((error: string) => {
				console.log(pc.red(`  • ${error}`));
			});
		}
	} catch (error) {
		s.stop("❌ Validation failed");
		throw error;
	}
}

async function interactiveMode(): Promise<void> {
	const configInfo = getConfigInfo();

	const action = await select({
		message: "What would you like to do?",
		options: [
			{
				value: "show",
				label: "📋 Show current configuration",
				hint: "Display all settings",
			},
			{
				value: "init",
				label: "🆕 Initialize config file",
				hint: "Create a new config file",
			},
			{
				value: "validate",
				label: "✅ Validate configuration",
				hint: "Check for errors",
			},
			{
				value: "info",
				label: "ℹ️  Configuration info",
				hint: "Show config file location and type",
			},
		],
	});

	if (isCancel(action)) {
		cancel("Operation cancelled");
		return;
	}

	switch (action) {
		case "show":
			await showConfig();
			break;
		case "init": {
			const global = await confirm({
				message: "Create global configuration?",
				initialValue: false,
			});

			if (isCancel(global)) {
				cancel("Operation cancelled");
				return;
			}

			await initConfig(global);
			break;
		}
		case "validate":
			await validateCurrentConfig();
			break;
		case "info":
			if (configInfo.type === "none") {
				logWarning("No configuration file found");
				logInfo("Run 'git config --init' to create one");
			} else {
				logSuccess(`Configuration file: ${configInfo.path}`);
				logInfo(`Type: ${configInfo.type}`);
			}
			break;
	}
}
