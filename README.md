# @tokenring-ai/ghost-io

## Overview

Ghost.io integration package for the Token Ring framework. This package provides seamless integration with Ghost.io publishing platforms for AI-powered blog post management and content creation.

This package exports:
- **GhostBlogProvider**: Connects to Ghost Admin API for post CRUD operations (implements BlogProvider interface)
- **GhostCDNProvider**: Handles image uploads to Ghost CDN (implements CDNProvider interface)
- **GhostBlogState**: Per-agent state management for tracking current post selection
- **Plugin**: Automatic service registration with BlogService and CDNService

## Key Features

- Ghost Admin API v5.0 integration for blog post management
- Ghost Content API support for reading published posts
- Image upload to Ghost CDN with automatic filename generation
- Post filtering and search by keyword and status
- Agent state management for tracking current post selection
- Automatic conversion between Ghost and Token Ring data structures
- Plugin-based architecture for seamless integration with Token Ring applications
- Support for draft, published, and scheduled post statuses
- HTML content format support with Markdown conversion via Lexical

## Installation

Add the package to your project:

```bash
bun add @tokenring-ai/ghost-io
```

## Package Exports

The package exports the following modules:

```typescript
// Main exports
export {default as GhostBlogProvider} from "./GhostBlogProvider.ts";
export {default as GhostCDNProvider} from "./GhostCDNProvider.ts";

// State management
export {GhostBlogState} from "./state/GhostBlogState.ts";

// Plugin
export {default} from "./plugin.ts";
```

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

**Properties**

- `description`: Human-readable description of the blog
- `cdnName`: Name of the CDN provider to use
- `imageGenerationModel`: AI image generation model to use
- `options`: Original configuration options

**Methods**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `attach` | `agent: Agent` | `void` | Attaches provider to agent and initializes state |
| `getCurrentPost` | `agent: Agent` | `BlogPost \| null` | Gets currently selected post |
| `getAllPosts` | - | `Promise<BlogPost[]>` | Fetches all posts from Ghost |
| `getRecentPosts` | `filter: BlogPostFilterOptions, agent: Agent` | `Promise<BlogPost[]>` | Fetches recent posts with filtering |
| `createPost` | `data: CreatePostData, agent: Agent` | `Promise<BlogPost>` | Creates a new draft post |
| `updatePost` | `data: UpdatePostData, agent: Agent` | `Promise<BlogPost>` | Updates currently selected post |
| `selectPostById` | `id: string, agent: Agent` | `Promise<BlogPost>` | Selects a post by ID |
| `clearCurrentPost` | `agent: Agent` | `Promise<void>` | Clears current post selection |

**Important Method Usage:**

- `attach(agent)`: **Required** before using any methods that interact with agent state. Initializes state management and attaches to the agent. Must be called before calling `createPost`, `updatePost`, `selectPostById`, `getCurrentPost`, or `clearCurrentPost`.

- `getCurrentPost(agent)`: Returns the currently selected post from `GhostBlogState`. Returns `null` if no post is selected.

- `getAllPosts()`: Fetches **all** posts from Ghost Admin API. Does not require an active post selection. Returns an array of all posts converted from Ghost's native format.

- `getRecentPosts(filter, agent)`: Fetches recent posts with filtering options. Supports keyword search across title and html content, and filtering by status. Returns posts converted from Ghost's native format.

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

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `upload` | `data: Buffer, options?: UploadOptions` | `Promise<UploadResult>` | Uploads image to Ghost CDN |

**Method Details:**

- `upload(data, options)`: Uploads an image to Ghost CDN. Takes a Buffer containing the image data and optional filename/metadata. Returns an object with the uploaded `url` and `id`. Uses Ghost Admin API's image upload endpoint with FormData. Automatically generates a unique filename using UUID if not provided.

### GhostBlogState

GhostBlogState implements the `AgentStateSlice` interface for per-agent state management.

**Properties:**

- `currentPost`: The currently selected Ghost post object (nullable)

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `reset` | - | `void` | Resets state by clearing current post |
| `serialize` | - | `z.output<serializationSchema>` | Serializes state for persistence |
| `deserialize` | `data: z.output<serializationSchema>` | `void` | Deserializes state from persisted data |
| `show` | - | `string[]` | Returns string representation of state |

**State Schema**

```typescript
const serializationSchema = z.object({
  currentPost: z.any().nullable()
});
```

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

## Tools

This package does not provide any tools directly. It provides provider classes (`GhostBlogProvider`, `GhostCDNProvider`) that are registered with the Token Ring services (BlogService and CDNService) via the plugin system. Agents interact with these providers through the registered services.

## Services

This package does not export service classes directly. Instead, it exports provider classes (`GhostBlogProvider`, `GhostCDNProvider`) that are registered with the BlogService and CDNService at runtime via the plugin system.

### Provider Architecture

The package follows the provider pattern defined by the `@tokenring-ai/blog` and `@tokenring-ai/cdn` packages:

- **GhostBlogProvider**: Implements `BlogProvider` interface for blog post CRUD operations
- **GhostCDNProvider**: Extends `CDNProvider` interface for image upload operations

Providers are registered with their respective services through the plugin system and can be accessed via:

```typescript
import {BlogService} from "@tokenring-ai/blog";

const blogService = agent.requireServiceByType(BlogService);
const provider = blogService.getCurrentProvider();
```

## RPC Endpoints

This package does not define any RPC endpoints. The package provides provider classes that are registered with Token Ring services.

## Chat Commands

This package does not directly expose chat commands. Chat command functionality would be implemented by applications that use this package (e.g., Coder, Writer) by registering commands that utilize the GhostBlogProvider and GhostCDNProvider through the BlogService and CDNService.

## Integration

### Integration with Token Ring Applications

The `@tokenring-ai/ghost-io` package integrates with the Token Ring ecosystem through the following patterns:

#### Plugin Registration

The package provides a plugin that automatically registers providers with the BlogService and CDNService:

```typescript
import {App} from "@tokenring-ai/app";
import ghostIoPlugin from "@tokenring-ai/ghost-io/plugin";

const app = new App();

// Install the plugin with configuration
app.installPlugin(ghostIoPlugin, {
  blog: {
    providers: {
      "my-ghost": {
        type: "ghost",
        url: "https://your-ghost-site.ghost.io",
        apiKey: "your-admin-api-key",
        imageGenerationModel: "gpt-image-1",
        cdn: "ghost-cdn",
        description: "My Ghost Blog"
      }
    }
  },
  cdn: {
    providers: {
      "ghost-cdn": {
        type: "ghost",
        url: "https://your-ghost-site.ghost.io",
        apiKey: "your-admin-api-key"
      }
    }
  }
});
```

#### Service Integration

The package integrates with the following Token Ring services:

| Service | Integration | Purpose |
|---------|-------------|---------|
| `BlogService` | Provider registration | Blog post CRUD operations |
| `CDNService` | Provider registration | Image upload and management |
| `Agent` | State management | Per-agent post selection state |

#### Agent Integration

The package integrates with the Agent system for state management:

```typescript
import {GhostBlogState} from "@tokenring-ai/ghost-io";

// Provider attaches to agent and initializes state
provider.attach(agent);

// State is automatically managed per-agent
const state = agent.getState(GhostBlogState);
```

### Related Packages

- **@tokenring-ai/blog**: Blog service interface and provider system
- **@tokenring-ai/cdn**: CDN service interface and provider system
- **@tokenring-ai/agent**: Agent system and state management
- **@tokenring-ai/app**: Core application framework
- **@tryghost/admin-api**: Ghost Admin SDK

## State Management

### GhostBlogState

GhostBlogState implements the `AgentStateSlice` interface for per-agent state management.

**Properties:**

- `currentPost`: The currently selected Ghost post object (nullable)

**Methods:**

- `reset()`: Resets state by clearing the current post selection
- `serialize()`: Serializes state for persistence
- `deserialize(data)`: Deserializes state from persisted data
- `show()`: Returns a string representation of the current state

**State Schema**

```typescript
const serializationSchema = z.object({
  currentPost: z.any().nullable()
});
```

**State Lifecycle:**

- **Initialization**: Created when `attach(agent)` is called
- **Persistence**: Serialized/deserialized across agent sessions
- **Reset**: Cleared when calling `reset()` or `clearCurrentPost(agent)`
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

// Reset state
state.reset();
```

## Dependencies

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@tokenring-ai/app` | 0.2.0 | Core application framework |
| `@tokenring-ai/chat` | 0.2.0 | Chat command system |
| `zod` | ^4.3.6 | Runtime type validation |
| `@lexical/headless` | ^0.42.0 | Lexical headless mode for content processing |
| `@lexical/markdown` | ^0.42.0 | Markdown conversion for Lexical content |
| `@tokenring-ai/ai-client` | 0.2.0 | AI client integration |
| `@tokenring-ai/blog` | 0.2.0 | Blog service interface and provider system |
| `@tokenring-ai/cdn` | 0.2.0 | CDN service interface and provider system |
| `@tokenring-ai/agent` | 0.2.0 | Agent system and state management |
| `@tokenring-ai/filesystem` | 0.2.0 | Filesystem operations |
| `@tryghost/admin-api` | ^1.14.7 | Official Ghost Admin SDK |
| `form-data` | ^4.0.5 | FormData for image upload |
| `uuid` | ^13.0.0 | UUID generation for filenames |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `vitest` | ^4.1.1 | Unit testing framework |
| `@vitest/coverage-v8` | ^4.1.1 | Code coverage reporting |
| `typescript` | ^6.0.2 | Type definitions and compilation |

## Usage Examples

### Accessing the BlogService

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
import {BlogService} from "@tokenring-ai/blog";

const blogService = agent.requireServiceByType(BlogService);
const provider = blogService.getCurrentProvider();

// Attach provider to agent first (required before state operations)
provider.attach(agent);

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
import {BlogService} from "@tokenring-ai/blog";

const blogService = agent.requireServiceByType(BlogService);
const provider = blogService.getCurrentProvider();

provider.attach(agent);

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
import {BlogService} from "@tokenring-ai/blog";

const blogService = agent.requireServiceByType(BlogService);
const provider = blogService.getCurrentProvider();

provider.attach(agent);

// Get all posts from Ghost
const allPosts = await provider.getAllPosts();

console.log(`Found ${allPosts.length} posts:`);
allPosts.forEach(post => {
  console.log(`- ${post.title} (ID: ${post.id}, Status: ${post.status})`);
});
```

### Example: Filtering Recent Posts

```typescript
import {BlogService} from "@tokenring-ai/blog";

const blogService = agent.requireServiceByType(BlogService);
const provider = blogService.getCurrentProvider();

provider.attach(agent);

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

### Example: Working with Agent State

```typescript
import {BlogService} from "@tokenring-ai/blog";
import {GhostBlogState} from "@tokenring-ai/ghost-io";

const blogService = agent.requireServiceByType(BlogService);
const provider = blogService.getCurrentProvider();

// Attach provider to initialize state
provider.attach(agent);

// Access state directly
const state = agent.getState(GhostBlogState);
console.log("Current post:", state.currentPost?.title);

// Modify state through provider methods
await provider.selectPostById("post-id", agent);

// Check state after modification
const updatedState = agent.getState(GhostBlogState);
console.log("Selected post:", updatedState.currentPost?.title);

// Clear current post selection
await provider.clearCurrentPost(agent);
```

## Error Handling

### Common Errors

- **Post Selection Errors**: 
  - `createPost()` throws error when a post is already selected
  - `updatePost()` throws error when no post is selected
- **API Errors**: Authentication or connection errors from the Ghost Admin API
- **Conversion Errors**: Missing required fields (`id`, `title`, `status`) when converting Ghost posts to BlogPost format
- **Status Errors**: Attempting to set `status: 'pending'` or `status: 'private'` which Ghost does not support

### Error Handling Example

```typescript
try {
  // Attempt to update without selecting a post first
  const post = await provider.updatePost({
    title: "New Title",
    status: "pending" // This will throw an error
  }, agent);
} catch (error) {
  if (error.message.includes("Ghost does not support pending or private posts")) {
    console.log("Use 'draft' or 'published' status instead");
  } else if (error.message.includes("No post is currently selected")) {
    console.log("Select a post first using selectPostById()");
  } else if (error.message.includes("A post is currently selected")) {
    console.log("Clear current post before creating a new one");
  } else {
    console.error("Unexpected error:", error.message);
  }
}
```

### State Management Requirements

All state-dependent methods require `attach(agent)` to be called first:
- `createPost()`
- `updatePost()`
- `selectPostById()`
- `getCurrentPost()`
- `clearCurrentPost()`

Methods that do NOT require `attach()`:
- `getAllPosts()`
- `getRecentPosts()` (requires agent for filtering but not state initialization)

## Testing

The package uses `vitest` for unit testing. Test scripts are configured in `package.json`:

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

### Test Structure

Tests are organized to cover:
- Provider functionality (GhostBlogProvider, GhostCDNProvider)
- State management (GhostBlogState)
- Data conversion utilities
- Integration with Ghost Admin API
- End-to-end workflows

### Building

```bash
# Type check and build
bun run build
```

## License

MIT License - see LICENSE file for details.
