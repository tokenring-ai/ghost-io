import { HumanInterfaceService } from "@token-ring/chat";
import ChatService from "@token-ring/chat/ChatService";
import GhostIOService from "../GhostIOService.js";

/**
 * /ghost [action] [subaction] - Manage Ghost.io blog posts
 *
 * Actions:
 * - post select: Select an existing article or select no article
 * - post info: Display information about the currently selected post
 * - post new: Clear the current post selection
 */

export const description =
	"/ghost [action] [subaction] - Manage Ghost.io blog posts";

/**
 * Handles the post select subcommand
 * Opens a post selector using the askForTreeSelection interface
 */
async function selectPost(ghostService, chatService, humanInterfaceService) {
	try {
		// Fetch all posts from Ghost.io API
		let posts = await ghostService.getAllPosts();

		if (!posts || posts.length === 0) {
			chatService.systemLine("No posts found on your Ghost.io site.");
			return;
		}

		// Format posts into a tree structure compatible with askForTreeSelection
		const formattedPosts = posts.map((post) => {
			const date = new Date(
				post.updated_at || post.created_at,
			).toLocaleDateString();
			const status = post.status === "published" ? "📝" : "🔒";
			return {
				name: `${status} ${post.title} (${date})`,
				value: post.id,
				data: post, // Store the full post data for later use
			};
		});

		// Add a "None" option to clear the selection
		formattedPosts.unshift({
			name: "❌ Clear selection",
			value: "none",
			data: null,
		});

		// Create the tree structure for askForTreeSelection
		const treeData = {
			name: "Ghost.io Posts",
			children: formattedPosts,
		};

		// Use humanInterfaceService.askForTreeSelection() to display the selection interface
		const selectedValue = await humanInterfaceService.askForTreeSelection({
			message:
				"Select a Ghost.io Post - Choose a post to work with or select 'Clear selection' to start fresh",
			tree: treeData,
			multiple: false,
			allowCancel: true,
		});

		if (selectedValue) {
			if (selectedValue === "none") {
				// Clear the selection
				ghostService.setCurrentPost(null);
				chatService.systemLine("Post selection cleared.");
			} else {
				// Find the selected post data
				const selectedPost = formattedPosts.find(
					(post) => post.value === selectedValue,
				);
				if (selectedPost?.data) {
					// Store the selected post
					ghostService.setCurrentPost(selectedPost.data);
					chatService.systemLine(`Selected post: "${selectedPost.data.title}"`);
				}
			}
		} else {
			chatService.systemLine("Post selection cancelled.");
		}
	} catch (error) {
		chatService.errorLine("Error during post selection:", error);
	}
}

/**
 * Handles the post info subcommand
 * Displays information about the currently selected post
 */
async function postInfo(ghostService, chatService, humanInterfaceService) {
	const currentPost = ghostService.getCurrentPost();

	if (!currentPost) {
		chatService.systemLine("No post is currently selected.");
		chatService.systemLine("Use /ghost post select to choose a post.");
		return;
	}

	// Format dates
	const createdDate = new Date(currentPost.created_at).toLocaleString();
	const updatedDate = new Date(currentPost.updated_at).toLocaleString();

	// Calculate word count
	const wordCount = currentPost.html
		? currentPost.html
				.replace(/<[^>]*>/g, " ")
				.split(/\s+/)
				.filter(Boolean).length
		: "N/A";

	// Build info display
	const info = [
		`Post Information: ${currentPost.title}`,
		"",
		`Status: ${currentPost.status === "published" ? "Published" : "Draft"}`,
		`Created: ${createdDate}`,
		`Last Updated:** ${updatedDate}`,
		currentPost.url ? `URL: ${currentPost.url}` : "",
		`Word Count: ${wordCount}`,
		"",
		"---",
		"",
		`Excerpt: ${currentPost.excerpt || "No excerpt available"}`,
	]
		.filter(Boolean)
		.join("\n");

	for (const line of info.split("\n")) {
		chatService.systemLine(line);
	}

	const shouldOpen = await humanInterfaceService.askForConfirmation({
		message: "Do you want to open the post in your browser?",
		default: true,
	});

	if (shouldOpen) {
		return openPost(ghostService, chatService, humanInterfaceService);
	}
}

async function openPost(ghostService, chatService, humanInterfaceService) {
	const currentPost = ghostService.getCurrentPost();

	if (!currentPost) {
		chatService.systemLine("No post is currently selected.");
		chatService.systemLine("Use /ghost post select to choose a post.");
		return;
	}

	chatService.systemLine(
		`Opening post: "${currentPost.title}" in your browser...`,
	);
	await humanInterfaceService.openWebBrowser(currentPost.url);
}

/**
 * Handles the post new subcommand
 * Clears the current post selection
 */
async function postNew(ghostService, chatService) {
	const previousPost = ghostService.getCurrentPost();
	ghostService.setCurrentPost(null);

	if (previousPost) {
		chatService.systemLine(
			`Cleared selection of post "${previousPost.title}".`,
		);
		chatService.systemLine("You can now create a new post.");
	} else {
		chatService.systemLine("No post was selected. Ready to create a new post.");
	}
}

export async function execute(remainder, registry) {
	const chatService = registry.requireFirstServiceByType(ChatService);
	const humanInterfaceService = registry.requireFirstServiceByType(
		HumanInterfaceService,
	);
	const ghostService = registry.requireFirstServiceByType(GhostIOService);

	const args = remainder ? remainder.trim().split(/\s+/) : [];
	const action = args[0];
	const subaction = args[1];

	if (action === "post") {
		switch (subaction) {
			case "select":
				await selectPost(ghostService, chatService, humanInterfaceService);
				break;

			case "info":
				await postInfo(ghostService, chatService, humanInterfaceService);
				break;

			case "new":
				await postNew(ghostService, chatService);
				break;

			case "open":
				await openPost(ghostService, chatService, humanInterfaceService);
				break;

			default:
				chatService.systemLine("Ghost.io post management commands:");
				chatService.systemLine(
					"  /ghost post select - Select a post to work with",
				);
				chatService.systemLine(
					"  /ghost post info   - Show information about the selected post",
				);
				chatService.systemLine(
					"  /ghost post new    - Clear selection to create a new post",
				);
				chatService.systemLine(
					"  /ghost post open   - Opens the current post in your web browser",
				);

				break;
		}
	} else {
		chatService.systemLine("Ghost.io commands:");
		chatService.systemLine("  /ghost post - Manage Ghost.io blog posts");
		chatService.systemLine("");
		chatService.systemLine("Examples:");
		chatService.systemLine("  /ghost post select - Select a post to work with");
		chatService.systemLine(
			"  /ghost post info   - Show information about the selected post",
		);
		chatService.systemLine(
			"  /ghost post new    - Clear selection to create a new post",
		);
		chatService.systemLine(
			"  /ghost post open   - Opens the current post in your web browser",
		);
	}
}
