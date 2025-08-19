# @token-ring/ghost-io

Ghost.io integration package for the Token Ring writer. It provides:

- GhostIOService to connect to a Ghost site (Admin + Content APIs)
- Ready-to-use tools for agents and templates (create posts, get selection, generate images)
- A /ghost chat command to select posts, show info, or start a new post

## What does it do?

This package lets Token Ring agents and the interactive REPL work with your Ghost blog:

- Browse and select an existing post as the current working context
- Create a new draft post from Markdown
- Generate an AI image and set it as the post’s featured image
- Read the currently selected post’s basic details

Internally it wraps the official Ghost Admin and Content SDKs and maintains a currentPost state used by tools and chat
commands.

## Installation / Enabling

This package lives in the monorepo and is consumed by the writer app. To add it in a custom Registry setup:

```ts
import * as GhostPackage from "@token-ring/ghost-io";
import { GhostIOService } from "@token-ring/ghost-io";
import { Registry } from "@token-ring/registry";

const registry = new Registry();
await registry.start();
await registry.addPackages(GhostPackage);

await registry.services.addServices(
  new GhostIOService({
    url: process.env.GHOST_URL!,
    adminApiKey: process.env.GHOST_ADMIN_API_KEY!,
    contentApiKey: process.env.GHOST_CONTENT_API_KEY!,
  })
);

// Enable the tools exported by this package
await registry.tools.enableTools(Object.keys(GhostPackage.tools));
```

In the Token Ring writer (see src/tr-writer.ts), this package is already imported and can be enabled via configuration.

## Configuration

GhostIOService requires connection details for your Ghost site:

- url: string — Your Ghost site URL (e.g., https://demo.ghost.io)
- adminApiKey: string — Admin API key for writes (create/update/publish, image upload)
- contentApiKey: string — Content API key for reads

Example environment variables:

- GHOST_URL=https://your-ghost-site.example
- GHOST_ADMIN_API_KEY=YOUR_ADMIN_KEY
- GHOST_CONTENT_API_KEY=YOUR_CONTENT_KEY

Sample arguments exported by the service:

```ts
GhostIOService.sampleArguments
// {
//   url: "https://ghost.io",
//   adminApiKey: "YOUR_ADMIN_API_KEY",
//   contentApiKey: "YOUR_CONTENT_API_KEY"
// }
```

## Chat Command

Command: /ghost

Usage: /ghost post [select|info|new]

- post select: Open a tree selector to choose an existing post or clear selection
- post info: Show details about the currently selected post (title, status, dates, tags, URL)
- post new: Clear selection to indicate the next operations should create a new post

The selection state is stored in GhostIOService.currentPost and is cleared when you choose “Clear selection” or run
/ghost post new.

## Exposed Tools

These tools are exported via pkg/ghost-io/tools.ts and can be enabled through the Registry tool system.

- createPost
 - Description: Create a new Ghost post from Markdown content (saved as draft)
 - Params: { title: string; content: string; tags?: string[] }
 - Behavior: Converts Markdown to HTML, creates the post via Admin API, and sets it as currentPost

- getCurrentPost
 - Description: Return details of the currently selected post or null if none
 - Params: none

- generateImageForPost
 - Description: Use an AI image model to generate an image and set it as the featured image of the currently selected
   post
 - Params: { prompt: string; aspectRatio?: "square"|"tall"|"wide"; detail?: "low"|"high"|"auto"; model?: string }
 - Requirements: An AI image client available via @token-ring/ai-client’s ModelRegistry and a filesystem resource for
   saving images; Ghost Admin API credentials for upload

Note: A selectPost tool implementation exists (tools/selectPost.ts), and chat post selection is also available via
/ghost post select.

## Service API Summary

GhostIOService provides a typed wrapper over the Ghost SDKs:

- getAllPosts(): Promise<GhostPost[]> — Browse posts (Admin API)
- createPost({ title, html, tags, published }): Promise<GhostPost> — Create post from HTML
- updatePost({ title, content, tags }): Promise<GhostPost> — Edit selected post (requires currentPost)
- publishPost(): Promise<GhostPost> — Publish selected post (requires currentPost)
- selectPostById(id: string): Promise<GhostPost> — Fetch and select a post (Content API)
- uploadImage(formData): Promise<{ url: string }> — Upload image (Admin API)
- editPost(postData): Promise<GhostPost> — Low-level edit passthrough (Admin API)
- getCurrentPost()/setCurrentPost(post|null)

Errors from the underlying SDKs are surfaced with helpful messages; operations that require a selection will error if
currentPost is not set.

## Example: Creating a draft from Markdown

```ts
import {tools as GhostTools} from "@token-ring/ghost-io";

const result = await GhostTools.createPost.execute({
  title: "Hello Ghost from Token Ring",
  content: "# Heading\n\nThis was written by an agent.",
  tags: ["tokenring", "ghost"],
}, registry);

if (result.success) {
  console.log("Created:", result.post?.id, result.message);
}
```

## Notes and Caveats

- You must configure both Admin and Content API keys.
- generateImageForPost selects an image model via ModelRegistry (defaults to a model named gpt-image-1). Ensure you have
  a configured provider and credentials.
- Some operations rely on currentPost; use /ghost post select or the selectPost tool to set context, or /ghost post new
  to clear it.

## License

MIT (see repository LICENSE)
