import type {BlogPost, BlogPostFilterOptions, BlogPostListItem, BlogProvider, CreatePostData, UpdatePostData} from "@tokenring-ai/blog/BlogProvider";
// @ts-expect-error
import GhostAdminAPI from "@tryghost/admin-api";
import type FormData from "form-data";
import type {GhostBlogProviderOptions} from "./schema.ts";

export interface GhostAPI {
  posts: {
    browse: (params: { limit: string | number, filter?: string | undefined }) => Promise<GhostPost[]>;
    add: (data: Omit<GhostPost, "id" | "created_at" | "updated_at">, options?: { source: string }) => Promise<GhostPost>;
    edit: (data: GhostPost) => Promise<GhostPost>;
    read: (params: { id: string, formats?: "html" }) => Promise<GhostPost | null>;
  };
  tags: {
    browse: () => Promise<string[]>;
  };
  images: {
    upload: (
      data: FormData,
      options?: { filename: string; purpose: string },
    ) => Promise<{ url: string; id: string; metadata: any }>;
  };
}

export interface GhostPostListItem {
  id: string;
  title: string;
  status: "draft" | "published" | "scheduled";
  tags?: string[];
  created_at: string;
  updated_at: string;
  feature_image?: string;
  published_at?: string;
  excerpt?: string;
  url?: string;
  slug?: string;
}

export interface GhostPost extends GhostPostListItem {
  html?: string;
}

function GhostPostListItemToBlogPostListItem({
                                               id,
                                               created_at,
                                               updated_at,
                                               published_at,
                                               feature_image,
                                               title,
                                               status,
                                             }: Partial<GhostPostListItem>): BlogPostListItem {
  if (!id)
    throw new Error(
      "Cannot convert GhostPost to BlogPost: Missing required field: id",
    );
  if (!title)
    throw new Error(
      "Cannot convert GhostPost to BlogPost: Missing required field: title",
    );
  if (!status)
    throw new Error(
      "Cannot convert GhostPost to BlogPost: Missing required field: status",
    );

  const now = Date.now();
  return {
    id,
    title,
    status,
    created_at: created_at ? new Date(created_at).getTime() : now,
    updated_at: updated_at ? new Date(updated_at).getTime() : now,
    published_at: published_at ? new Date(published_at).getTime() : undefined,
    feature_image: feature_image ? {url: feature_image} : undefined,
  };
}

function GhostPostToBlogPost(args: Partial<GhostPost>): BlogPost {
  return {
    ...GhostPostListItemToBlogPostListItem(args),
    html: args.html ?? "",
  };
}

export default class GhostBlogProvider implements BlogProvider {
  private readonly adminAPI: GhostAPI;
  readonly description: string;
  readonly cdnName: string;

  constructor(readonly options: GhostBlogProviderOptions) {
    this.cdnName = options.cdn;
    this.description = options.description;

    this.adminAPI = new GhostAdminAPI({
      url: options.url,
      version: "v5.0",
      key: options.apiKey,
    }) as unknown as GhostAPI;
  }

  async getAllPosts(): Promise<BlogPostListItem[]> {
    const posts = (await this.adminAPI.posts.browse({
      limit: "all",
    })) as GhostPostListItem[];
    return posts.map(GhostPostListItemToBlogPostListItem);
  }

  async getRecentPosts(
    filter: BlogPostFilterOptions,
  ): Promise<BlogPostListItem[]> {
    const filterStrings: string[] = [];
    if (filter.keyword)
      filterStrings.push(`(title:~${filter.keyword},html:~${filter.keyword})`);
    if (filter.status) filterStrings.push(`status:${filter.status}`);

    const filterString = filterStrings.join("+");
    const posts = (await this.adminAPI.posts.browse({
      limit: filter.limit || "all",
      filter: filterString || undefined,
    })) as GhostPostListItem[];
    return posts.map(GhostPostListItemToBlogPostListItem);
  }

  async createPost({
                     title,
                     html,
                     tags = [],
                     feature_image,
                   }: CreatePostData): Promise<BlogPost> {
    const post = await this.adminAPI.posts.add(
      {title, html, tags, status: "draft", feature_image: feature_image?.url},
      {source: "html"},
    );
    return GhostPostToBlogPost(post);
  }

  async updatePost(
    id: string,
    {title, html, tags, feature_image, status}: UpdatePostData,
  ): Promise<BlogPost> {
    if (status === "pending" || status === "private")
      throw new Error("Ghost does not support pending or private posts");

    const current = await this.adminAPI.posts.read({id});
    if (!current) throw new Error(`Post with ID ${id} not found`);

    const updateData: GhostPost = {...current};
    if (title) updateData.title = title;
    if (html) updateData.html = html;
    if (tags) updateData.tags = tags;
    if (feature_image) updateData.feature_image = feature_image.url;
    if (status) updateData.status = status;

    const updatedPost = await this.adminAPI.posts.edit(updateData);
    return GhostPostToBlogPost(updatedPost);
  }

  async getPostById(id: string): Promise<BlogPost> {
    const post = await this.adminAPI.posts.read({id, formats: "html"});
    if (!post) throw new Error(`Post with ID ${id} not found`);

    return {...GhostPostToBlogPost(post), html: post.html ?? ""};
  }
}