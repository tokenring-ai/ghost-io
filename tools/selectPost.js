import ChatService from "@token-ring/chat/ChatService";
import { z } from "zod";
import GhostIOService from "../GhostIOService.js";

/**
 * Selects a post for subsequent operations or clears the current selection
 *
 * @param {Object} params - Parameters for selecting a post
 * @param {string} [params.id] - The ID of the post to select (if null, clears the selection)
 * @param {TokenRingRegistry} registry - The package registry
 * @returns {Promise<Object>} - A promise that resolves to an object containing the selected post
 */
export async function execute({ id = null }, registry) {
	const chatService = registry.requireFirstServiceByType(ChatService);
	const ghostService = registry.requireFirstServiceByType(GhostIOService);

	// If id is null, clear the current selection
	if (id === null) {
		const previousPost = ghostService.getCurrentPost();
		ghostService.setCurrentPost(null);

		chatService.infoLine("[Ghost.io] Cleared current post selection");
		return {
			success: true,
			message: previousPost
				? `Cleared selection of post "${previousPost.title}"`
				: "No post was selected",
			previouslySelected: previousPost ? previousPost.id : null,
		};
	}

	chatService.infoLine(`[Ghost.io] Selecting post with ID: ${id}`);

	try {
		// Select the post by ID
		const post = await ghostService.selectPostById(id);

		if (post) {
			return {
				success: true,
				post,
				message: `Selected post: "${post.title}"`,
				status: post.status,
			};
		} else {
			return {
				success: false,
				error: `Post with ID ${id} not found`,
				suggestion: "Check the post ID and try again",
			};
		}
	} catch (error) {
		chatService.errorLine(`[Ghost.io] Error selecting post: ${error.message}`);
		return {
			success: false,
			error: `Failed to select post: ${error.message}`,
			suggestion: "Check the post ID and try again",
		};
	}
}

export const description =
	"Select a post for subsequent operations or clear the current selection";

export const parameters = z.object({
	id: z
		.string()
		.describe(
			"The ID of the post to select. If null, clears the current selection",
		)
		.nullable()
		.optional(),
});
