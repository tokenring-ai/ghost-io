import ChatService from "@token-ring/chat/ChatService";
import { z } from "zod";
import GhostIOService from "../GhostIOService.js";

/**
 * Retrieves the currently selected post from Ghost.io
 *
 * @param {Object} params - Parameters (none required for this tool)
 * @param {TokenRingRegistry} registry - The package registry
 * @returns {Promise<Object>} - A promise that resolves to the current post information
 */
export async function execute(params, registry) {
	const chatService = registry.requireFirstServiceByType(ChatService);
	const ghostService = registry.requireFirstServiceByType(GhostIOService);

	chatService.infoLine("[Ghost.io] Retrieving currently selected post");

	try {
		const currentPost = ghostService.getCurrentPost();

		if (!currentPost) {
			return {
				success: true,
				post: null,
				message: "No post is currently selected.",
			};
		}

		return {
			success: true,
			post: {
				id: currentPost.id,
				title: currentPost.title,
				status: currentPost.status,
				slug: currentPost.slug,
				excerpt: currentPost.excerpt,
				html: currentPost.html,
				tags: currentPost.tags,
				created_at: currentPost.created_at,
				updated_at: currentPost.updated_at,
				published_at: currentPost.published_at,
				url: currentPost.url,
			},
			message: `Currently selected post: "${currentPost.title}" (${currentPost.status})`,
		};
	} catch (error) {
		chatService.errorLine(
			`[Ghost.io] Error retrieving current post: ${error.message}`,
		);
		return {
			success: false,
			error: `Failed to retrieve current post: ${error.message}`,
			suggestion: "Check the Ghost.io service status and try again.",
		};
	}
}

export const description = "Retrieve the currently selected post from Ghost.io";

export const parameters = z.object({
	// No parameters needed for this tool
});
