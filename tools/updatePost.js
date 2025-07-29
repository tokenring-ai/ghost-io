import GhostIOService from "../GhostIOService.js";
import ChatService from "@token-ring/chat/ChatService";
import { z } from "zod";

/**
 * Updates an existing post on the Ghost.io platform
 *
 * @param {Object} params - Parameters for updating a post
 * @param {string} [params.title] - The new title of the post
 * @param {string} [params.content] - The new content of the post (HTML)
 * @param {string[]} [params.tags] - New tags for the post
 * @param {TokenRingRegistry} registry - The package registry
 * @returns {Promise<Object>} - A promise that resolves to the updated post
 */
export async function execute({ title, content, tags }, registry) {
	const chatService = registry.requireFirstServiceByType(ChatService);
	const ghostService = registry.requireFirstServiceByType(GhostIOService);

	// Validate that a post is currently selected
	const currentPost = ghostService.getCurrentPost();
	if (!currentPost) {
		chatService.errorLine(
			"[Ghost.io] No post is currently selected for update",
		);
		return {
			success: false,
			error: "No post is currently selected. Select a post before updating.",
			suggestion: "Run /ghost post select to choose a post to update",
		};
	}

	// Validate that at least one field is provided for update
	if (!title && !content && !tags) {
		return {
			success: false,
			error:
				"At least one of title, content, or tags must be provided for update",
			suggestion: "Specify at least one field to update",
		};
	}

	chatService.infoLine(`[Ghost.io] Updating post: "${currentPost.title}"`);

	try {
		// Update the post
		const updatedPost = await ghostService.updatePost({
			title,
			content,
			tags,
		});

		if (updatedPost) {
			return {
				success: true,
				post: updatedPost,
				message: `Post "${updatedPost.title}" updated successfully.`,
				changes: {
					title: title ? true : false,
					content: content ? true : false,
					tags: tags ? true : false,
				},
			};
		} else {
			return {
				success: false,
				error: "Failed to update post. The API returned null.",
				suggestion: "Check your Ghost.io API credentials and try again.",
			};
		}
	} catch (error) {
		chatService.errorLine(`[Ghost.io] Error updating post: ${error.message}`);
		return {
			success: false,
			error: `Failed to update post: ${error.message}`,
			suggestion: "Check your Ghost.io API credentials and try again.",
		};
	}
}

export const description = "Update an existing post on the Ghost.io platform";

export const parameters = z.object({
	title: z.string().describe("The new title of the post").optional(),
	content: z
		.string()
		.describe("The new content of the post in HTML format")
		.optional(),
	tags: z.array(z.string()).describe("New tags for the post").optional(),
});
