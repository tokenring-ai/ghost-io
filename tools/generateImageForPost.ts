// @ts-nocheck
import ChatService from "@token-ring/chat/ChatService";
import FileSystemService from "@token-ring/filesystem/FileSystemService";
import ModelRegistry from "@token-ring/ai-client/ModelRegistry";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { Buffer } from "node:buffer";
import GhostIOService from "../GhostIOService.ts";
import FormData from "form-data";
import { ModelTypeRegistry } from "@token-ring/ai-client/ModelTypeRegistry";

/**
 * Generates an image for a Ghost.io post using AI image generation
 *
 * @param {Object} params - Parameters for generating an image
 * @param {string} params.prompt - The description of the image to generate
 * @param {string} [params.aspectRatio="square"] - The aspect ratio of the image (square, tall, wide)
 * @param {string} [params.detail="auto"] - The detail level (low, high, auto)
 * @param {string} [params.model] - The specific image generation model to use
 * @param {TokenRingRegistry} registry - The package registry
 * @returns {Promise<Object>} - A promise that resolves to the operation result
 */
export async function execute(
	{ prompt, aspectRatio = "square", detail = "auto", model },
	registry,
) {
	const chatService = registry.requireFirstServiceByType(ChatService);
	const ghostService = registry.requireFirstServiceByType(GhostIOService);
	const fileSystemService =
		registry.requireFirstServiceByType(FileSystemService);
	const modelRegistry = registry.requireFirstServiceByType(ModelRegistry);

	chatService.infoLine(`[Ghost.io] Generating image for post: "${prompt}"`);

	// Check if there's a currently selected post
	const currentPost = ghostService.getCurrentPost();
	if (!currentPost) {
		return {
			success: false,
			error: "No post is currently selected",
			suggestion: "Select a post first using the selectPost tool",
		};
	}

	try {
		// Get an image generation client
		const imageClient =
			await modelRegistry.imageGeneration.getFirstOnlineClient("gpt-image-1");

		chatService.infoLine(`[Ghost.io] Using model: ${imageClient.getModelId()}`);

		// Map aspect ratio to dimensions
		let size;
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
		const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD format
		const imageDir = `images/${dateStr}`;

		/*const imageData = await fileSystemService.readFile(`${imageDir}/3c445fe5-7ff5-488b-a3f0-022251db0ef9.png`);
  const imageResult = {
   mimeType: 'image/png',
   uint8Array: imageData,
  }*/

		//debugger;
		const extension = imageResult.mimeType.split("/")[1];

		// Ensure the directory exists
		await fileSystemService.createDirectory(imageDir, { recursive: true });

		// Generate filename with UUID
		const filename = `${uuid()}.${extension}`;
		const imagePath = `${imageDir}/${filename}`;

		const imageBuffer = Buffer.from(imageResult.uint8Array);

		await fileSystemService.writeFile(imagePath, imageBuffer);

		chatService.infoLine(`[Ghost.io] Image saved to: ${imagePath}`);

		const formData = new FormData();
		formData.append("file", imageBuffer, { filename });
		formData.append("purpose", "image");

		//debugger;
		const uploadResult = await ghostService.adminAPI.images.upload(formData); // This isn't really described in the docs but should work

		chatService.infoLine(
			`[Ghost.io] Image uploaded to Ghost: ${uploadResult.url}`,
		);

		debugger;
		// Update the current post with the featured image
		const updatedPost = await ghostService.adminAPI.posts.edit({
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
	} catch (error) {
		debugger;
		chatService.errorLine(
			`[Ghost.io] Error generating image: ${error.message}`,
		);
		return {
			success: false,
			error: `Failed to generate image: ${error.message}`,
			suggestion:
				"Check your AI model configuration and Ghost.io API credentials",
		};
	}
}

export const description =
	"Generate an AI image and set it as the featured image for the currently selected Ghost.io post";

export const parameters = z.object({
	prompt: z.string().describe("Description of the image to generate"),
	aspectRatio: z
		.enum(["square", "tall", "wide"])
		.describe(
			"Aspect ratio of the image: square (1024x1024), tall (1024x1536), or wide (1536x1024)",
		)
		.default("square")
		.optional(),
	detail: z
		.enum(["low", "high", "auto"])
		.describe("Detail level for image generation")
		.default("auto")
		.optional(),
	model: z
		.string()
		.describe("Specific image generation model to use (optional)")
		.optional(),
});
