import ModelRegistry from "@token-ring/ai-client/ModelRegistry";
import {ModelTypeRegistry} from "@token-ring/ai-client/ModelTypeRegistry";
import ChatService from "@token-ring/chat/ChatService";
import FileSystemService from "@token-ring/filesystem/FileSystemService";
import {Registry} from "@token-ring/registry";
import FormData from "form-data";
import {Buffer} from "node:buffer";
import {v4 as uuid} from "uuid";
import {z} from "zod";
import GhostIOService from "../GhostIOService.ts";

interface GenerateImageParams {
  prompt?: string;
  aspectRatio?: "square" | "tall" | "wide";
}

interface Post {
  id: string;
  title: string;
  updated_at: string;
}

interface UploadResult {
  url: string;
}

interface OperationResult {
  success: boolean;
  message?: string;
  error?: string;
  suggestion?: string;
  imagePath?: string;
  ghostImageUrl?: string;
}

export const name = "ghost/generateImageForPost";

/**
 * Generates an image for a Ghost.io post using AI image generation
 */
export async function execute(
  {prompt, aspectRatio = "square", detail = "auto", model}: GenerateImageParams,
  registry: Registry,
): Promise<OperationResult> {
  const chatService = registry.requireFirstServiceByType(ChatService);
  const ghostService = registry.requireFirstServiceByType(GhostIOService);
  const fileSystemService =
    registry.requireFirstServiceByType(FileSystemService);
  const modelRegistry = registry.requireFirstServiceByType(ModelRegistry);

  chatService.infoLine(`[Ghost.io] Generating image for post: "${prompt}"`);

  // Check if there's a currently selected post
  const currentPost = ghostService.getCurrentPost();
  if (!currentPost) {
    throw new Error(`[${name}] No post is currently selected`);
  }
  if (!prompt) {
    throw new Error(`[${name}] Prompt is required`);
  }

  // Get an image generation client
  const imageClient =
    await modelRegistry.imageGeneration.getFirstOnlineClient(ghostService.imageGenerationModel);

  chatService.infoLine(`[Ghost.io] Using model: ${imageClient.getModelId()}`);

  // Map aspect ratio to dimensions
  let size: `${number}x${number}`
  switch (aspectRatio) {
    case "square":
      size = "1024x1024";
      break;
    case "tall":
      size = "1024x1536";
      break;
    case "wide":
      size = "1536x1024";
      break;
    default:
      size = "1024x1024";
  }

  // Generate the image
  const [imageResult] = await imageClient.generateImage(
    {
      prompt,
      size,
      n: 1,
    },
    registry,
  );

  chatService.infoLine(`[Ghost.io] Image generated successfully`);

  // Create directory structure: images/YYYY-MM-DD/
  const now = new Date();
  const dateStr: string = now.toISOString().split("T")[0]; // YYYY-MM-DD format
  const imageDir: string = `images/${dateStr}`;

  const extension: string = imageResult.mediaType.split("/")[1];

  // Ensure the directory exists
  await fileSystemService.createDirectory(imageDir, {recursive: true});

  // Generate filename with UUID
  const filename: string = `${uuid()}.${extension}`;
  const imagePath: string = `${imageDir}/${filename}`;

  const imageBuffer: Buffer = Buffer.from(imageResult.uint8Array);

  await fileSystemService.writeFile(imagePath, imageBuffer);

  chatService.infoLine(`[Ghost.io] Image saved to: ${imagePath}`);

  const formData = new FormData();
  formData.append("file", imageBuffer, {filename});
  formData.append("purpose", "image");

  //debugger;
  const uploadResult: UploadResult = await ghostService.uploadImage(formData); // Use the accessor method

  chatService.infoLine(
    `[Ghost.io] Image uploaded to Ghost: ${uploadResult.url}`,
  );

  // Update the current post with the featured image
  const updatedPost = await ghostService.editPost({
    id: currentPost.id,
    feature_image: uploadResult.url,
    updated_at: currentPost.updated_at,
  });

  // Update the current post in the service
  ghostService.setCurrentPost(updatedPost);

  return {
    success: true,
    message: `Image generated and set as featured image for post "${currentPost.title}"`,
    imagePath,
    ghostImageUrl: uploadResult.url,
  };
}

export const description =
  "Generate an AI image and set it as the featured image for the currently selected Ghost.io post";

export const inputSchema = z.object({
  prompt: z.string().describe("Description of the image to generate"),
  aspectRatio: z
    .enum(["square", "tall", "wide"])
    .describe(
      "Aspect ratio of the image: square (1024x1024), tall (1024x1536), or wide (1536x1024)",
    )
    .default("square")
    .optional(),
});