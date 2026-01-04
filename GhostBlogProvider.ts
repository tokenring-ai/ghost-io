import Agent from "@tokenring-ai/agent/Agent";
import {BlogPost, BlogProvider, CreatePostData, UpdatePostData} from "@tokenring-ai/blog/BlogProvider";
// @ts-ignore
import GhostAdminAPI from "@tryghost/admin-api";
import {z} from "zod";
import {GhostBlogState} from "./state/GhostBlogState.js";

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

function GhostPostToBlogPost({id, created_at, updated_at, published_at, feature_image, title, content, html, status}: Partial<GhostPost>): BlogPost {
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
    content: content ?? html,
    status: status,
    created_at: created_at ? new Date(created_at) : now,
    updated_at: updated_at ? new Date(updated_at) : now,
    published_at: published_at ? new Date(published_at) : now,
    feature_image: {
      url: feature_image,
    }
  };
}


/**
 * GhostBlogProvider provides an interface for interacting with the Ghost.io platform.
 * It allows for retrieving, creating, updating, and publishing blog posts.
 */
export default class GhostBlogProvider implements BlogProvider {
  private readonly adminAPI: GhostAdminAPI;
  description: string;
  cdnName: string;
  imageGenerationModel: string;

  /**
   * Creates an instance of GhostIOService
   */
  constructor({url, apiKey, imageGenerationModel, cdn, description}: GhostBlogProviderOptions) {
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

  attach(agent: Agent): void {
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
        feature_image: feature_image?.url,
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
  async updatePost({title, content, tags, feature_image, status}: UpdatePostData, agent: Agent): Promise<BlogPost> {
    const currentPost = agent.getState(GhostBlogState).currentPost;
    if (!currentPost) {
      throw new Error(
        "No post is currently selected. Select a post before updating.",
      );
    }

    const updateData: GhostPost = {
      ...currentPost,
    };

    if (status === "pending" || status === "private") throw new Error("Ghost does not support pending or private posts");

    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (tags) updateData.tags = tags;
    if (feature_image) updateData.feature_image = feature_image?.url;
    if (status) updateData.status = status;


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
    const post: GhostPost | null | undefined = await this.adminAPI.posts.read({id, formats: 'html'});

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
export const GhostBlogProviderOptionsSchema = z.object({
  url: z.string(),
  apiKey: z.string(),
  imageGenerationModel: z.string(),
  cdn: z.string(),
  description: z.string(),
});
export type GhostBlogProviderOptions = z.infer<typeof GhostBlogProviderOptionsSchema>;