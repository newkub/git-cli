import { defineConfig } from "./src/types/config";

export default defineConfig({
	ai: {
		provider: {
			provider: "anthropic",
		},
		enabled: true,
	},

	commit: {
		useAI: true,
		conventionalCommits: true,
		types: [
			"feat",
			"fix",
			"docs",
			"style",
			"refactor",
			"perf",
			"test",
			"build",
			"ci",
			"chore",
			"revert",
		],
	},
});
