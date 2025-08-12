
import ChatService from "@token-ring/chat/ChatService";
import { z } from "zod";
import GhostIOService from "../GhostIOService.ts";
import { Registry } from "@token-ring/registry";

interface PublishPostParams {
    // No parameters needed for this tool
}

interface GhostPost {
    id: string;
    title: string;
    status: string;
    url?: string | null;
    [key: string]: any;
}

interface PublishPostSuccess {
    success: true;
    post: GhostPost;
    message: string;
    url: string | null;
}

interface PublishPostError {
    success: false;
    error: string;
    suggestion: string;
}

type PublishPostResult = PublishPostSuccess | PublishPostError;

/**
 * Publishes a draft post on the Ghost.io platform
 */
export async function execute(_params: PublishPostParams, registry: Registry): Promise<PublishPostResult> {
	const chatService = registry.requireFirstServiceByType(ChatService);
	const ghostService = registry.requireFirstServiceByType(GhostIOService);

	// Validate that a post is currently selected
	const currentPost = ghostService.getCurrentPost();
	if (!currentPost) {
		chatService.errorLine(
			"[Ghost.io] No post is currently selected for publishing",
		);
		return {
			success: false,
			error: "No post is currently selected. Select a post before publishing.",
			suggestion: "Run /ghost post select to choose a post to publish",
		};
	}

	// Check if the post is already published
	if (currentPost.status === "published") {
		return {
			success: false,
			error: "The selected post is already published.",
			suggestion: "Select a draft post to publish",
		};
	}

	chatService.infoLine(`[Ghost.io] Publishing post: "${currentPost.title}"`);

	try {
		// Publish the post
		const publishedPost = await ghostService.publishPost();

		if (publishedPost) {
			return {
				success: true,
				post: publishedPost,
				message: `Post "${publishedPost.title}" published successfully.`,
				url: publishedPost.url || null,
			};
		} else {
			return {
				success: false,
				error: "Failed to publish post. The API returned null.",
				suggestion: "Check your Ghost.io API credentials and try again.",
			};
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		chatService.errorLine(`[Ghost.io] Error publishing post: ${errorMessage}`);
		return {
			success: false,
			error: `Failed to publish post: ${errorMessage}`,
			suggestion: "Check your Ghost.io API credentials and try again.",
		};
	}
}

export const description = "Publish a draft post on the Ghost.io platform";

// No parameters needed for this tool
export const parameters = z.object({});
