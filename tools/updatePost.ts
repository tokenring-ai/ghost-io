
import ChatService from "@token-ring/chat/ChatService";
import { z } from "zod";
import GhostIOService from "../GhostIOService.ts";
import { Registry } from "@token-ring/registry";

interface UpdatePostParams {
    title?: string;
    content?: string;
    tags?: string[];
}

interface GhostPost {
    id: string;
    title: string;
    [key: string]: any;
}

interface UpdatePostSuccess {
    success: true;
    post: GhostPost;
    message: string;
    changes: {
        title: boolean;
        content: boolean;
        tags: boolean;
    };
}

interface UpdatePostError {
    success: false;
    error: string;
    suggestion: string;
}

type UpdatePostResult = UpdatePostSuccess | UpdatePostError;

/**
 * Updates an existing post on the Ghost.io platform
 */
export async function execute({ title, content, tags }: UpdatePostParams, registry: Registry): Promise<UpdatePostResult> {
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
					title: !!title,
					content: !!content,
					tags: !!tags,
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
		const errorMessage = error instanceof Error ? error.message : String(error);
		chatService.errorLine(`[Ghost.io] Error updating post: ${errorMessage}`);
		return {
			success: false,
			error: `Failed to update post: ${errorMessage}`,
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
