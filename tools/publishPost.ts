import ChatService from "@token-ring/chat/ChatService";
import {Registry} from "@token-ring/registry";
import {z} from "zod";
import GhostIOService from "../GhostIOService.ts";

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

export const name = "ghost/publishPost";

/**
 * Publishes a draft post on the Ghost.io platform
 */
export async function execute(_params: PublishPostParams, registry: Registry): Promise<PublishPostResult> {
  const chatService = registry.requireFirstServiceByType(ChatService);
  const ghostService = registry.requireFirstServiceByType(GhostIOService);

  // Validate that a post is currently selected
  const currentPost = ghostService.getCurrentPost();
  if (!currentPost) {
    return {
      success: false,
      error: "No post is currently selected",
      suggestion: "The user needs tp select a post to publish",
    };
  }

  // Check if the post is already published
  if (currentPost.status === "published") {
    return {
      success: false,
      error: "The selected post is already published.",
      suggestion: "No need to publish a post that is already published.",
    };
  }

  chatService.infoLine(`[Ghost.io] Publishing post: "${currentPost.title}"`);

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
      suggestion: "Have the user check their Ghost.io API credentials.",
    };
  }
}

export const description = "Publish a draft post on the Ghost.io platform";

// No parameters needed for this tool
export const inputSchema = z.object({});
