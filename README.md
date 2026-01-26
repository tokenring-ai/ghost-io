# @tokenring-ai/ghost-io

Ghost.io integration package for the Token Ring framework. This package provides:

- **GhostBlogProvider** to connect to a Ghost site via Admin API (BlogProvider interface)
- **GhostCDNProvider** for image upload to Ghost CDN (CDNProvider interface)
- **GhostBlogState** for tracking the current post selection
- Plugin-based integration for seamless service registration with BlogService and CDNService

## Overview

This package lets Token Ring agents work with your Ghost blog:

- Browse and select existing posts as working context
- Create new draft posts from Markdown/HTML content
- Read and update post details
- Upload images to Ghost CDN

**Key Implementation Note**: This package does not export service classes directly. Instead, it exports provider classes (`GhostBlogProvider`, `GhostCDNProvider`) that are registered with the BlogService and CDNService at runtime via the plugin system.

## Package Structure

```
pkg/ghost-io/
├── index.ts                 # Main type exports (GhostBlogProvider, GhostCDNProvider)
├── plugin.ts                # Token Ring plugin for auto-registration
├── GhostBlogProvider.ts     # Blog provider implementation
├── GhostCDNProvider.ts      # CDN provider implementation
├── state/
│   └── GhostBlogState.ts    # State management for current post
└── docs/                    # Ghost API reference documentation
```

## Installation

Add the package to your project:

```bash
bun add @tokenring-ai/ghost-io
```

## Plugin Configuration

The plugin integrates with Token Ring's existing BlogService and CDNService infrastructure:

```typescript
import {TokenRingPlugin} from "@tokenring-ai/app";
import {z} from "zod";
import packageJSON from './package.json' with {type: 'json'};

const packageConfigSchema = z.object({
  cdn: z.object({
    providers: z.record(z.string(), z.object({
      type: z.literal("ghost"),
      url: z.string(),
      apiKey: z.string()
    }))
  }).optional(),
  blog: z.object({
    providers: z.record(z.string(), z.object({
      type: z.literal("ghost"),
      url: z.string(),
      apiKey: z.string(),
      imageGenerationModel: z.string(),
      cdn: z.string(),
      description: z.string()
    }))
  }).optional()
});

export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  config: packageConfigSchema,
  install(app, config) {
    if (config.cdn) {
      app.services.waitForItemByType(CDNService, cdnService => {
        for (const name in config.cdn!.providers) {
          const provider = config.cdn!.providers[name];
          if (provider.type === "ghost") {
            cdnService.registerProvider(name, new GhostCDNProvider(provider));
          }
        }
      });
    }

    if (config.blog) {
      app.services.waitForItemByType(BlogService, blogService => {
        for (const name in config.blog!.providers) {
          const provider = config.blog!.providers[name];
          if (provider.type === "ghost") {
            blogService.registerBlog(name, new GhostBlogProvider(provider));
          }
        }
      });
    }
  }
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
```

### Configuring GhostBlogProvider

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

### GhostBlogProvider Configuration

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

## Core Components

### GhostBlogProvider

GhostBlogProvider implements the `BlogProvider` interface and provides a typed wrapper over the Ghost Admin API:

```typescript
export default class GhostBlogProvider implements BlogProvider {
  private readonly adminAPI: GhostAdminAPI;
  description: string;
  cdnName: string;
  imageGenerationModel: string;

  constructor(options: GhostBlogProviderOptions);

  /**
   * Attaches the provider to an agent and initializes state management
   */
  attach(agent: Agent): void;

  /**
   * Gets the currently selected post
   */
  getCurrentPost(agent: Agent): BlogPost | null;

  /**
   * Fetches all posts from the Ghost.io API
   */
  getAllPosts(): Promise<BlogPost[]>;

  /**
   * Creates a new post on Ghost.io
   * @throws {Error} if a post is currently selected
   */
  createPost(data: CreatePostData, agent: Agent): Promise<BlogPost>;

  /**
   * Updates an existing post on Ghost.io
   * @throws {Error} if no post is currently selected
   * @throws {Error} if status is 'pending' or 'private' (Ghost does not support these)
   */
  updatePost(data: UpdatePostData, agent: Agent): Promise<BlogPost>;

  /**
   * Selects a post by ID
   * @throws {Error} if post not found
   */
  selectPostById(id: string, agent: Agent): Promise<BlogPost>;

  /**
   * Clears the current post selection from state
   */
  clearCurrentPost(agent: Agent): Promise<void>;
}
```

**Important Methods:**

- `attach(agent)`: **Required** before using any methods. Initializes state management and attaches to the agent. Must be called before calling createPost, updatePost, selectPostById, getCurrentPost, or clearCurrentPost.

- `getCurrentPost(agent)`: Returns the currently selected post from `GhostBlogState`. Returns `null` if no post is selected.

- `getAllPosts()`: Fetches **all** posts from Ghost Admin API. Does not require an active post selection. Returns an array of all published posts converted from Ghost's native format.

- `createPost(data, agent)`: Creates a new draft post. **Requires** calling `attach()` first with the agent. Cannot be called when a post is already selected.

- `updatePost(data, agent)`: Updates the currently selected post. **Requires** calling `attach()` first with the agent and having selected a post via `selectPostById()`. **Does not support** `status: 'pending'` or `status: 'private'` as Ghost API returns errors for these values.

- `selectPostById(id, agent)`: Retrieves a post by its ID and selects it as the current post. Requires `attach()` to be called first with the agent.

- `clearCurrentPost(agent)`: Removes the current post selection from state. Does not delete the post from Ghost.

### GhostCDNProvider

GhostCDNProvider extends the `CDNProvider` interface and handles image uploads to Ghost CDN:

```typescript
export default class GhostCDNProvider extends CDNProvider {
  private readonly adminAPI: GhostAdminAPI;

  constructor(options: GhostCDNProviderOptions);

  /**
   * Uploads an image buffer to Ghost CDN
   * @param data - Buffer containing the image data
   * @param options - Optional filename and metadata
   * @returns Upload result with URL and ID
   * @throws {Error} if upload fails
   */
  async upload(data: Buffer, options?: UploadOptions): Promise<UploadResult>;
}
```

**Method:**

- `upload(data, options)`: **Required** to upload images to Ghost. Takes a Buffer containing the image data and optional filename/metadata. Returns an object with the uploaded `url` and `id`. Uses Ghost Admin API's image upload endpoint with FormData.

### GhostBlogState

GhostBlogState implements the `AgentStateSlice` interface for per-agent state management:

```typescript
export class GhostBlogState implements AgentStateSlice<typeof serializationSchema> {
  name = "GhostBlogState";
  serializationSchema = serializationSchema;
  currentPost: GhostPost | null;

  constructor({currentPost}: { currentPost?: GhostPost | null } = {});

  reset(what: ResetWhat[]): void;
  serialize(): z.output<typeof serializationSchema>;
  deserialize(data: z.output<typeof serializationSchema>): void;
  show(): string[];
}
```

**Properties:**

- `currentPost`: The currently selected Ghost post object (nullable)

**Methods:**

- `attach(agent)`: Called automatically during plugin installation. Initializes `GhostBlogState` for the agent.

- `getCurrentPost(agent)`: Access external client via `agent.getState(GhostBlogState)` or `provider.getCurrentPost(agent)`

- `reset(what)`: Resets state when chat ends or explicitly by calling `clearCurrentPost(agent)`

## Type Definitions

### GhostBlogProviderOptions

```typescript
type GhostBlogProviderOptions = {
  type: "ghost";
  url: string;
  apiKey: string;
  imageGenerationModel: string;
  cdn: string;
  description: string;
};
```

### GhostCDNProviderOptions

```typescript
type GhostCDNProviderOptions = {
  type: "ghost";
  url: string;
  apiKey: string;
};
```

### GhostPost

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

### BlogPost

```typescript
interface BlogPost {
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

## Agent State Management

### State Lifecycle

The `GhostBlogState` is managed per agent session:

```typescript
// Access state
const state = agent.getState(GhostBlogState);
console.log('Current post:', state.currentPost);

// Update state directly
agent.mutateState(GhostBlogState, (state) => {
  state.currentPost = somePost;
});

// Reset state (happens automatically on chat end)
agent.initializeState(GhostBlogState, {});
```

State persists across agent sessions through serialization, but is reset when the chat context ends.

### State Transfer

Child agents automatically inherit the parent agent's `currentPost` selection when:

1. Parent agent has a `currentPost` selected
2. Child agent is spawned
3. Provider is attached to the child agent

## Integration with Agent System

The package integrates with the Token Ring agent system through:

1. **Plugin Registration**: The `plugin.ts` automatically registers `GhostBlogProvider` with `BlogService` and `GhostCDNProvider` with `CDNService` when the application starts.

2. **Agent State**: Each agent gets its own `GhostBlogState` slice for tracking the current post selection.

3. **Service Access**: Agents access the providers through the BlogService and CDNService via `requireServiceByType()`.

## Important Notes and Caveats

### Usage Requirements

- **Attach Required**: Call `attach(agent)` on the provider before using any methods. Failure to do so will result in errors.
- **State Management**: Many methods require an agent parameter for state management. This is automatically passed through the BlogService CDNService.
- **No Individual Exports**: Package does not export service classes. Exported classes (`GhostBlogProvider`, `GhostCDNProvider`) are registered with services at runtime.

### API Behavior

- **getAllPosts()**: Fetches all published posts without filtering. Use this for browsing the complete content of your blog.
- **updatePost()**: Does not support `status: 'pending'` or `status: 'private'` because Ghost Admin API returns errors for these values.
- **GhostBlogProvider Only**: Uses Ghost Admin API exclusively. Content API is not used.
- **Image Upload**: GhostCDNProvider requires a valid Admin API key with appropriate permissions.

### Configuration

- **Image Model**: Configure the `imageGenerationModel` parameter to specify which AI model to use for generating featured images.
- **CDN Reference**: The GhostBlogProvider references names from CDN providers. Ensure consistent naming between blog and CDN configurations.

### Ghost API Version

- Tested and designed for Ghost 5.0+ API
- Uses Ghost Admin API v5.0 as default version
- Image upload uses Ghost's `/images/upload` endpoint via Admin API

## Dependencies

### Required Dependencies

- `@tokenring-ai/app`: Core application framework
- `@tokenring-ai/blog`: Blog service interface and provider system
- `@tokenring-ai/cdn`: CDN service interface and provider system
- `@tokenring-ai/agent`: Agent system and state management
- `@tokenring-ai/chat`: Chat interface for tools
- `@tokenring-ai/ai-client`: AI client for content generation
- `@tokenring-ai/filesystem`: File system operations
- `@tryghost/admin-api`: Official Ghost Admin SDK
- `zod`: Runtime type validation

### Optional Dependencies

- `form-data`: Used for image upload with Ghost API
- `uuid`: Generates unique filenames for uploads

## Testing

```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage
```

## License

MIT License - see [LICENSE](./LICENSE) file for details.