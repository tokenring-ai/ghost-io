# @tokenring-ai/ghost-io

Ghost.io integration package for the Token Ring writer. It provides:

- **GhostBlogProvider** to connect to a Ghost site (Admin API)
- **GhostCDNProvider** for image upload to Ghost CDN
- **GhostBlogState** for tracking the current post selection
- Plugin-based integration for seamless service registration

## Overview

This package lets Token Ring agents work with your Ghost blog:

- Browse and select existing posts as working context
- Create new draft posts from Markdown/HTML content
- Read and update post details
- Upload images to Ghost CDN

Internally it wraps the official Ghost Admin SDK and maintains a `currentPost` state used by tools and chat commands.

## Installation

This package lives in the monorepo and is consumed by the writer app. To add it in a custom setup:

```ts
import GhostIoPlugin from "@tokenring-ai/ghost-io";
import { Registry } from "@tokenring-ai/registry";

const registry = new Registry();
await registry.start();

// The plugin handles service registration automatically when configured
```

In the Token Ring writer, this package is already imported and can be enabled via configuration.

## Plugin Configuration

The plugin is configured through your application config:

```typescript
const config = {
  ghost: {
    cdn: {
      providers: {
        "ghost-cdn": {
          type: "ghost",
          url: "https://your-ghost-site.ghost.io",
          apiKey: process.env.GHOST_ADMIN_API_KEY,
        },
      },
    },
    blog: {
      providers: {
        "ghost-blog": {
          type: "ghost",
          url: "https://your-ghost-site.ghost.io",
          apiKey: process.env.GHOST_ADMIN_API_KEY,
          imageGenerationModel: "gpt-image-1",
          cdn: "ghost-cdn",
          description: "My Ghost Blog",
        },
      },
    },
  },
};
```

### GhostBlogProvider Configuration

GhostBlogProvider requires:

| Property | Type | Description |
|----------|------|-------------|
| `url` | string | Your Ghost site URL (e.g., `https://demo.ghost.io`) |
| `apiKey` | string | Admin API key for writes (create/update/publish, image upload) |
| `imageGenerationModel` | string | AI image generation model to use (e.g., `gpt-image-1`) |
| `cdn` | string | CDN provider name configured in the CDN service |
| `description` | string | Human-readable description of the blog |

### GhostCDNProvider Configuration

GhostCDNProvider requires:

| Property | Type | Description |
|----------|------|-------------|
| `url` | string | Your Ghost site URL |
| `apiKey` | string | Admin API key |

## Package Structure

```
pkg/ghost-io/
├── index.ts                 # Main exports
├── plugin.ts                # Token Ring plugin for auto-registration
├── GhostBlogProvider.ts     # Blog provider implementation
├── GhostCDNProvider.ts      # CDN provider implementation
├── state/
│   └── GhostBlogState.ts    # State management for current post
└── docs/                    # Ghost API reference documentation
```

## Core Components

### GhostBlogProvider

GhostBlogProvider implements the `BlogProvider` interface and provides a typed wrapper over the Ghost Admin API:

```typescript
class GhostBlogProvider implements BlogProvider {
  constructor(options: GhostBlogProviderOptions);

  // State management
  attach(agent: Agent): Promise<void>;

  // Post operations
  getCurrentPost(agent: Agent): BlogPost | null;
  getAllPosts(): Promise<BlogPost[]>;
  createPost(data: CreatePostData, agent: Agent): Promise<BlogPost>;
  updatePost(data: UpdatePostData, agent: Agent): Promise<BlogPost>;
  selectPostById(id: string, agent: Agent): Promise<BlogPost>;
  clearCurrentPost(agent: Agent): Promise<void>;
}
```

**Methods:**

- `getCurrentPost(agent)`: Returns the currently selected post from state
- `getAllPosts()`: Fetches all posts from the Ghost Admin API
- `createPost(data, agent)`: Creates a new draft post (requires no current post selection)
- `updatePost(data, agent)`: Updates the currently selected post
- `selectPostById(id, agent)`: Fetches a post by ID and selects it
- `clearCurrentPost(agent)`: Clears the current post selection

### GhostCDNProvider

GhostCDNProvider implements the `CDNProvider` interface and handles image uploads:

```typescript
class GhostCDNProvider extends CDNProvider {
  constructor(options: GhostCDNProviderOptions);

  upload(data: Buffer, options?: UploadOptions): Promise<UploadResult>;
}
```

**Method:**

- `upload(data, options)`: Uploads an image buffer to Ghost CDN, returns the uploaded URL

### GhostBlogState

GhostBlogState implements the `AgentStateSlice` interface for state management:

```typescript
class GhostBlogState implements AgentStateSlice {
  name: "GhostBlogState";
  currentPost: GhostPost | null;

  reset(what: ResetWhat[]): void;
  serialize(): object;
  deserialize(data: any): void;
  show(): string[];
}
```

## Type Definitions

### GhostBlogProviderOptions

```typescript
export type GhostBlogProviderOptions = {
  url: string;
  apiKey: string;
  imageGenerationModel: string;
  cdn: string;
  description: string;
};
```

### GhostCDNProviderOptions

```typescript
export type GhostCDNProviderOptions = {
  url: string;
  apiKey: string;
};
```

### GhostPost

```typescript
export interface GhostPost {
  id: string;
  title: string;
  content?: string;
  html?: string;
  status: 'draft' | 'published' | 'scheduled';
  tags?: string[];
  created_at: string;
  updated_at: string;
  published_at?: string;
  feature_image?: string;
  excerpt?: string;
  url?: string;
  slug?: string;
}
```

### BlogPost

```typescript
export interface BlogPost {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'published' | 'scheduled';
  created_at: Date;
  updated_at: Date;
  published_at: Date;
  feature_image?: { url: string };
}
```

### CreatePostData

```typescript
export interface CreatePostData {
  title: string;
  content: string;
  tags?: string[];
  feature_image?: { url: string };
}
```

### UpdatePostData

```typescript
export interface UpdatePostData {
  title?: string;
  content?: string;
  tags?: string[];
  feature_image?: { url: string };
  status?: 'draft' | 'published' | 'scheduled';
}
```

## Usage Examples

### Example: Creating a Draft Post

```typescript
import { GhostBlogProvider } from "@tokenring-ai/ghost-io";
import type { Agent } from "@tokenring-ai/agent";

const provider = new GhostBlogProvider({
  url: "https://your-ghost-site.com",
  apiKey: "your-admin-api-key",
  imageGenerationModel: "gpt-image-1",
  cdn: "ghost-cdn",
  description: "My Ghost Blog"
});

// Create a new post (agent required for state management)
const newPost = await provider.createPost({
  title: "Hello Ghost from Token Ring",
  content: "# Heading\n\nThis was written by an agent.",
  tags: ["tokenring", "ghost"]
}, agent);

console.log("Created post:", newPost.id, newPost.title);
```

### Example: Uploading an Image to CDN

```typescript
import { GhostCDNProvider } from "@tokenring-ai/ghost-io";

const provider = new GhostCDNProvider({
  url: "https://your-ghost-site.com",
  apiKey: "your-admin-api-key"
});

// Assuming you have a file buffer from somewhere
const imageBuffer = Buffer.from("image-data", "binary");

const result = await provider.upload(imageBuffer, {
  filename: "featured-image.jpg"
});

console.log("Uploaded to:", result.url);
```

### Example: Selecting and Updating a Post

```typescript
import { GhostBlogProvider } from "@tokenring-ai/ghost-io";

const provider = new GhostBlogProvider({
  url: "https://your-ghost-site.com",
  apiKey: "your-admin-api-key",
  imageGenerationModel: "gpt-image-1",
  cdn: "ghost-cdn",
  description: "My Ghost Blog"
});

// First select a post by ID
const post = await provider.selectPostById("post-id-here", agent);

// Then update it
const updatedPost = await provider.updatePost({
  title: "Updated Title",
  content: "## Updated Content\n\nThis content was updated by an agent.",
  tags: ["updated", "tokenring"],
  status: "draft"
}, agent);

console.log("Updated post:", updatedPost.title);
```

## Integration with Agent System

The package integrates with the Token Ring agent system through:

1. **State Management**: `GhostBlogState` tracks the current post selection via `agent.getState(GhostBlogState)`
2. **Plugin Architecture**: Automatically registers providers when the app starts with the correct configuration
3. **Service Registry**: Providers are registered with `BlogService` and `CDNService` via `app.services.waitForItemByType()`

### State Lifecycle

The `GhostBlogState` is reset when:

- Chat session ends (`what.includes('chat')`)
- User explicitly clears the selection

## Development

### Testing

```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage
```

### Building

```bash
# Type check the package
bun run build
```

## Notes and Caveats

- GhostBlogProvider only uses the Admin API (not Content API) for all operations
- Some operations rely on `currentPost`; use `selectPostById` to set context before updating
- The package provides two distinct providers: `GhostBlogProvider` for blog posts and `GhostCDNProvider` for image uploads
- Ensure your Ghost site is running Ghost 5.0+ for full API compatibility
- The `imageGenerationModel` configures which AI model to use for generating featured images

## License

MIT License - see [LICENSE](./LICENSE) file for details.
