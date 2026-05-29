/**
 * Shared content extraction utilities.
 * Consolidates duplicated "extract text from message content" logic.
 */

interface TextPart {
	type: "text";
	text: string;
}

function isTextPart(part: unknown): part is TextPart {
	return (
		!!part &&
		typeof part === "object" &&
		"type" in part &&
		(part as { type: unknown }).type === "text" &&
		"text" in part
	);
}

/**
 * Extract text from message content (string, array of parts, or unknown).
 * Returns joined text, trimmed. Handles all content shapes used by pi.
 */
export function extractTextContent(content: unknown): string {
	if (!content) return "";
	if (typeof content === "string") return content.trim();
	if (Array.isArray(content)) {
		return content
			.filter(isTextPart)
			.map((part) => part.text)
			.join("\n")
			.trim();
	}
	return "";
}

/**
 * Extract text from an assistant message event object.
 * Checks role === "assistant" and extracts text from content array.
 */
export function extractAssistantText(message: unknown): string {
	if (!message || typeof message !== "object") return "";
	const msg = message as { role?: unknown; content?: unknown };
	if (msg.role !== "assistant" || !Array.isArray(msg.content)) return "";
	return msg.content
		.filter(isTextPart)
		.map((part) => part.text)
		.join("\n")
		.trim();
}
