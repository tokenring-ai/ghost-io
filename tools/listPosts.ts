// @ts-nocheck
import ChatService from "@token-ring/chat/ChatService";
import { z } from "zod";
import GhostIOService from "../GhostIOService.ts";

/**
 * Lists posts from the Ghost.io platform
 *
 * @param {Object} params - Parameters for listing posts
 * @param {string} [params.status] - Filter posts by status ('draft', 'published', or 'all')
 * @param {string} [params.tag] - Filter posts by tag
 * @param {number} [params.limit=10] - Maximum number of posts to return
 * @param {TokenRingRegistry} registry - The package registry
 * @returns {Promise<Object>} - A promise that resolves to an object containing the posts
 */
export async function execute({ status = "all", tag, limit = 10 }, registry) {
	const chatService = registry.requireFirstServiceByType(ChatService);
	const ghostService = registry.requireFirstServiceByType(GhostIOService);

	chatService.infoLine(
		`[Ghost.io] Listing posts${status !== "all" ? ` with status: ${status}` : ""}${tag ? ` tagged: ${tag}` : ""}`,
	);

	try {
		// Get all posts
		const allPosts = await ghostService.getAllPosts();

		if (!allPosts || allPosts.length === 0) {
			return {
				success: true,
				posts: [],
				message: "No posts found.",
				count: 0,
			};
		}

		// Filter posts by status if needed
		let filteredPosts = allPosts;
		if (status !== "all") {
			filteredPosts = filteredPosts.filter((post) => post.status === status);
		}

		// Filter posts by tag if needed
		if (tag) {
			filteredPosts = filteredPosts.filter((post) => {
				if (!post.tags || !Array.isArray(post.tags)) return false;
				return post.tags.some((postTag) =>
					typeof postTag === "string"
						? postTag === tag
						: postTag.name === tag || postTag.slug === tag,
				);
			});
		}

		// Limit the number of posts
		const limitedPosts = filteredPosts.slice(0, limit);

		// Format posts for display
		const formattedPosts = limitedPosts.map((post) => ({
			id: post.id,
			title: post.title,
			status: post.status,
			created_at: post.created_at,
			updated_at: post.updated_at,
			url: post.url || null,
			excerpt: post.excerpt || null,
			tags: post.tags || [],
		}));

		return {
			success: true,
			posts: formattedPosts,
			message: `Found ${filteredPosts.length} posts${filteredPosts.length > limit ? `, showing ${limit}` : ""}.`,
			count: filteredPosts.length,
			currentlySelected: ghostService.getCurrentPost()
				? ghostService.getCurrentPost().id
				: null,
		};
	} catch (error) {
		chatService.errorLine(`[Ghost.io] Error listing posts: ${error.message}`);
		return {
			success: false,
			error: `Failed to list posts: ${error.message}`,
			suggestion: "Check your Ghost.io API credentials and try again.",
		};
	}
}

export const description = "List posts from the Ghost.io platform";

export const parameters = z.object({
	status: z
		.enum(["draft", "published", "all"])
		.describe("Filter posts by status")
		.default("all")
		.optional(),
	tag: z.string().describe("Filter posts by tag").optional(),
	limit: z
		.number()
		.int()
		.positive()
		.describe("Maximum number of posts to return")
		.default(10)
		.optional(),
});
