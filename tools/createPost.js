import ChatService from "@token-ring/chat/ChatService";
import { marked } from "marked";
import { z } from "zod";
import GhostIOService from "../GhostIOService.js";

/**
 * Creates a new post on the Ghost.io platform
 *
 * @param {Object} params - Parameters for creating a post
 * @param {string} params.title - The title of the post
 * @param {string} params.content - The content of the post (HTML)
 * @param {string[]} [params.tags] - Tags for the post
 * @param {TokenRingRegistry} registry - The package registry
 * @returns {Promise<Object>} - A promise that resolves to the created post
 */
export async function execute({ title, content, tags = [] }, registry) {
	const chatService = registry.requireFirstServiceByType(ChatService);
	const ghostService = registry.requireFirstServiceByType(GhostIOService);

	chatService.infoLine(`[Ghost.io] Creating new post: "${title}"}`);

	if (!content) {
		return {
			success: false,
			error: "Content is required",
			suggestion: "Specify content for the post",
		};
	}

	// Strip the header from the post;
	content = content.replace(/^\s*#.*/, "").trim();

	try {
		// Create the post
		const post = await ghostService.createPost({
			title,
			html: marked(content),
			tags,
			published: false,
		});

		// Set as current post if creation was successful
		if (post) {
			ghostService.setCurrentPost(post);
			return {
				success: true,
				post,
				message: `Post "${title}" created successfully.`,
				currentlySelected: true,
			};
		} else {
			return {
				success: false,
				error: "Failed to create post. The API returned null.",
				suggestion: "Check your Ghost.io API credentials and try again.",
			};
		}
	} catch (error) {
		chatService.errorLine(`[Ghost.io] Error creating post: ${error.message}`);
		return {
			success: false,
			error: `Failed to create post: ${error.message}`,
			suggestion: "Check your Ghost.io API credentials and try again.",
		};
	}
}

export const description = "Create a new article/post on the Ghost.io platform";

export const parameters = z.object({
	title: z.string().describe("The title of the post"),
	content: z
		.string()
		.describe(
			"The content of the post in Markdown format. The title of the post goes in the title tag, NOT inside the content",
		),
	tags: z.array(z.string()).describe("Tags for the post").optional(),
	/*published: z
    .boolean()
    .describe("Whether to publish the post immediately (true) or save as draft (false)")
    .default(false)
    .optional()*/
});
