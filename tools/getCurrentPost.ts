import ChatService from "@token-ring/chat/ChatService";
import { z } from "zod";
import GhostIOService from "../GhostIOService.ts";
import { Registry } from "@token-ring/registry";

interface GetCurrentPostParams {
    // No parameters needed for this tool
}

interface PostInfo {
    id: string;
    title: string;
    status: string;
    slug?: string;
    excerpt?: string;
    html?: string;
    tags?: Array<string | { name?: string; slug?: string }>;
    created_at?: string;
    updated_at?: string;
    published_at?: string;
    url?: string;
}

interface GetCurrentPostSuccess {
    success: true;
    post: PostInfo | null;
    message: string;
}

interface GetCurrentPostError {
    success: false;
    error: string;
    suggestion: string;
}

type GetCurrentPostResult = GetCurrentPostSuccess | GetCurrentPostError;

/**
 * Retrieves the currently selected post from Ghost.io
 */
export async function execute(
    params: GetCurrentPostParams,
    registry: Registry
): Promise<GetCurrentPostResult> {
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
		const errorMessage = error instanceof Error ? error.message : String(error);
		chatService.errorLine(
			`[Ghost.io] Error retrieving current post: ${errorMessage}`,
		);
		return {
			success: false,
			error: `Failed to retrieve current post: ${errorMessage}`,
			suggestion: "Check the Ghost.io service status and try again.",
		};
	}
}

export const description = "Retrieve the currently selected post from Ghost.io";

export const parameters = z.object({
	// No parameters needed for this tool
});
