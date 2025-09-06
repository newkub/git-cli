import * as pc from "picocolors";

/**
 * Log success message with green color and checkmark
 */
export function logSuccess(message: string): void {
	console.log(pc.green(`✅ ${message}`));
}

/**
 * Log error message with red color and X mark
 */
export function logError(message: string): void {
	console.log(pc.red(`❌ ${message}`));
}

/**
 * Log warning message with yellow color and warning sign
 */
export function logWarning(message: string): void {
	console.log(pc.yellow(`⚠️  ${message}`));
}

/**
 * Log info message with cyan color and info sign
 */
export function logInfo(message: string): void {
	console.log(pc.cyan(`ℹ️  ${message}`));
}
