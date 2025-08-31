// Git Status Types
export interface GitFileStatus {
	file: string;
	status:
		| "modified"
		| "added"
		| "deleted"
		| "renamed"
		| "copied"
		| "untracked"
		| "unmerged";
	staged: boolean;
}

export interface GitStatus {
	branch: string;
	ahead?: number;
	behind?: number;
	files: GitFileStatus[];
	clean: boolean;
}

// Commit Types
export interface CommitType {
	value: string;
	label: string;
	hint: string;
}

export interface GitCommit {
	hash: string;
	shortHash: string;
	message: string;
	author: string;
	date: Date;
	branch?: string;
}

// Branch Types
export interface GitBranch {
	name: string;
	current: boolean;
	remote: boolean;
	upstream?: string;
}

// Remote Types
export interface GitRemote {
	name: string;
	url: string;
	type: "fetch" | "push";
}

// Merge Types
export interface MergeConflict {
	file: string;
	status:
		| "both_modified"
		| "added_by_us"
		| "added_by_them"
		| "deleted_by_us"
		| "deleted_by_them";
}

// Log Types
export interface GitLogOptions {
	limit?: number;
	since?: string;
	until?: string;
	author?: string;
	grep?: string;
	oneline?: boolean;
	graph?: boolean;
}

// Submodule Types
export interface GitSubmodule {
	name: string;
	path: string;
	url: string;
	branch?: string;
	commit: string;
	status: "uninitialized" | "modified" | "up-to-date";
}

// AI Provider Types (re-export from utils)
export type AIProvider = "openai" | "anthropic" | "xai";

export interface AIProviderConfig {
	provider: AIProvider;
	model?: string;
}

// Command Result Types
export interface CommandResult {
	success: boolean;
	message?: string;
	error?: string;
	data?: unknown;
}

// Common Command Options
export interface BaseCommandOptions {
	verbose?: boolean;
	dryRun?: boolean;
	force?: boolean;
}

// Git Configuration Types
export interface GitConfig {
	user?: {
		name?: string;
		email?: string;
	};
	core?: {
		editor?: string;
		autocrlf?: boolean;
	};
	remote?: Record<string, GitRemote>;
	branch?: Record<string, { remote: string; merge: string }>;
}
