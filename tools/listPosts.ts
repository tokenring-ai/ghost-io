
import ChatService from "@token-ring/chat/ChatService";
import { z } from "zod";
import GhostIOService from "../GhostIOService.ts";
import { Registry } from "@token-ring/registry";

interface ListPostsParams {
    status?: 'draft' | 'published' | 'all';
    tag?: string;
    limit?: number;
}

interface PostSummary {
    id: string;
    title: string;
    status: string;
    created_at?: string;
    updated_at?: string;
    url?: string | null;
    excerpt?: string | null;
    tags?: string[] | any[];
}

interface ListPostsSuccess {
    success: true;
    posts: PostSummary[];
    message: string;
    count: number;
    currentlySelected?: string | null;
}

interface ListPostsError {
    success: false;
    error: string;
    suggestion: string;
}

type ListPostsResult = ListPostsSuccess | ListPostsError;

/**
 * Lists posts from the Ghost.io platform
 */
export async function execute(
    { status = "all", tag, limit = 10 }: ListPostsParams,
    registry: Registry
): Promise<ListPostsResult> {
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
			filteredPosts = filteredPosts.filter((post: { status: string }) => post.status === status);
		}

		// Filter posts by tag if needed
		if (tag) {
			filteredPosts = filteredPosts.filter((post: { tags?: Array<string | { name?: string; slug?: string }> }) => {
				if (!post.tags || !Array.isArray(post.tags)) return false;
				return post.tags.some((postTag: string | { name?: string; slug?: string }) =>
					typeof postTag === "string"
						? postTag === tag
						: postTag.name === tag || postTag.slug === tag,
				);
			});
		}

		// Limit the number of posts
		const limitedPosts = filteredPosts.slice(0, limit);

		// Format posts for display
		const formattedPosts = limitedPosts.map((post: { 
			id: string; 
			title: string; 
			status: string; 
			created_at: string; 
			updated_at: string; 
			url?: string; 
			excerpt?: string; 
			tags?: Array<string | { name?: string; slug?: string }>;
		}) => ({
			id: post.id,
			title: post.title,
			status: post.status,
			created_at: post.created_at,
			updated_at: post.updated_at,
			url: post.url || null,
			excerpt: post.excerpt || null,
			tags: post.tags || [],
		}));

		const currentPost = ghostService.getCurrentPost();
		return {
			success: true,
			posts: formattedPosts,
			message: `Found ${filteredPosts.length} posts${filteredPosts.length > limit ? `, showing ${limit}` : ""}.`,
			count: filteredPosts.length,
			currentlySelected: currentPost ? currentPost.id : null,
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		chatService.errorLine(`[Ghost.io] Error listing posts: ${errorMessage}`);
		return {
			success: false,
			error: `Failed to list posts: ${errorMessage}`,
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
