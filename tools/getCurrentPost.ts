import ChatService from "@token-ring/chat/ChatService";
import {Registry} from "@token-ring/registry";
import {z} from "zod";
import GhostIOService from "../GhostIOService.ts";

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

export const name = "ghost/getCurrentPost";

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
  const currentPost = ghostService.getCurrentPost();

  if (!currentPost) {
    return {
      success: false,
      error: `No post is currently selected`,
      suggestion: "The user needs to select a post before using this tool",
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
}


export const description = "Retrieve the currently selected post from Ghost.io";

export const inputSchema = z.object({
  // No parameters needed for this tool
});
