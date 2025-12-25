# @tokenring-ai/ghost-io

Ghost.io integration package for the Token Ring writer. It provides:

- **GhostBlogProvider** to connect to a Ghost site (Admin + Content APIs)
- **GhostCDNProvider** for image upload to Ghost CDN
- State management through **GhostBlogState** for tracking the current post
- Plugin-based integration for seamless service registration

## What does it do?

This package lets Token Ring agents and the interactive REPL work with your Ghost blog:

- Browse and select existing posts as working context
- Create new draft posts from Markdown content
- Generate AI images and set them as featured images
- Read and update post details
- Upload images to Ghost CDN

Internally it wraps the official Ghost Admin and Content SDKs and maintains a `currentPost` state used by tools and chat commands.

## Installation / Enabling

This package lives in the monorepo and is consumed by the writer app. To add it in a custom Registry setup:

```ts
import { GhostBlogProvider, GhostCDNProvider } from "@tokenring-ai/ghost-io";
import { BlogService, CDNService } from "@tokenring-ai/blog";
import { CDNService } from "@tokenring-ai/cdn";
import { Registry } from "@tokenring-ai/registry";

const registry = new Registry();
await registry.start();

// Configure CDN service with Ghost CDN provider
registry.services.addServices(
  new CDNService().registerProvider("ghost", new GhostCDNProvider({
    url: process.env.GHOST_URL!,
    apiKey: process.env.GHOST_ADMIN_API_KEY!
  }))
);

// Configure blog service with Ghost blog provider
registry.services.addServices(
  new BlogService().registerBlog("ghost", new GhostBlogProvider({
    url: process.env.GHOST_URL!,
    apiKey: process.env.GHOST_ADMIN_API_KEY!,
    imageGenerationModel: "gpt-image-1",
    cdn: "ghost",
    description: "Ghost blog integration"
  }))
);

// The package provides plugin-based integration that automatically registers services
// when the app starts with the correct configuration
```

In the Token Ring writer (see `src/tr-writer.ts`), this package is already imported and can be enabled via configuration.

## Configuration

### GhostBlogProvider Configuration

GhostBlogProvider requires connection details for your Ghost site:

- `url`: string — Your Ghost site URL (e.g., `https://demo.ghost.io`)
- `apiKey`: string — Admin API key for writes (create/update/publish, image upload)
- `imageGenerationModel`: string — AI image generation model to use (e.g., `gpt-image-1`)
- `cdn`: string — CDN provider name configured in the CDN service
- `description`: string — Human-readable description of the blog

### GhostCDNProvider Configuration

GhostCDNProvider requires:

- `url`: string — Your Ghost site URL
- `apiKey`: string — Admin API key

Example environment variables:

```bash
GHOST_URL=https://your-ghost-site.example
GHOST_ADMIN_API_KEY=YOUR_ADMIN_KEY
GHOST_CONTENT_API_KEY=YOUR_CONTENT_API_KEY
```

Sample arguments exported by the service:

```ts
GhostBlogProvider.sampleArguments
// {
//   url: "https://ghost.io",
//   apiKey: "YOUR_ADMIN_API_KEY",
//   imageGenerationModel: "gpt-image-1",
//   cdn: "ghost",
//   description: "Ghost blog integration"
// }

GhostCDNProvider.sampleArguments
// {
//   url: "https://ghost.io",
//   apiKey: "YOUR_ADMIN_API_KEY"
// }
```

## Package Structure

```
pkg/ghost-io/
├── index.ts              # Main exports
├── plugin.ts             # Token Ring plugin for auto-registration
├── GhostBlogProvider.ts  # Blog provider implementation
├── GhostCDNProvider.ts   # CDN provider implementation
├── state/
│   └── GhostBlogState.ts # State management for current post
└── tools/               # (Future: tools for agent integration)
```

## Core Components

### GhostBlogProvider

GhostBlogProvider provides a typed wrapper over the Ghost SDKs:

- `getCurrentPost(agent: Agent)`: Get the currently selected post
- `getAllPosts()`: Browse all posts (Admin API)
- `createPost(data: CreatePostData, agent: Agent)`: Create a new post (Admin API)
- `updatePost(data: UpdatePostData, agent: Agent)`: Update the selected post (Admin API)
- `selectPostById(id: string, agent: Agent)`: Fetch and select a post by ID (Content API)
- `clearCurrentPost(agent: Agent)`: Clear the current post selection
- `publishPost(agent: Agent)`: Publish the selected post (requires currentPost)

### GhostCDNProvider

GhostCDNProvider handles image uploads:

- `upload(data: Buffer, options?: UploadOptions)`: Upload an image to Ghost CDN

### GhostBlogState

State management for tracking the current post:

- `currentPost`: The currently selected Ghost post (or null)
- State persistence across chat sessions
- Automatic reset when chat session ends

## Chat Command

Command: `/ghost`

Usage: `/ghost [post|cdn] [select|info|new]`

- `post select`: Open a tree selector to choose an existing post or clear selection
- `post info`: Show details about the currently selected post (title, status, dates, tags, URL)
- `post new`: Clear selection to indicate the next operations should create a new post
- `cdn upload`: Upload an image to Ghost CDN (requires file selection)

The selection state is stored in `GhostBlogState.currentPost` and is cleared when you choose "Clear selection" or run `/ghost post new`.

## Service API Reference

### GhostBlogProvider Interface

```typescript
interface GhostBlogProvider {
  getCurrentPost(agent: Agent): BlogPost | null;
  getAllPosts(): Promise<BlogPost[]>;
  createPost(data: CreatePostData, agent: Agent): Promise<BlogPost>;
  updatePost(data: UpdatePostData, agent: Agent): Promise<BlogPost>;
  selectPostById(id: string, agent: Agent): Promise<BlogPost>;
  clearCurrentPost(agent: Agent): Promise<void>;
  publishPost(agent: Agent): Promise<BlogPost>;
}
```

### CreatePostData

```typescript
interface CreatePostData {
  title: string;
  content: string;
  tags?: string[];
  feature_image?: { url: string };
}
```

### UpdatePostData

```typescript
interface UpdatePostData {
  title?: string;
  content?: string;
  tags?: string[];
  feature_image?: { url: string };
  status?: 'draft' | 'published' | 'scheduled';
}
```

### GhostCDNProvider Interface

```typescript
interface GhostCDNProvider {
  upload(data: Buffer, options?: UploadOptions): Promise<UploadResult>;
}
```

## Example: Creating a draft from Markdown

```ts
import { GhostBlogProvider } from "@tokenring-ai/ghost-io";

const provider = new GhostBlogProvider({
  url: "https://your-ghost-site.com",
  apiKey: "your-admin-api-key",
  imageGenerationModel: "gpt-image-1",
  cdn: "ghost",
  description: "My Ghost Blog"
});

// Create a new post
const newPost = await provider.createPost({
  title: "Hello Ghost from Token Ring",
  content: "# Heading\n\nThis was written by an agent.",
  tags: ["tokenring", "ghost"]
}, agent);

console.log("Created post:", newPost.id, newPost.title);
```

## Example: Uploading an image to CDN

```ts
import { GhostCDNProvider } from "@tokenring-ai/ghost-io";

const provider = new GhostCDNProvider({
  url: "https://your-ghost-site.com",
  apiKey: "your-admin-api-key"
});

// Assuming you have a file buffer from somewhere
const imageBuffer = Buffer.from("image-data", "binary");

const result = await provider.upload(imageBuffer, {
  filename: "featured-image.jpg",
  purpose: "image"
});

console.log("Uploaded to:", result.url);
```

## Example: Selecting and updating a post

```ts
import { GhostBlogProvider } from "@tokenring-ai/ghost-io";

const provider = new GhostBlogProvider({
  url: "https://your-ghost-site.com",
  apiKey: "your-admin-api-key",
  imageGenerationModel: "gpt-image-1",
  cdn: "ghost",
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

1. **State Management**: `GhostBlogState` tracks the current post selection
2. **Plugin Architecture**: Automatically registers services when the app starts
3. **Service Registry**: Services are registered with the application framework via plugins

## Dependencies

This package depends on:

- `@tokenring-ai/app`: Base application framework
- `@tokenring-ai/blog`: Blog service abstraction
- `@tokenring-ai/cdn`: CDN service abstraction
- `@tokenring-ai/agent`: Agent system
- `@tryghost/admin-api`: Official Ghost Admin API client
- `@tryghost/content-api`: Official Ghost Content API client
- `form-data`: For image uploads
- `uuid`: For generating unique filenames

## Development

### Testing

Run tests with:

```bash
bun run test
bun run test:watch
bun run test:coverage
```

### Building

Build the package with:

```bash
bun run build
```

## Notes and Caveats

- You must configure both Admin and Content API keys.
- Some operations rely on `currentPost`; use `selectPostById` or the `/ghost post select` command to set context.
- The package provides two distinct providers: `GhostBlogProvider` for blog posts and `GhostCDNProvider` for image uploads.
- Ensure your Ghost site is running Ghost 5.0+ for full API compatibility.

## License

MIT (see repository LICENSE)