# @tokenring-ai/ghost-io

## Overview

Ghost.io integration package for the Token Ring framework. This package provides seamless integration with Ghost.io publishing platforms for AI-powered blog post management and content creation.

This package exports:

- **GhostBlogProvider**: Connects to Ghost Admin API for post CRUD operations (implements BlogProvider interface)
- **GhostCDNProvider**: Handles image uploads to Ghost CDN (implements CDNProvider interface)
- **Plugin**: Automatic service registration with BlogService and CDNService via account configuration

## Key Features

- Ghost Admin API v5.0 integration for blog post management
- Image upload to Ghost CDN with automatic filename generation
- Post filtering and search by keyword and status
- Automatic conversion between Ghost and Token Ring data structures
- Plugin-based architecture for seamless integration with Token Ring applications
- Support for draft, published, and scheduled post statuses
- HTML content format support
- Environment variable configuration support for multiple Ghost accounts

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
- `options.cdn`: Name of the CDN provider to use (must match CDN provider name)
- `options.description`: Human-readable description of the blog

**Properties**

- `description`: Human-readable description of the blog
- `cdnName`: Name of the CDN provider to use
- `options`: Original configuration

**Methods**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `getAllPosts` | - | `Promise<BlogPostListItem[]>` | Fetches all posts from Ghost |
| `getRecentPosts` | `filter: BlogPostFilterOptions` | `Promise<BlogPostListItem[]>` | Fetches recent posts with filtering |
| `createPost` | `data: CreatePostData` | `Promise<BlogPost>` | Creates a new draft post |
| `updatePost` | `id: string, data: UpdatePostData` | `Promise<BlogPost>` | Updates a post by ID |
| `getPostById` | `id: string` | `Promise<BlogPost>` | Retrieves a post by ID |

**Method Details:**

- **`getAllPosts()`**: Fetches **all** posts from Ghost Admin API. Returns an array of all posts converted from Ghost's native format to `BlogPostListItem`.

- **`getRecentPosts(filter)`**: Fetches recent posts with filtering options. Supports:
  - `filter.keyword`: Keyword search across title and html content
  - `filter.status`: Filter by post status (`draft`, `published`, `scheduled`)
  - `filter.limit`: Limit number of posts (default: "all")
  
  Returns posts converted from Ghost's native format to `BlogPostListItem`.

- **`createPost(data)`**: Creates a new draft post. Creates the post with `status: "draft"` by default.
  
  Parameters:
  - `title`: Post title
  - `html`: Post content in HTML format
  - `tags`: Array of tag names
  - `feature_image`: Optional feature image object with `url` property

- **`updatePost(id, data)`**: Updates a post by ID.
  
  **LIMITATION**: Does not support `status: 'pending'` or `status: 'private'` as Ghost API returns errors for these values.
  
  Parameters:
  - `id`: Post ID to update
  - `data.title`: Optional new title
  - `data.html`: Optional new content
  - `data.tags`: Optional new tags
  - `data.feature_image`: Optional new feature image
  - `data.status`: Optional new status (`draft`, `published`, `scheduled`)

- **`getPostById(id)`**: Retrieves a post by its ID with HTML content. Throws error if post not found.

**Ghost Post Data Structures:**

```typescript
interface GhostPostListItem {
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

interface GhostPost extends GhostPostListItem {
  html?: string;
}
```

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

## Configuration

### Plugin Configuration

The plugin integrates with Token Ring's existing BlogService and CDNService infrastructure using an account-based configuration pattern.

**Configuration Schema:**

```typescript
import {z} from "zod";
import {GhostConfigSchema} from "./schema.ts";

const packageConfigSchema = z.object({
  ghost: GhostConfigSchema.prefault({accounts: {}}),
});

// GhostConfigSchema structure:
{
  accounts: {
    [accountName: string]: {
      url: string;
      apiKey: string;
      blog?: {
        description: string;
        cdn?: string;
      };
      cdn?: {};
    }
  }
}
```

**Plugin Installation:**

```typescript
import {App} from "@tokenring-ai/app";
import ghostIoPlugin from "@tokenring-ai/ghost-io/plugin";

const app = new App();

// Install the plugin with configuration
app.installPlugin(ghostIoPlugin, {
  ghost: {
    accounts: {
      "my-blog": {
        url: "https://your-ghost-site.ghost.io",
        apiKey: "your-admin-api-key",
        blog: {
          description: "My Ghost Blog",
          cdn: "my-cdn"
        },
        cdn: {}
      }
    }
  }
});
```

### Environment Variable Configuration

The plugin automatically loads Ghost accounts from environment variables using the following pattern:

```bash
# Required for each account
GHOST_URL=https://your-ghost-site.ghost.io
GHOST_API_KEY=your-admin-api-key

# Optional
GHOST_ACCOUNT_NAME=my-blog  # Defaults to hostname if not provided
GHOST_DESCRIPTION=My Ghost Blog  # Defaults to "Ghost.io (account-name)"
GHOST_BLOG_CDN=my-cdn  # Optional CDN name for the blog
```

For multiple accounts, append a number to the variable names:

```bash
# Account 1
GHOST_URL=https://blog1.example.com
GHOST_API_KEY=key1

# Account 2
GHOST_URL2=https://blog2.example.com
GHOST_API_KEY2=key2
GHOST_ACCOUNT_NAME2=production-blog
```

### GhostBlogProvider Configuration

```json
{
  "ghost": {
    "accounts": {
      "my-ghost-blog": {
        "url": "https://your-ghost-site.ghost.io",
        "apiKey": "your-admin-api-key",
        "blog": {
          "description": "My Ghost Blog",
          "cdn": "ghost-cdn"
        },
        "cdn": {}
      }
    }
  }
}
```

**Required Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `url` | string | Your Ghost site URL (e.g., `https://demo.ghost.io`) |
| `apiKey` | string | Admin API key for writes (create/update/publish, image upload) |

**Optional Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `blog.description` | string | Human-readable description of the blog (default: "Ghost blog") |
| `blog.cdn` | string | Name of the CDN provider to use |
| `cdn` | object | CDN configuration (empty object enables CDN provider) |

## Tools

This package does not provide any tools directly. It provides provider classes (`GhostBlogProvider`, `GhostCDNProvider`) that are registered with the Token Ring services (BlogService and CDNService) via the plugin system.

## Services

This package does not export service classes directly. Instead, it exports provider classes (`GhostBlogProvider`, `GhostCDNProvider`) that are registered with the BlogService and CDNService at runtime via the plugin system.

### Provider Architecture

The package follows the provider pattern defined by the `@tokenring-ai/blog` and `@tokenring-ai/cdn` packages:

- **GhostBlogProvider**: Implements `BlogProvider` interface for blog post CRUD operations
- **GhostCDNProvider**: Extends `CDNProvider` interface for image upload operations

Providers are registered with their respective services through the plugin system based on the account configuration.

### Service Registration Pattern

The plugin uses the `waitForItemByType` pattern to ensure services are available before registering providers:

```typescript
// BlogService registration
app.services.waitForItemByType(BlogService, (blogService) => {
  blogService.registerBlog(name, new GhostBlogProvider(options));
});

// CDNService registration
app.services.waitForItemByType(CDNService, (cdnService) => {
  cdnService.registerProvider(name, new GhostCDNProvider(options));
});
```

This pattern ensures that:

- Providers are only registered after the target service is initialized
- Multiple accounts can be registered without race conditions
- The service's KeyedRegistry manages multiple provider instances

### Internal Ghost API Interface

The provider wraps the Ghost Admin API with the following interface:

```typescript
interface GhostAPI {
  posts: {
    browse: (params: { limit: string | number, filter?: string }) => Promise<GhostPost[]>;
    add: (data: Omit<GhostPost, "id" | "created_at" | "updated_at">, options?: { source: string }) => Promise<GhostPost>;
    edit: (data: GhostPost) => Promise<GhostPost>;
    read: (params: { id: string, formats?: "html" }) => Promise<GhostPost | null>;
  };
  tags: {
    browse: () => Promise<string[]>;
  };
  images: {
    upload: (data: FormData, options?: { filename: string; purpose: string }) => Promise<{ url: string; id: string; metadata: any }>;
  };
}
```

**Error Handling**

- Throws error if `id`, `title`, or `status` is missing during conversion to `BlogPostListItem`
- Throws error when post not found during `getPostById` or `updatePost`
- Throws error when attempting to use unsupported status values ('pending', 'private')
- Wraps Ghost Admin API errors with descriptive messages

## RPC Endpoints

This package does not define any RPC endpoints. The package provides provider classes that are registered with Token Ring services.

## Chat Commands

This package does not directly expose chat commands. Chat command functionality would be implemented by applications that use this package (e.g., Coder, Writer) by registering commands that utilize the GhostBlogProvider and GhostCDNProvider through the BlogService and CDNService.

## Integration

### Integration with Token Ring Applications

The `@tokenring-ai/ghost-io` package integrates with the Token Ring ecosystem through the following patterns:

#### Plugin Registration

The package provides a plugin that automatically registers providers with the BlogService and CDNService based on configured accounts:

```typescript
import {App} from "@tokenring-ai/app";
import ghostIoPlugin from "@tokenring-ai/ghost-io/plugin";

const app = new App();

// Install the plugin with configuration
app.installPlugin(ghostIoPlugin, {
  ghost: {
    accounts: {
      "production": {
        url: "https://blog.example.com",
        apiKey: "your-admin-api-key",
        blog: {
          description: "Production Blog",
          cdn: "production-cdn"
        },
        cdn: {}
      },
      "staging": {
        url: "https://staging.example.com",
        apiKey: "staging-api-key",
        blog: {
          description: "Staging Blog"
        }
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

### Related Packages

- **@tokenring-ai/blog**: Blog service interface and provider system
- **@tokenring-ai/cdn**: CDN service interface and provider system
- **@tokenring-ai/agent**: Agent system and state management
- **@tokenring-ai/app**: Core application framework
- **@tryghost/admin-api**: Ghost Admin SDK

## Usage Examples

### Accessing the BlogService

After configuration, the GhostBlogProvider is registered with the BlogService. Agents can access it through the service:

```typescript
import {BlogService} from "@tokenring-ai/blog";

// In a tool or service
const blogService = agent.requireServiceByType(BlogService);
const provider = blogService.getBlog("my-blog"); // Get specific provider by name

// Get all posts
const allPosts = await provider.getAllPosts();
```

### Example: Creating a Draft Post

```typescript
import {BlogService} from "@tokenring-ai/blog";

const blogService = agent.requireServiceByType(BlogService);
const provider = blogService.getBlog("my-ghost-blog");

// Create a new post
const newPost = await provider.createPost({
  title: "Hello Ghost from Token Ring",
  html: "<h1>Heading</h1><p>This was written by an agent.</p>",
  tags: ["tokenring", "ghost"],
  feature_image: {
    url: "https://example.com/featured-image.jpg"
  }
});

console.log("Created post:", newPost.id, newPost.title);
```

### Example: Uploading an Image to CDN

```typescript
import {CDNService} from "@tokenring-ai/cdn";

const cdnService = agent.requireServiceByType(CDNService);

// Get specific CDN provider by name
const provider = cdnService.getProvider("my-ghost-blog");

// Upload an image
const imageBuffer = Buffer.from("image-data", "binary");

const result = await provider.upload(imageBuffer, {
  filename: "featured-image.jpg",
  metadata: { category: "blog" }
});

console.log("Uploaded to:", result.url);
```

### Example: Listing and Filtering Posts

```typescript
import {BlogService} from "@tokenring-ai/blog";

const blogService = agent.requireServiceByType(BlogService);
const provider = blogService.getBlog("my-ghost-blog");

// Get all posts from Ghost
const allPosts = await provider.getAllPosts();

console.log(`Found ${allPosts.length} posts:`);
allPosts.forEach(post => {
  console.log(`- ${post.title} (ID: ${post.id}, Status: ${post.status})`);
});

// Filter recent posts
const recentPosts = await provider.getRecentPosts({
  keyword: "tokenring",
  status: "published",
  limit: 10
});

console.log(`Found ${recentPosts.length} posts matching "tokenring":`);
recentPosts.forEach(post => {
  console.log(`- ${post.title} (ID: ${post.id})`);
});
```

### Example: Updating a Post

```typescript
import {BlogService} from "@tokenring-ai/blog";

const blogService = agent.requireServiceByType(BlogService);
const provider = blogService.getBlog("my-ghost-blog");

// First get the post
const post = await provider.getPostById("post-id-here");

// Then update it
const updatedPost = await provider.updatePost("post-id-here", {
  title: "Updated Title",
  html: "<h2>Updated Content</h2><p>This content was updated by an agent.</p>",
  tags: ["updated", "tokenring"],
  status: "draft"
});

console.log("Updated post:", updatedPost.title);
```

## Error Handling

### Common Errors

- **API Errors**: Authentication or connection errors from the Ghost Admin API
- **Conversion Errors**: Missing required fields (`id`, `title`, `status`) when converting Ghost posts to BlogPost format
- **Status Errors**: Attempting to set `status: 'pending'` or `status: 'private'` which Ghost does not support
- **Not Found Errors**: Attempting to update or retrieve a post that doesn't exist

### Error Handling Example

```typescript
try {
  // Attempt to update a non-existent post
  const post = await provider.updatePost("non-existent-id", {
    title: "New Title",
    status: "pending" // This will throw an error
  });
} catch (error) {
  if (error.message.includes("Ghost does not support pending or private posts")) {
    console.log("Use 'draft' or 'published' status instead");
  } else if (error.message.includes("not found")) {
    console.log("Post does not exist");
  } else {
    console.error("Unexpected error:", error.message);
  }
}
```

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

### Building

```bash
# Type check and build
bun run build
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

## License

MIT License - see LICENSE file for details.
