import ChatService from "@token-ring/chat/ChatService";
import {Registry} from "@token-ring/registry";
import {marked} from "marked";
import {z} from "zod";
import GhostIOService from "../GhostIOService.ts";

interface CreatePostParams {
  title?: string;
  content?: string;
  tags?: string[];
}

interface CreatePostResult {
  success: boolean;
  error?: string;
  suggestion?: string;
  post?: any;
  message?: string;
  currentlySelected?: boolean;
}

interface GhostPostData {
  title: string;
  html: string;
  tags: string[];
  published: boolean;
}

export const name = "ghost/createPost";

/**
 * Creates a new post on the Ghost.io platform
 */
export async function execute(
  {title, content, tags = []}: CreatePostParams,
  registry: Registry
): Promise<CreatePostResult> {
  const chatService = registry.requireFirstServiceByType(ChatService);
  const ghostService = registry.requireFirstServiceByType(GhostIOService);

  chatService.infoLine(`[Ghost.io] Creating new post: "${title}"}`);

  if (!content) {
    throw new Error(`[${name}] Content is required`);
  }

  if (!title) {
    throw new Error(`[${name}] Title is required`);
  }

  // Strip the header from the post;
  content = content.replace(/^\s*#.*/, "").trim();

  // Create the post
  const postData: GhostPostData = {
    title,
    html: await marked(content),
    tags,
    published: false,
  };

  const post = await ghostService.createPost(postData);

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
}

export const description = "Create a new article/post on the Ghost.io platform";

export const inputSchema = z.object({
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