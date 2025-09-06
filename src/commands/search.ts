import { text, isCancel } from "@clack/prompts";
import pc from "picocolors";
import {
	showSearchActions,
	executeGitGrep,
	searchInHistory,
	searchFilesByName,
	getSearchOptions,
	displaySearchResults,
} from "../utils/useGitSearch.js";

export async function searchCommand() {
	try {
		while (true) {
			const action = await showSearchActions();

			if (isCancel(action)) {
				return;
			}

			switch (action) {
				case "content":
					await handleContentSearch();
					break;
				case "files":
					await handleFileSearch();
					break;
				case "history":
					await handleHistorySearch();
					break;
				case "advanced":
					await handleAdvancedSearch();
					break;
				case "back":
					return;
			}

			console.log(); // Add spacing between searches
		}
	} catch (error) {
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
	}
}

async function handleContentSearch() {
	const searchTerm = await text({
		message: "Enter search term",
		placeholder: "function, class name, etc.",
		validate: (value) => {
			if (!value) return "Search term is required";
		},
	});

	if (isCancel(searchTerm)) {
		return;
	}

	try {
		const results = await executeGitGrep(searchTerm as string);
		displaySearchResults(results, searchTerm as string);
	} catch (error) {
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
	}
}

async function handleFileSearch() {
	const pattern = await text({
		message: "Enter file name pattern",
		placeholder: "component, utils, etc.",
		validate: (value) => {
			if (!value) return "File pattern is required";
		},
	});

	if (isCancel(pattern)) {
		return;
	}

	try {
		await searchFilesByName(pattern as string);
	} catch (error) {
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
	}
}

async function handleHistorySearch() {
	const searchTerm = await text({
		message: "Enter commit message search term",
		placeholder: "fix, feat, refactor, etc.",
		validate: (value) => {
			if (!value) return "Search term is required";
		},
	});

	if (isCancel(searchTerm)) {
		return;
	}

	try {
		await searchInHistory(searchTerm as string);
	} catch (error) {
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
	}
}

async function handleAdvancedSearch() {
	const searchTerm = await text({
		message: "Enter search term",
		placeholder: "function, class name, etc.",
		validate: (value) => {
			if (!value) return "Search term is required";
		},
	});

	if (isCancel(searchTerm)) {
		return;
	}

	const options = await getSearchOptions();
	if (!options) {
		return;
	}

	try {
		const results = await executeGitGrep(searchTerm as string, options);
		displaySearchResults(results, searchTerm as string);
	} catch (error) {
		console.error(
			pc.red(error instanceof Error ? error.message : String(error)),
		);
	}
}
