
import { HumanInterfaceService } from "@token-ring/chat";
import ChatService from "@token-ring/chat/ChatService";
import GhostIOService, { GhostPost } from "../GhostIOService.ts";
import { Registry } from "@token-ring/registry";

interface TreeNode {
    name: string;
    value: string;
    data: any | null;
}

interface TreeData {
    name: string;
    children: TreeNode[];
}

interface TreeSelectionOptions {
    message: string;
    tree: TreeData;
    multiple: boolean;
    allowCancel: boolean;
}

interface ChatCommand {
    arg0: string;
    arg1: string;
    [key: string]: string;
}


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
 * Returns help information for the ghost command
 */
export function help(): Array<string> {
    return [
        "/ghost [action] [subaction] - Manage Ghost.io blog posts",
        "",
        "Available actions:",
        "  post select - Select an existing article or clear selection",
        "    - Opens a tree selection interface to choose from available posts",
        "    - Includes option to clear current selection",
        "",
        "  post info - Display information about the currently selected post",
        "    - Shows title, status, dates, word count, tags, and URL",
        "    - Requires a post to be selected first",
        "",
        "  post new - Clear the current post selection",
        "    - Starts fresh with no post selected",
        "    - Use this to begin creating a new post",
    ];
}

/**
 * Handles the post select subcommand
 * Opens a post selector using the askForTreeSelection interface
 */
async function selectPost(
    ghostService: GhostIOService, 
    chatService: ChatService, 
    humanInterfaceService: HumanInterfaceService
): Promise<void> {
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
            data: null as unknown as GhostPost,
        });

        // Create the tree structure for askForTreeSelection
        const treeData = {
            name: "Ghost.io Posts",
            children: formattedPosts,
        };

        // Use humanInterfaceService.askForTreeSelection() to display the selection interface
        const selectedValue = await humanInterfaceService.askForSingleTreeSelection({
            message:
                "Select a Ghost.io Post - Choose a post to work with or select 'Clear selection' to start fresh",
            tree: treeData,
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
async function postInfo(
    ghostService: GhostIOService, 
    chatService: ChatService, 
    humanInterfaceService: HumanInterfaceService
): Promise<void> {
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
        : 0;

    // Build the info message
    const infoLines = [
        `Title: ${currentPost.title}`,
        `Status: ${currentPost.status}`,
        `Created: ${createdDate}`,
        `Updated: ${updatedDate}`,
        `Word count (approx.): ${wordCount}`,
    ];

    if (currentPost.tags && currentPost.tags.length > 0) {
        const tags = currentPost.tags
            .map((t) => (typeof t === "string" ? t : (t as {name?: string; slug?: string}).name || (t as {name?: string; slug?: string}).slug || ""))
            .filter(Boolean)
            .join(", ");
        infoLines.push(`Tags: ${tags}`);
    }

    if (currentPost.excerpt) {
        infoLines.push(`Excerpt: ${currentPost.excerpt.substring(0, 140)}...`);
    }

    if (currentPost.url) {
        infoLines.push(`URL: ${currentPost.url}`);
    }

    chatService.systemLine(infoLines.join("\n"));
}

/**
 * Command handler for /ghost
 */
export async function execute(remainder: string, registry: Registry): Promise<void> {
    const chatService = registry.requireFirstServiceByType(ChatService);
    const humanInterfaceService =
        registry.requireFirstServiceByType(HumanInterfaceService);
    const ghostService = registry.requireFirstServiceByType(GhostIOService);

    const [action, subaction] = remainder.split(/\s+/);

    if (action === "post") {
        switch (subaction) {
            case "select":
                await selectPost(ghostService, chatService, humanInterfaceService);
                break;
            case "info":
                await postInfo(ghostService, chatService, humanInterfaceService);
                break;
            case "new":
                ghostService.setCurrentPost(null);
                chatService.systemLine(
                    "New post started. No post is currently selected. Use tools to create and publish.",
                );
                break;
            default:
                chatService.systemLine(
                    "Unknown subaction. Available subactions: select, info, new",
                );
        }
    } else {
        chatService.systemLine(
            "Unknown action. Available actions: post [select|info|new]",
        );
    }
}