import ChatService from "@token-ring/chat/ChatService";
import {Registry} from "@token-ring/registry";
import {z} from "zod";
import GhostIOService from "../GhostIOService.ts";

interface SelectPostParams {
  id?: string | null;
}

interface GhostPost {
  id: string;
  title: string;
  status: string;

  [key: string]: any;
}

interface SelectPostSuccessWithPost {
  success: true;
  post: GhostPost;
  message: string;
  status: string;
}

interface SelectPostSuccessNone {
  success: true;
  message: string;
  previouslySelected: string | null;
}

interface SelectPostError {
  success: false;
  error: string;
  suggestion: string;
}

type SelectPostResult = SelectPostSuccessWithPost | SelectPostSuccessNone | SelectPostError;

export const name = "ghost/selectPost";

/**
 * Selects a post for subsequent operations or clears the current selection
 */
export async function execute({id = null}: SelectPostParams, registry: Registry): Promise<SelectPostResult> {
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
}

export const description =
  "Select a post for subsequent operations or clear the current selection";

export const inputSchema = z.object({
  id: z
    .string()
    .describe(
      "The ID of the post to select. If null, clears the current selection",
    )
    .nullable()
    .optional(),
});
