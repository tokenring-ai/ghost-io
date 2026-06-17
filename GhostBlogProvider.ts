import type { BlogPost, BlogPostFilterOptions, BlogPostListItem, BlogProvider, CreatePostData, UpdatePostData } from "@tokenring-ai/blog/BlogProvider";
import { stripUndefinedKeys } from "@tokenring-ai/utility/object/stripObject";
import GhostAdminAPI, { type GhostPost, type GhostPostListItem } from "@tryghost/admin-api";
import type { GhostBlogProviderOptions } from "./schema.ts";

function GhostPostListItemToBlogPostListItem({
                                               id,
                                               created_at,
                                               updated_at,
                                               published_at,
                                               feature_image,
                                               title,
                                               status,
                                             }: Partial<GhostPostListItem>): BlogPostListItem {
  if (!id) throw new Error("Cannot convert GhostPost to BlogPost: Missing required field: id");
  if (!title) throw new Error("Cannot convert GhostPost to BlogPost: Missing required field: title");
  if (!status) throw new Error("Cannot convert GhostPost to BlogPost: Missing required field: status");

  const now = Date.now();
  return stripUndefinedKeys({
    id,
    title,
    status,
    created_at: created_at ? new Date(created_at).getTime() : now,
    updated_at: updated_at ? new Date(updated_at).getTime() : now,
    published_at: published_at ? new Date(published_at).getTime() : undefined,
    feature_image: feature_image ? { url: feature_image } : undefined,
  });
}

function GhostPostToBlogPost(args: Partial<GhostPost>): BlogPost {
  return {
    ...GhostPostListItemToBlogPostListItem(args),
    html: args.html ?? "",
  };
}

export default class GhostBlogProvider implements BlogProvider {
  readonly description: string;
  readonly cdnName: string;
  private readonly adminAPI;

  constructor(readonly options: GhostBlogProviderOptions) {
    this.cdnName = options.cdn;
    this.description = options.description;

    this.adminAPI = new GhostAdminAPI({
      url: options.url,
      version: "v5.0",
      key: options.apiKey,
    });
  }

  async getAllPosts(): Promise<BlogPostListItem[]> {
    const posts = (await this.adminAPI.posts.browse({
      limit: "all",
    })) as GhostPostListItem[];
    return posts.map(GhostPostListItemToBlogPostListItem);
  }

  async getRecentPosts(filter: BlogPostFilterOptions): Promise<BlogPostListItem[]> {
    const filterStrings: string[] = [];
    if (filter.keyword) filterStrings.push(`(title:~${filter.keyword},html:~${filter.keyword})`);
    if (filter.status) filterStrings.push(`status:${filter.status}`);

    const filterString = filterStrings.join("+");
    const posts = (await this.adminAPI.posts.browse({
      limit: filter.limit || "all",
      filter: filterString || undefined,
    })) as GhostPostListItem[];
    return posts.map(GhostPostListItemToBlogPostListItem);
  }

  async createPost({ title, html, tags = [], feature_image }: CreatePostData): Promise<BlogPost> {
    const post = await this.adminAPI.posts.add({
      title,
      html,
      tags,
      status: "draft",
      ...(feature_image && { feature_image: feature_image.url })
    }, { source: "html" });
    return GhostPostToBlogPost(post);
  }

  async updatePost(id: string, { title, html, tags, feature_image, status }: UpdatePostData): Promise<BlogPost> {
    if (status === "pending" || status === "private") throw new Error("Ghost does not support pending or private posts");

    const current = await this.adminAPI.posts.read({ id });
    if (!current) throw new Error(`Post with ID ${id} not found`);

    const updateData: GhostPost = { ...current };
    if (title) updateData.title = title;
    if (html) updateData.html = html;
    if (tags) updateData.tags = tags;
    if (feature_image) updateData.feature_image = feature_image.url;
    if (status) updateData.status = status;

    const updatedPost = await this.adminAPI.posts.edit(updateData);
    return GhostPostToBlogPost(updatedPost);
  }

  async getPostById(id: string): Promise<BlogPost> {
    const post = await this.adminAPI.posts.read({ id, formats: "html" });
    if (!post) throw new Error(`Post with ID ${id} not found`);

    return { ...GhostPostToBlogPost(post), html: post.html ?? "" };
  }
}
