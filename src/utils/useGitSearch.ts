import { execa } from "execa";
import {
	select,
	text,
	multiselect,
	confirm,
	isCancel,
	spinner,
} from "@clack/prompts";
import pc from "picocolors";

export interface GitSearchResult {
	file: string;
	line: number;
	content: string;
	match: string;
}

export interface GitSearchOptions {
	ignoreCase?: boolean;
	wholeWord?: boolean;
	invertMatch?: boolean;
	showLineNumbers?: boolean;
	showContext?: number;
	filePattern?: string;
	excludePattern?: string;
}

/**
 * Parse git grep output into structured results
 */
export function parseGitGrepOutput(output: string): GitSearchResult[] {
	if (!output.trim()) return [];

	const results: GitSearchResult[] = [];
	const lines = output.split("\n");

	for (const line of lines) {
		if (!line.trim()) continue;

		// Parse format: file:line:content
		const match = line.match(/^([^:]+):(\d+):(.*)$/);
		if (match) {
			const [, file, lineNum, content] = match;
			results.push({
				file,
				line: parseInt(lineNum, 10),
				content: content.trim(),
				match: content.trim(),
			});
		}
	}

	return results;
}

/**
 * Display search results in a formatted way
 */
export function displaySearchResults(
	results: GitSearchResult[],
	searchTerm: string,
): void {
	if (results.length === 0) {
		console.log(pc.yellow("\n❌ No matches found"));
		return;
	}

	console.log(
		pc.bold(`\n🔍 Found ${results.length} matches for "${searchTerm}":`),
	);

	// Group results by file
	const resultsByFile: Record<string, GitSearchResult[]> = {};
	for (const result of results) {
		if (!resultsByFile[result.file]) {
			resultsByFile[result.file] = [];
		}
		resultsByFile[result.file].push(result);
	}

	// Display grouped results
	for (const [file, fileResults] of Object.entries(resultsByFile)) {
		console.log(
			`\n  ${pc.blue("📄")} ${pc.bold(file)} ${pc.gray(`(${fileResults.length} matches)`)}`,
		);

		for (const result of fileResults) {
			const lineNumber = pc.gray(`${result.line}:`);
			const content = highlightSearchTerm(result.content, searchTerm);
			console.log(`    ${lineNumber} ${content}`);
		}
	}
}

/**
 * Highlight search term in content
 */
function highlightSearchTerm(content: string, searchTerm: string): string {
	if (!searchTerm) return content;

	const regex = new RegExp(`(${searchTerm})`, "gi");
	return content.replace(regex, pc.yellow("$1"));
}

/**
 * Get search options from user
 */
export async function getSearchOptions(): Promise<GitSearchOptions | null> {
	const options = await multiselect({
		message: "Search options (optional)",
		options: [
			{
				value: "ignoreCase",
				label: "Ignore case (-i)",
				hint: "Case insensitive search",
			},
			{
				value: "wholeWord",
				label: "Whole words (-w)",
				hint: "Match whole words only",
			},
			{
				value: "invertMatch",
				label: "Invert match (-v)",
				hint: "Show lines that do NOT match",
			},
			{
				value: "showLineNumbers",
				label: "Show line numbers (-n)",
				hint: "Display line numbers (default)",
			},
		],
		required: false,
	});

	if (isCancel(options)) {
		return null;
	}

	const searchOptions: GitSearchOptions = {};
	const selectedOptions = options as string[];

	if (selectedOptions.includes("ignoreCase")) {
		searchOptions.ignoreCase = true;
	}
	if (selectedOptions.includes("wholeWord")) {
		searchOptions.wholeWord = true;
	}
	if (selectedOptions.includes("invertMatch")) {
		searchOptions.invertMatch = true;
	}
	if (selectedOptions.includes("showLineNumbers")) {
		searchOptions.showLineNumbers = true;
	}

	// Ask for context lines
	const contextLines = await text({
		message: "Context lines (optional)",
		placeholder: "0",
		validate: (value) => {
			if (value && Number.isNaN(Number(value))) {
				return "Please enter a valid number";
			}
		},
	});

	if (!isCancel(contextLines) && contextLines) {
		searchOptions.showContext = parseInt(contextLines as string, 10);
	}

	// Ask for file pattern
	const filePattern = await text({
		message: "File pattern (optional)",
		placeholder: "*.ts, *.js, etc.",
	});

	if (!isCancel(filePattern) && filePattern) {
		searchOptions.filePattern = filePattern as string;
	}

	return searchOptions;
}

/**
 * Build git grep command arguments
 */
export function buildGrepCommand(
	searchTerm: string,
	options: GitSearchOptions = {},
): string[] {
	const args = ["grep"];

	// Add line numbers by default
	args.push("-n");

	if (options.ignoreCase) {
		args.push("-i");
	}

	if (options.wholeWord) {
		args.push("-w");
	}

	if (options.invertMatch) {
		args.push("-v");
	}

	if (options.showContext && options.showContext > 0) {
		args.push(`-C${options.showContext}`);
	}

	// Add search term
	args.push(searchTerm);

	// Add file pattern if specified
	if (options.filePattern) {
		args.push("--", options.filePattern);
	}

	return args;
}

/**
 * Execute git grep search
 */
export async function executeGitGrep(
	searchTerm: string,
	options: GitSearchOptions = {},
): Promise<GitSearchResult[]> {
	const s = spinner();

	try {
		s.start(`Searching for "${searchTerm}"`);

		const grepArgs = buildGrepCommand(searchTerm, options);
		const { stdout } = await execa("git", grepArgs);

		s.stop();

		return parseGitGrepOutput(stdout);
	} catch (error: unknown) {
		s.stop("❌ Search failed");

		// If no matches found, git grep returns exit code 1
		if (error && typeof error === 'object' && 'exitCode' in error && error.exitCode === 1) {
			return [];
		}

		throw error;
	}
}

/**
 * Search in git history
 */
export async function searchInHistory(
	searchTerm: string,
	options: GitSearchOptions = {},
): Promise<void> {
	const s = spinner();

	try {
		s.start(`Searching "${searchTerm}" in git history`);

		const logArgs = ["log", `--grep=${searchTerm}`, "--oneline"];
		if (options.ignoreCase) {
			logArgs.push("-i");
		}

		const { stdout } = await execa("git", logArgs);
		s.stop();

		if (!stdout.trim()) {
			console.log(pc.yellow(`\n❌ No commits found matching "${searchTerm}"`));
			return;
		}

		console.log(pc.bold(`\n📚 Commits matching "${searchTerm}":`));
		const commits = stdout.split("\n").filter(Boolean);
		for (const commit of commits) {
			const [hash, ...messageParts] = commit.split(" ");
			const message = messageParts.join(" ");
			console.log(
				`  ${pc.yellow(hash)} ${highlightSearchTerm(message, searchTerm)}`,
			);
		}
	} catch (error) {
		s.stop("❌ History search failed");
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
	}
}

/**
 * Search files by name
 */
export async function searchFilesByName(pattern: string): Promise<void> {
	const s = spinner();

	try {
		s.start(`Searching files matching "${pattern}"`);

		const { stdout } = await execa("git", ["ls-files", "--", `*${pattern}*`]);
		s.stop();

		if (!stdout.trim()) {
			console.log(pc.yellow(`\n❌ No files found matching "${pattern}"`));
			return;
		}

		console.log(pc.bold(`\n📁 Files matching "${pattern}":`));
		const files = stdout.split("\n").filter(Boolean);
		for (const file of files) {
			console.log(`  ${pc.blue("📄")} ${highlightSearchTerm(file, pattern)}`);
		}
	} catch (error) {
		s.stop("❌ File search failed");
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
	}
}

/**
 * Show search actions menu
 */
export async function showSearchActions(): Promise<string | symbol> {
	return await select({
		message: "What would you like to search?",
		options: [
			{
				value: "content",
				label: "🔍 Search Content",
				hint: "Search text within files (git grep)",
			},
			{
				value: "files",
				label: "📁 Search Files",
				hint: "Search files by name pattern",
			},
			{
				value: "history",
				label: "📚 Search History",
				hint: "Search commit messages",
			},
			{
				value: "advanced",
				label: "⚙️ Advanced Search",
				hint: "Search with custom options",
			},
			{ value: "back", label: "← Back", hint: "Return to main menu" },
		],
	});
}
