import Agent from "@tokenring-ai/agent/Agent";
import {
  BlogPost,
  BlogResource,
  BlogResourceOptions,
  CreatePostData,
  UpdatePostData
} from "@tokenring-ai/blog/BlogResource";
// @ts-ignore
import GhostAdminAPI from "@tryghost/admin-api";
import {GhostBlogState} from "./state/GhostBlogState.js";

export interface GhostIOServiceOptions extends BlogResourceOptions{
  url: string;
  apiKey: string;
}

export interface GhostAdminAPI {
  posts: {
    browse: (params: { limit: string }) => Promise<GhostPost[]>;
    add: (data: GhostPost, options?: { source: string }) => Promise<GhostPost>;
    edit: (data: GhostPost) => Promise<GhostPost>;
    read: (params: { id: string }) => Promise<GhostPost | null>;
  };
  tags: {
    browse: () => Promise<string[]>;
  };
  images: {
    upload: (data: Buffer, options?: { filename: string; purpose: string }) => Promise<{ url: string; id: string; metadata: any }>;
  }
}

export interface GhostPost {
  id: string;
  title: string;
  html?: string;
  content?: string;
  status: 'draft' | 'published' | 'scheduled';
  tags?: string[];
  created_at: string;
  updated_at: string;
  feature_image?: string;
  published_at?: string;
  excerpt?: string;
  url?: string;
  slug?: string;
}

function GhostPostToBlogPost({id, created_at, updated_at, published_at, feature_image, title, content, status}: Partial<GhostPost>): BlogPost {
  if (! id) {
    throw new Error("Cannot convert WPPost to BlogPost: Missing required field: id");
  }
  if (! title) {
    throw new Error("Cannot convert WPPost to BlogPost: Missing required field: title");
  }
  if (! status) {
    throw new Error("Cannot convert WPPost to BlogPost: Missing required field: status");
  }

  const now = new Date();
  return {
    id: id,
    title: title,
    content: content,
    status: status,
    created_at: created_at ? new Date(created_at) : now,
    updated_at: updated_at ? new Date(updated_at) : now,
    published_at: published_at ? new Date(published_at) : now,
    feature_image
  };
}

function BlogPostToGhostPost({id, title, content, status, created_at, updated_at, feature_image}: BlogPost): Partial<GhostPost> {
  return {
    id,
    title,
    content,
    status,
    updated_at: updated_at.toISOString(),
    created_at: created_at.toISOString(),
    published_at: created_at.toISOString(),
    feature_image
  };
}


/**
 * GhostIOResource provides an interface for interacting with the Ghost.io platform.
 * It allows for retrieving, creating, updating, and publishing blog posts.
 */
export default class GhostBlogResource implements BlogResource {
  static sampleArguments = {
    url: "https://ghost.io",
    apiKey: "YOUR_ADMIN_API_KEY",
  };

  private readonly adminAPI: GhostAdminAPI;
  description: string;
  cdnName: string;
  imageGenerationModel: string;

  /**
   * Creates an instance of GhostIOService
   */
  constructor({url, apiKey, imageGenerationModel, cdn, description}: GhostIOServiceOptions) {
    if (!cdn) {
      throw new Error("Error in Ghost config: No cdn provided");
    }
    this.cdnName = cdn;

    if (!imageGenerationModel) {
      throw new Error("Error in Ghost config: No imageGenerationModel provided");
    }
    this.imageGenerationModel = imageGenerationModel;

    if (!description) {
      throw new Error("Error in Ghost config: No description provided");
    }
    this.description = description;

    if (!url) {
      throw new Error("Error in Ghost config: No url provided");
    }

    if (!apiKey) {
      throw new Error("Error in Ghost configuration: apiKey not provided");
    }

    if (!cdn) {
      throw new Error("Error in Ghost configuration: cdn not provided");
    }

    this.adminAPI = new GhostAdminAPI({
      // Ghost Admin API client
      url,
      version: "v5.0",
      key: apiKey,
    });
  }

  async attach(agent: Agent): Promise<void> {
    agent.initializeState(GhostBlogState, {});
  }

  /**
   * Gets the currently selected post
   */
  getCurrentPost(agent: Agent): BlogPost | null {
    const currentPost = agent.getState(GhostBlogState).currentPost;
    if (!currentPost) return null;
    return GhostPostToBlogPost(currentPost);
  }

  /**
   * Fetches all posts from the Ghost.io API
   */
  async getAllPosts(): Promise<BlogPost[]> {
    const posts = await this.adminAPI.posts.browse({limit: "all"});
    // Ensure all posts conform to the GhostPost interface
    return posts.map(GhostPostToBlogPost);
  }

  /**
   * Creates a new post on Ghost.io
   */
  async createPost({title, content, tags = [], feature_image}: CreatePostData, agent: Agent): Promise<BlogPost> {
    const currentPost = agent.getState(GhostBlogState).currentPost;
    if (currentPost) {
      throw new Error(
        "A post is currently selected. Clear the selection before creating a new post.",
      );
    }

    const post = await this.adminAPI.posts.add(
      {
        title,
        html: content,
        tags,
        status: "draft",
        feature_image
      },
      {source: "html"},
    );

    agent.mutateState(GhostBlogState, (state: GhostBlogState) => {
      state.currentPost = post;
    });

    // Ensure the post conforms to the GhostPost interface
    return GhostPostToBlogPost(post);
  }

  /**
   * Updates an existing post on Ghost.io
   */
  async updatePost({title, content, tags, feature_image}: UpdatePostData, agent: Agent): Promise<BlogPost> {
    const currentPost = agent.getState(GhostBlogState).currentPost;
    if (!currentPost) {
      throw new Error(
        "No post is currently selected. Select a post before updating.",
      );
    }

    const updateData: GhostPost = {
      ...currentPost,
    };

    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (tags) updateData.tags = tags;
    if (feature_image) updateData.feature_image = feature_image;

    const updatedPost: GhostPost = await this.adminAPI.posts.edit(updateData);

    agent.mutateState(GhostBlogState, (state: GhostBlogState) => {
      state.currentPost = updatedPost;
    });

    return GhostPostToBlogPost(updatedPost);
  }

  /**
   * Selects a post by ID
   */
  async selectPostById(id: string, agent: Agent): Promise<BlogPost> {
    const post: GhostPost | null | undefined = await this.adminAPI.posts.read({id});

    if (!post) {
      throw new Error(`Post with ID ${id} not found`);
    }

    agent.mutateState(GhostBlogState, (state: GhostBlogState) => {
      state.currentPost = post;
    });

    return GhostPostToBlogPost(post);
  }

  async clearCurrentPost(agent: Agent): Promise<void> {
    agent.mutateState(GhostBlogState, (state: GhostBlogState) => {
      state.currentPost = null;
    });
  }
}