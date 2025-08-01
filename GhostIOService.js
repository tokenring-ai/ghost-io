import ChatService from "@token-ring/chat/ChatService";
import { Service } from "@token-ring/registry";
import GhostAdminAPI from "@tryghost/admin-api";
import GhostContentAPI from "@tryghost/content-api";

/**
 * GhostIOService provides an interface for interacting with the Ghost.io platform.
 * It allows for retrieving, creating, updating, and publishing blog posts.
 */
export default class GhostIOService extends Service {
	/**
	 * Name of the service
	 * @type {string}
	 */
	name = "GhostIOService";

	/**
	 * Description of the service
	 * @type {string}
	 */
	description = "Service for interacting with the Ghost.io blogging platform";

	/**
	 * Creates an instance of GhostIOService
	 * @param {Object} options - Configuration options
	 * @param {string} options.url - The Ghost site URL (e.g., 'https://demo.ghost.io')
	 * @param {string} options.adminApiKey - API key for the Ghost Admin API
	 * @param {string} options.contentApiKey - API key for the Ghost Content API
	 */
	constructor({ url, adminApiKey, contentApiKey } = {}) {
		super();

		if (!url) {
			throw new Error("Error in Ghost config: No url provided");
		}

		if (!adminApiKey) {
			throw new Error("Error in Ghost configuration: adminApiKey not provided");
		}

		if (!contentApiKey) {
			throw new Error(
				"Error in Ghost configuration: contentApiKey not provided",
			);
		}

		this.url = url;
		this.adminApiKey = adminApiKey;
		this.contentApiKey = contentApiKey;
		this.currentPost = null; // Currently selected post object
		this.adminAPI = new GhostAdminAPI({
			// Ghost Admin API client
			url,
			version: "v5.0",
			key: adminApiKey,
		});

		this.contentAPI = new GhostContentAPI({
			// Ghost Content API client
			url,
			version: "v5.0",
			key: contentApiKey,
		});
	}

	/**
	 * Starts the service by initializing API clients
	 * @param {TokenRingRegistry} registry - The package registry
	 */
	async start(registry) {
		const chatService = registry.requireFirstServiceByType(ChatService);
		chatService.on("reset", this.clearCurrentPost.bind(this));
	}

	/**
	 * Stops the service
	 * @param {TokenRingRegistry} registry - The package registry
	 */
	async stop(registry) {
		const chatService = registry.requireFirstServiceByType(ChatService);
		chatService.off("reset", this.clearCurrentPost.bind(this));
	}

	/**
	 * Clears the current post when the chat is reset
	 * This is a callback for the 'reset' event on ChatService
	 * @private
	 */
	clearCurrentPost() {
		this.currentPost = null;
		console.log("Chat reset: clearing current post");
	}

	/**
	 * Gets the currently selected post
	 * @returns {Object|null} The currently selected post or null if none is selected
	 */
	getCurrentPost() {
		return this.currentPost;
	}

	/**
	 * Sets the current post
	 * @param {Object|null} post - The post to set as current, or null to clear
	 */
	setCurrentPost(post) {
		this.currentPost = post;
	}

	/**
	 * Fetches all posts from the Ghost.io API
	 * @returns {Promise<Array>} A promise that resolves to an array of posts
	 * @throws Will throw an error if the posts cannot be fetched
	 */
	async getAllPosts() {
		if (!this.contentAPI) {
			throw new Error(
				"Content API not initialized. Check your API key and URL.",
			);
		}

		try {
			// In a real implementation, we would use the Ghost Content SDK to fetch posts
			return await this.adminAPI.posts.browse({ limit: "all" });
		} catch (error) {
			console.error("Failed to fetch posts:", error);
			throw new Error(`Failed to fetch posts: ${error.message}`);
		}
	}

	/**
	 * Creates a new post on Ghost.io
	 * @param {Object} postData - The post data
	 * @param {string} postData.title - The post title
	 * @param {string} postData.html - The post content (HTML)
	 * @param {string[]} [postData.tags] - The post tags
	 * @param {boolean} [postData.published=false] - Whether to publish the post
	 * @returns {Promise<Object>} A promise that resolves to the created post
	 * @throws Will throw an error if the post cannot be created
	 */
	async createPost({ title, html, tags = [], published = false }) {
		if (!this.adminAPI) {
			throw new Error("Admin API not initialized. Check your API key and URL.");
		}

		if (this.currentPost) {
			throw new Error(
				"A post is currently selected. Clear the selection before creating a new post.",
			);
		}

		try {
			return await this.adminAPI.posts.add(
				{
					title,
					html,
					tags,
					status: published ? "published" : "draft",
				},
				{ source: "html" },
			);
		} catch (error) {
			throw new Error(`Failed to create post: ${error.message}`);
		}
	}

	/**
	 * Updates an existing post on Ghost.io
	 * @param {Object} postData - The post data
	 * @param {string} [postData.title] - The post title
	 * @param {string} [postData.content] - The post content (HTML)
	 * @param {string[]} [postData.tags] - The post tags
	 * @returns {Promise<Object>} A promise that resolves to the updated post
	 * @throws Will throw an error if the post cannot be updated
	 */
	async updatePost({ title, content, tags }) {
		if (!this.adminAPI) {
			throw new Error("Admin API not initialized. Check your API key and URL.");
		}

		if (!this.currentPost) {
			throw new Error(
				"No post is currently selected. Select a post before updating.",
			);
		}

		try {
			// In a real implementation, we would use the Ghost Admin SDK to update a post
			const updateData = {
				id: this.currentPost.id,
			};

			if (title) updateData.title = title;
			if (content) updateData.content = content;
			if (tags) updateData.tags = tags;

			const updatedPost = await this.adminAPI.posts.edit(updateData);
			this.currentPost = updatedPost;

			return updatedPost;
		} catch (error) {
			console.error("Failed to update post:", error);
			throw new Error(`Failed to update post: ${error.message}`);
		}
	}

	/**
	 * Publishes the currently selected post
	 * @returns {Promise<Object>} A promise that resolves to the published post
	 * @throws Will throw an error if the post cannot be published
	 */
	async publishPost() {
		if (!this.adminAPI) {
			throw new Error("Admin API not initialized. Check your API key and URL.");
		}

		if (!this.currentPost) {
			throw new Error(
				"No post is currently selected. Select a post before publishing.",
			);
		}

		if (this.currentPost.status === "published") {
			throw new Error("The selected post is already published.");
		}

		try {
			// In a real implementation, we would use the Ghost Admin SDK to publish a post
			const publishedPost = await this.adminAPI.posts.edit({
				id: this.currentPost.id,
				status: "published",
			});

			this.currentPost = publishedPost;
			return publishedPost;
		} catch (error) {
			console.error("Failed to publish post:", error);
			throw new Error(`Failed to publish post: ${error.message}`);
		}
	}

	/**
	 * Selects a post by ID
	 * @param {string} id - The ID of the post to select
	 * @returns {Promise<Object>} A promise that resolves to the selected post
	 * @throws Will throw an error if the post cannot be found
	 */
	async selectPostById(id) {
		if (!this.contentAPI) {
			throw new Error(
				"Content API not initialized. Check your API key and URL.",
			);
		}

		try {
			// In a real implementation, we would use the Ghost Content SDK to fetch a post by ID
			const post = await this.contentAPI.posts.read({ id });

			if (!post) {
				throw new Error(`Post with ID ${id} not found`);
			}

			this.currentPost = post;
			return post;
		} catch (error) {
			console.error("Failed to select post:", error);
			throw new Error(`Failed to select post: ${error.message}`);
		}
	}
}
