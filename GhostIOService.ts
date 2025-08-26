import ChatService from "@token-ring/chat/ChatService";
import {Registry, Service} from "@token-ring/registry";
// @ts-ignore
import GhostAdminAPI from "@tryghost/admin-api";
// @ts-ignore
import GhostContentAPI from "@tryghost/content-api";

export interface GhostIOServiceOptions {
  url: string;
  adminApiKey: string;
  contentApiKey: string;
  imageGenerationModel: string;
  cdn: string;
}

interface CreatePostData {
  title: string;
  html: string;
  tags?: string[];
  published?: boolean;
}

interface UpdatePostData {
  title?: string;
  content?: string;
  tags?: string[];
}

export interface GhostPost {
  id: string;
  title: string;
  html?: string;
  content?: string;
  status: 'draft' | 'published' | 'scheduled';
  tags?: Array<string | { name?: string; slug?: string }>;
  created_at: string;
  updated_at: string;
  published_at?: string;
  excerpt?: string;
  url?: string;
  slug?: string;

  [key: string]: any;
}

/**
 * GhostIOService provides an interface for interacting with the Ghost.io platform.
 * It allows for retrieving, creating, updating, and publishing blog posts.
 */
/**
 * A marker class to use with Registry.requireFirstServiceByType
 * This allows us to type-check correctly
 */
export class GhostIOServiceType extends Service {
}

/**
 * The actual implementation of GhostIOService
 */
export default class GhostIOService extends GhostIOServiceType {
  static sampleArguments = {
    url: "https://ghost.io",
    adminApiKey: "YOUR_ADMIN_API_KEY",
    contentApiKey: "YOUR_CONTENT_API_KEY",
  };

  /**
   * Name of the service
   */
  name: string = "GhostIOService";

  /**
   * Description of the service
   */
  description: string = "Service for interacting with the Ghost.io blogging platform";

  readonly imageGenerationModel: string;
  private currentPost: GhostPost | null;
  private readonly adminAPI: GhostAdminAPI;
  private readonly contentAPI: GhostContentAPI;
  private registry!: Registry;
  readonly cdn: string;

  /**
   * Creates an instance of GhostIOService
   */
  constructor({url, adminApiKey, contentApiKey, imageGenerationModel, cdn}: GhostIOServiceOptions) {
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

    if (!cdn) {
      throw new Error("Error in Ghost configuration: cdn not provided");
    }

    this.imageGenerationModel = imageGenerationModel;
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

    this.cdn = cdn;
  }


  async start(registry: Registry): Promise<void> {
    const chatContext = registry.requireFirstServiceByType(ChatService);
    this.registry = registry;
    chatContext.on("clear", this.clearCurrentPost.bind(this));
  }

  async stop(registry: Registry): Promise<void> {
    const chatContext = registry.requireFirstServiceByType(ChatService);
    chatContext.off("clear", this.clearCurrentPost.bind(this));
  }

  /**
   * Clears the current post when the chat is cleared
   * This is a callback for the 'clear' event on ChatService.
   * @private
   */
  clearCurrentPost(type: string): void {
    if (type === 'chat') {
      if (this.currentPost === null) return;
      this.currentPost = null;
      const chatService = this.registry?.requireFirstServiceByType(ChatService);
      if (chatService) {
        chatService?.systemLine("[Ghost.io] Clearing current post");
      }
    }
  }

  /**
   * Gets the currently selected post
   */
  getCurrentPost(): GhostPost | null {
    return this.currentPost;
  }

  /**
   * Sets the current post
   */
  setCurrentPost(post: GhostPost | null): void {
    this.currentPost = post;
  }

  /**
   * Fetches all posts from the Ghost.io API
   */
  async getAllPosts(): Promise<GhostPost[]> {
    try {
      const posts = await this.adminAPI.posts.browse({limit: "all"});
      // Ensure all posts conform to the GhostPost interface
      return posts.map((post: GhostPost) => {
        return {
          ...post,
          created_at: post.created_at || new Date().toISOString(),
          updated_at: post.updated_at || new Date().toISOString()
        } as GhostPost;
      });
    } catch (error) {
     throw new Error(`Failed to fetch posts: ${(error as Error).message}`);
    }
  }

  /**
   * Creates a new post on Ghost.io
   */
  async createPost({title, html, tags = [], published = false}: CreatePostData): Promise<GhostPost> {
    if (this.currentPost) {
      throw new Error(
        "A post is currently selected. Clear the selection before creating a new post.",
      );
    }

    try {
      const post = await this.adminAPI.posts.add(
        {
          title,
          html,
          tags,
          status: published ? "published" : "draft",
        },
        {source: "html"},
      );

      // Ensure the post conforms to the GhostPost interface
      return {
        ...post,
        created_at: post.created_at || new Date().toISOString(),
        updated_at: post.updated_at || new Date().toISOString()
      } as GhostPost;
    } catch (error) {
      throw new Error(`Failed to create post: ${(error as Error).message}`);
    }
  }

  /**
   * Updates an existing post on Ghost.io
   */
  async updatePost({title, content, tags}: UpdatePostData): Promise<GhostPost> {
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
      const updateData: any = {
        id: this.currentPost.id,
      };

      if (title) updateData.title = title;
      if (content) updateData.content = content;
      if (tags) updateData.tags = tags;

      const updatedPost = await this.adminAPI.posts.edit(updateData);

      // Ensure the post conforms to the GhostPost interface
      const typedPost = {
        ...updatedPost,
        created_at: updatedPost.created_at || this.currentPost.created_at || new Date().toISOString(),
        updated_at: updatedPost.updated_at || new Date().toISOString()
      } as GhostPost;

      this.currentPost = typedPost;

      return typedPost;
    } catch (error) {
      throw new Error(`Failed to update post: ${(error as Error).message}`);
    }
  }

  /**
   * Publishes the currently selected post
   */
  async publishPost(): Promise<GhostPost> {
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

      // Ensure the post conforms to the GhostPost interface
      const typedPost = {
        ...publishedPost,
        created_at: publishedPost.created_at || this.currentPost.created_at || new Date().toISOString(),
        updated_at: publishedPost.updated_at || new Date().toISOString()
      } as GhostPost;

      this.currentPost = typedPost;
      return typedPost;
    } catch (error) {
      throw new Error(`Failed to publish post: ${(error as Error).message}`);
    }
  }

  /**
   * Selects a post by ID
   */
  async selectPostById(id: string): Promise<GhostPost> {
    try {
      // In a real implementation, we would use the Ghost Content SDK to fetch a post by ID
      const post = await this.contentAPI.posts.read({id});

      if (!post) {
        throw new Error(`Post with ID ${id} not found`);
      }

      // Ensure the post conforms to the GhostPost interface
      const typedPost = {
        ...post,
        created_at: post.created_at || new Date().toISOString(),
        updated_at: post.updated_at || new Date().toISOString()
      } as GhostPost;

      this.currentPost = typedPost;
      return typedPost;
    } catch (error) {
      throw new Error(`Failed to select post: ${(error as Error).message}`);
    }
  }

  /**
   * Edit a post with specific properties
   */
  async editPost(postData: any): Promise<GhostPost> {
    try {
      const post = await this.adminAPI.posts.edit(postData);

      // Ensure the post conforms to the GhostPost interface
      return {
        ...post,
        created_at: post.created_at || new Date().toISOString(),
        updated_at: post.updated_at || new Date().toISOString()
      } as GhostPost;
    } catch (error) {
      console.error("Failed to edit post:", error);
      throw new Error(`Failed to edit post: ${(error as Error).message}`);
    }
  }
}