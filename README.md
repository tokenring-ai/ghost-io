# @tokenring-ai/ghost-io

## Overview

Ghost.io integration package for the Token Ring framework. This package provides:

- **GhostBlogProvider** to connect to a Ghost site via Admin API (BlogProvider interface)
- **GhostCDNProvider** for image upload to Ghost CDN (CDNProvider interface)
- **GhostBlogState** for tracking the current post selection
- Plugin-based integration for seamless service registration with BlogService and CDNService

This package lets Token Ring agents work with your Ghost blog:

- Browse and select existing posts as working context
- Create new draft posts from Markdown/HTML content
- Read and update post details
- Upload images to Ghost CDN
- Filter and search posts by keyword and status

**Key Implementation Note**: This package does not export service classes directly. Instead, it exports provider classes (`GhostBlogProvider`, `GhostCDNProvider`) that are registered with the BlogService and CDNService at runtime via the plugin system.

## Installation

Add the package to your project:

```bash
bun add @tokenring-ai/ghost-io
```

## Features

- Ghost Admin API integration for blog post management
- Image upload to Ghost CDN
- Post filtering and search by keyword and status
- Agent state management for tracking current post selection
- Automatic conversion between Ghost and Token Ring data structures
- Plugin-based architecture for easy integration with Token Ring applications

## Core Components/API

### GhostBlogProvider

GhostBlogProvider implements the `BlogProvider` interface and provides a typed wrapper over the Ghost Admin API.

**Constructor**

```typescript
constructor(options: GhostBlogProviderOptions)
```

Parameters:
- `options.url`: Your Ghost site URL (e.g., `https://demo.ghost.io`)
- `options.apiKey`: Admin API key for writes (create/update/publish, image upload)
- `options.imageGenerationModel`: AI image generation model to use (e.g., `gpt-image-1`)
- `options.cdn`: Name of the CDN provider to use (must match CDN provider name)
- `options.description`: Human-readable description of the blog

**Methods**

- `attach(agent: Agent): void` - Attaches the provider to an agent and initializes state management
- `getCurrentPost(agent: Agent): BlogPost | null` - Gets the currently selected post
- `getAllPosts(): Promise<BlogPost[]>` - Fetches all posts from the Ghost.io API
- `getRecentPosts(filter: BlogPostFilterOptions, agent: Agent): Promise<BlogPost[]>` - Fetches recent posts with optional filtering
- `createPost(data: CreatePostData, agent: Agent): Promise<BlogPost>` - Creates a new post on Ghost.io
- `updatePost(data: UpdatePostData, agent: Agent): Promise<BlogPost>` - Updates an existing post on Ghost.io
- `selectPostById(id: string, agent: Agent): Promise<BlogPost>` - Selects a post by ID
- `clearCurrentPost(agent: Agent): Promise<void>` - Clears the current post selection from state

**Important Methods:**

- `attach(agent)`: **Required** before using any methods. Initializes state management and attaches to the agent. Must be called before calling createPost, updatePost, selectPostById, getCurrentPost, or clearCurrentPost.

- `getCurrentPost(agent)`: Returns the currently selected post from `GhostBlogState`. Returns `null` if no post is selected.

- `getAllPosts()`: Fetches **all** posts from Ghost Admin API. Does not require an active post selection. Returns an array of all published posts converted from Ghost's native format.

- `getRecentPosts(filter, agent)`: Fetches recent posts with filtering options. Supports keyword search across title and content, and filtering by status. Returns posts converted from Ghost's native format.

- `createPost(data, agent)`: Creates a new draft post. **Requires** calling `attach()` first with the agent. Cannot be called when a post is already selected.

- `updatePost(data, agent)`: Updates the currently selected post. **Requires** calling `attach()` first with the agent and having selected a post via `selectPostById()`. **Does not support** `status: 'pending'` or `status: 'private'` as Ghost API returns errors for these values.

- `selectPostById(id, agent)`: Retrieves a post by its ID and selects it as the current post. Requires `attach()` to be called first with the agent.

- `clearCurrentPost(agent)`: Removes the current post selection from state. Does not delete the post from Ghost.

### GhostCDNProvider

GhostCDNProvider extends the `CDNProvider` interface and handles image uploads to Ghost CDN.

**Constructor**

```typescript
constructor(options: GhostCDNProviderOptions)
```

Parameters:
- `options.url`: Your Ghost site URL
- `options.apiKey`: Admin API key for image upload operations

**Methods**

- `upload(data: Buffer, options?: UploadOptions): Promise<UploadResult>` - Uploads an image buffer to Ghost CDN

**Method:**

- `upload(data, options)`: **Required** to upload images to Ghost. Takes a Buffer containing the image data and optional filename/metadata. Returns an object with the uploaded `url` and `id`. Uses Ghost Admin API's image upload endpoint with FormData.

### GhostBlogState

GhostBlogState implements the `AgentStateSlice` interface for per-agent state management.

**Properties:**

- `currentPost`: The currently selected Ghost post object (nullable)

**Methods:**

- `attach(agent)`: Called automatically during plugin installation. Initializes `GhostBlogState` for the agent.

- `getCurrentPost(agent)`: Access external client via `agent.getState(GhostBlogState)` or `provider.getCurrentPost(agent)`

- `reset(what)`: Resets state when chat ends or explicitly by calling `clearCurrentPost(agent)`

## Configuration

### Plugin Configuration

The plugin integrates with Token Ring's existing BlogService and CDNService infrastructure.

```typescript
import {TokenRingPlugin} from "@tokenring-ai/app";
import {BlogConfigSchema, BlogService} from "@tokenring-ai/blog";
import {CDNConfigSchema, CDNService} from "@tokenring-ai/cdn";
import {z} from "zod";
import GhostBlogProvider, {GhostBlogProviderOptionsSchema} from "./GhostBlogProvider.ts";
import GhostCDNProvider, {GhostCDNProviderOptionsSchema} from "./GhostCDNProvider.ts";
import packageJSON from './package.json' with {type: 'json'};

const packageConfigSchema = z.object({
  cdn: CDNConfigSchema.optional(),
  blog: BlogConfigSchema.optional(),
});

export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    if (config.cdn) {
      app.services.waitForItemByType(CDNService, cdnService => {
        for (const name in config.cdn!.providers) {
          const provider = config.cdn!.providers[name];
          if (provider.type === "ghost") {
            cdnService.registerProvider(name, new GhostCDNProvider(GhostCDNProviderOptionsSchema.parse(provider)));
          }
        }
      });
    }

    if (config.blog) {
      app.services.waitForItemByType(BlogService, blogService => {
        for (const name in config.blog!.providers) {
          const provider = config.blog!.providers[name];
          if (provider.type === "ghost") {
            blogService.registerBlog(name, new GhostBlogProvider(GhostBlogProviderOptionsSchema.parse(provider)));
          }
        }
      });
    }
  },
  config: packageConfigSchema
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
```

### GhostBlogProvider Configuration

Configure the blog provider in your application's blog providers section:

```json
{
  "blog": {
    "providers": {
      "my-ghost-blog": {
        "type": "ghost",
        "url": "https://your-ghost-site.ghost.io",
        "apiKey": "your-admin-api-key",
        "imageGenerationModel": "gpt-image-1",
        "cdn": "ghost-cdn",
        "description": "My Ghost Blog"
      }
    }
  }
}
```

GhostBlogProvider requires the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `type` | string | Must be `"ghost"` for GhostBlogProvider |
| `url` | string | Your Ghost site URL (e.g., `https://demo.ghost.io`) |
| `apiKey` | string | Admin API key for writes (create/update/publish, image upload) |
| `imageGenerationModel` | string | AI image generation model to use (e.g., `gpt-image-1`) |
| `cdn` | string | Name of the CDN provider to use (must match CDN provider name) |
| `description` | string | Human-readable description of the blog |

### GhostCDNProvider Configuration

GhostCDNProvider requires the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `type` | string | Must be `"ghost"` for GhostCDNProvider |
| `url` | string | Your Ghost site URL |
| `apiKey` | string | Admin API key for image upload operations |

## Agent Configuration

If any services have an `attach(agent: Agent)` method that merges in an agent config schema, describe the configuration options and schemas for the agent here.

For GhostBlogProvider, the agent configuration happens through the `attach(agent)` method which initializes `GhostBlogState` for the agent.

## Tools

This package does not provide any tools directly. It provides provider classes (`GhostBlogProvider`, `GhostCDNProvider`) that are registered with the Token Ring services.

## Services

This package does not export service classes directly. Instead, it exports provider classes (`GhostBlogProvider`, `GhostCDNProvider`) that are registered with the BlogService and CDNService at runtime via the plugin system.

### GhostBlogProvider

GhostBlogProvider implements the `BlogProvider` interface and provides a typed wrapper over the Ghost Admin API.

**Interface**

```typescript
interface GhostAdminAPI {
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
```

**GhostPost Interface**

```typescript
interface GhostPost {
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
```

### GhostCDNProvider

GhostCDNProvider extends the `CDNProvider` interface and handles image uploads to Ghost CDN.

## RPC Endpoints

This package does not define any RPC endpoints.

## State Management

### GhostBlogState

GhostBlogState implements the `AgentStateSlice` interface for per-agent state management.

**Properties:**

- `currentPost`: The currently selected Ghost post object (nullable)

**Methods:**

- `attach(agent)`: Called automatically during plugin installation. Initializes `GhostBlogState` for the agent.

- `getCurrentPost(agent)`: Access external client via `agent.getState(GhostBlogState)` or `provider.getCurrentPost(agent)`

- `reset(what)`: Resets state when chat ends or explicitly by calling `clearCurrentPost(agent)`

**State Schema**

```typescript
const serializationSchema = z.object({
  currentPost: z.any().nullable()
});
```

**State Lifecycle:**

- **Initialization**: Created when `attach(agent)` is called
- **Persistence**: Serialized/deserialized across agent sessions
- **Reset**: Cleared when chat ends (chat reset)
- **Inheritance**: Child agents inherit parent's `currentPost` selection

### State Access

```typescript
// Initialize state
agent.initializeState(GhostBlogState, {});

// Access state
const state = agent.getState(GhostBlogState);
console.log(state.currentPost?.title);

// Modify state
agent.mutateState(GhostBlogState, (state) => {
  state.currentPost = selectedPost;
});

// Serialize/deserialize
const data = state.serialize();
const newState = new GhostBlogState(data);

// Reset on chat end
state.reset(['chat']);
```

## Dependencies

### Production Dependencies

- `@tokenring-ai/app`: Core application framework
- `@tokenring-ai/blog`: Blog service interface and provider system
- `@tokenring-ai/cdn`: CDN service interface and provider system
- `@tokenring-ai/agent`: Agent system and state management
- `@tryghost/admin-api`: Official Ghost Admin SDK
- `@tryghost/content-api`: Official Ghost Content SDK
- `@lexical/headless`: Lexical editor integration
- `@lexical/markdown`: Markdown content format
- `zod`: Runtime type validation
- `form-data`: Used for image upload with Ghost API
- `uuid`: Generates unique filenames for uploads

### Development Dependencies

- `vitest`: Unit testing framework
- `@vitest/coverage-v8`: Code coverage reporting
- `typescript`: Type definitions

## Usage Examples

### Accessing the GhostBlogService

After configuration, the GhostBlogProvider is registered with the BlogService. Agents can access it through the service:

```typescript
import {BlogService} from "@tokenring-ai/blog";

// In a tool or service
const blogService = agent.requireServiceByType(BlogService);

// Get all posts
const allPosts = await blogService.getCurrentProvider().getAllPosts();

// Access provider directly if needed
const provider = blogService.getCurrentProvider();
```

### Example: Creating a Draft Post

```typescript
import type { BlogService } from "@tokenring-ai/blog";

const blogService = agent.requireServiceByType(BlogService);
const provider = blogService.getCurrentProvider();

// Create a new post (requires attach() to be called on provider with agent)
await provider.attach(agent);

// Create a new post
const newPost = await provider.createPost({
  title: "Hello Ghost from Token Ring",
  content: "# Heading\n\nThis was written by an agent.",
  tags: ["tokenring", "ghost"],
  feature_image: {
    url: "https://example.com/featured-image.jpg"
  }
}, agent);

console.log("Created post:", newPost.id, newPost.title);
```

### Example: Uploading an Image to CDN

```typescript
import {CDNService} from "@tokenring-ai/cdn";

const cdnService = agent.requireServiceByType(CDNService);

// Find the Ghost CDN provider
const providers = cdnService.getProviders();
const ghostProvider = providers.find(p => p.type === "ghost");

// Upload an image
const imageBuffer = Buffer.from("image-data", "binary");

const result = await ghostProvider.upload(imageBuffer, {
  filename: "featured-image.jpg",
  metadata: { category: "blog" }
});

console.log("Uploaded to:", result.url);
```

### Example: Selecting and Updating a Post

```typescript
import type { BlogService } from "@tokenring-ai/blog";

const blogService = agent.requireServiceByType(BlogService);
const provider = blogService.getCurrentProvider();

await provider.attach(agent);

// First select a post by ID
const post = await provider.selectPostById("post-id-here", agent);

// Then update it
const updatedPost = await provider.updatePost({
  title: "Updated Title",
  content: "## Updated Content\n\nThis content was updated by an agent.",
  tags: ["updated", "tokenring"],
  status: "draft",
  feature_image: {
    url: "https://example.com/new-featured-image.jpg"
  }
}, agent);

console.log("Updated post:", updatedPost.title);
```

### Example: Listing All Posts

```typescript
import type { BlogService } from "@tokenring-ai/blog";

const blogService = agent.requireServiceByType(BlogService);
const provider = blogService.getCurrentProvider();

await provider.attach(agent);

// Get all posts from Ghost
const allPosts = await provider.getAllPosts();

console.log(`Found ${allPosts.length} posts:`);
allPosts.forEach(post => {
  console.log(`- ${post.title} (ID: ${post.id}, Status: ${post.status})`);
});
```

### Example: Filtering Recent Posts

```typescript
import type { BlogService } from "@tokenring-ai/blog";

const blogService = agent.requireServiceByType(BlogService);
const provider = blogService.getCurrentProvider();

await provider.attach(agent);

// Get recent posts with keyword filter
const recentPosts = await provider.getRecentPosts({
  keyword: "tokenring",
  status: "published",
  limit: 10
}, agent);

console.log(`Found ${recentPosts.length} posts matching "tokenring":`);
recentPosts.forEach(post => {
  console.log(`- ${post.title} (ID: ${post.id})`);
});
```

## Testing

```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage

# Run integration tests
bun run test:integration

# Run e2e tests
bun run test:e2e

# Run all tests including external integration tests
bun run test:all
```

## License

MIT License - see LICENSE file for details.
