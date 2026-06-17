declare module "@tryghost/admin-api" {
  export interface GhostPostListItem {
    id: string;
    title: string;
    status: "draft" | "published" | "scheduled";
    tags?: string[] | undefined;
    created_at: string;
    updated_at: string;
    feature_image?: string | undefined;
    published_at?: string | undefined;
    excerpt?: string | undefined;
    url?: string | undefined;
    slug?: string | undefined;
  }

  export interface GhostPost extends GhostPostListItem {
    html?: string | undefined;
  }

  import type { FormData } from "form-data";

  export interface ClientOptions {
    url: string;
    key: string;
    version?: string;
  }

  export default class Client {
    constructor(options: ClientOptions);

    posts: {
      browse: (params: { limit: string | number; filter?: string | undefined }) => Promise<GhostPost[]>;
      add: (data: Omit<GhostPost, "id" | "created_at" | "updated_at">, options?: { source: string }) => Promise<GhostPost>;
      edit: (data: GhostPost) => Promise<GhostPost>;
      read: (params: { id: string; formats?: "html" }) => Promise<GhostPost | null>;
    };
    tags: {
      browse: () => Promise<string[]>;
    };
    images: {
      upload: (data: FormData, options?: { filename: string; purpose: string }) => Promise<{ url: string; id: string; metadata: any }>;
    };
  }
}
