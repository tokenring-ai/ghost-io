Ghost.io integration design
- The package will be in pkg/ghost-io
- A Ghost.io service should be created in pkg/ghost-io/GhostIOService.js
- The chat command exposed to the user will be called /ghost, and should be blacked in pkg/ghost-io/chatCommands/ghost.js
- Tools should be placed in pkg/ghost-io/tools/{createPost, updatePost, publishPost, listPosts}.js
- The docs for the ghost admin API are in pkg/ghost-io/docs/admin-api.md
- The docs for the ghost admin SDK are in pkg/ghost-io/docs/javascript-admin-sdk.md
- The docs for the ghost content API are in pkg/ghost-io/docs/content-api.md
- The docs for the ghost content SDK are in pkg/ghost-io/docs/javascript-content-sdk.md

Basic functionality and workflow
- This package will be used to give an AI agent the ability to retrieve, write, and update blog posts that are stored in the Ghost.io platform 
- To do that it will need a chat command to allow the user to select which article they are working on and browse posts, which will be called /ghost
- It will also need to expose tool calls to the AI agent, that allow it to do basic crud operations on posts.
- This package will expose a chat command called /ghost post select to the user, that allows them to select an existing article published on ghost or to select no article

Technical details
- The GhostIOService should store the currently selected post as a currentPost variable in the class instance.

Typing /ghost post select should open a post selector, which uses the treeSelection interface in HumanInterfaceService
- The post selector should:
 - Fetch all posts from Ghost.io API
 - Format posts into a tree structure with title and date as display text
 - Use humanInterfaceService.treeSelection() to display the selection interface
 - Store the selected post ID in currentPost variable
 - Display confirmation message with selected post title
- The currentPost variable should:
 - Store complete post object including metadata
 - Be null if no post is selected
 - Be used as context for subsequent post-related commands
 - Be cleared when switching to a different post

Typing /ghost post info should display information about the currently selected post
- If a post is currently selected (currentPost is not null):
 - Display post title
 - Display post status (draft/published)
 - Display creation date
 - Display last update date
 - Display post URL if published
 - Display word count
- If no post is selected (currentPost is null):
 - Display message indicating no post is currently selected
 - Suggest using /ghost post select to choose a post
- The command should use humanInterfaceService.display() to show the information
- All dates should be formatted in a human-readable format

Typing /ghost post new should set currentPost to null, which indicates any ghost operations will be a create instead of an update 

### GhostIOService Class
**Core Responsibilities:**
- Manage Ghost.io API connections (Admin and Content APIs)
- Maintain current post state (`currentPost` variable)
- Handle authentication and API key management
- Provide unified interface for all Ghost.io operations

**Key Properties:**
``` javascript
class GhostIOService {
  constructor() {
    this.currentPost = null;  // Currently selected post object
    this.adminAPI = null;     // Ghost Admin API client
    this.contentAPI = null;   // Ghost Content API client
  }
}
```

### AI Tool Integration
**Available Tools:**
- `createPost`: Generate new posts with AI-suggested content
- `updatePost`: Modify existing post content and metadata
- `publishPost`: Change post status from draft to published
- `listPosts`: Search and filter posts for AI reference
- `selectPost`: Change the currently selected post or clear selection

**Tool Context Awareness:**

- All tools can access `currentPost` for context
- Tools validate post selection state before execution
- Update/Publish Operations always interact with currentPost and fail if currentPost is null
- Create operations require currentPost to be null
- List operations work regardless of currentPost state

**Tool Error Handling:**

- All tools return standardized error responses
- Authentication/connection errors are captured and reported
- Invalid post state errors include suggested corrective actions
- Tools maintain consistent state even after errors

**Post Operations Validation:**
- Create: Requires currentPost === null
- Update: Requires valid currentPost object
- Publish: Requires draft status currentPost
- List: No validation required
- Select: Validates post ID exists

### API Configuration

The GhostIOService constructor requires API keys for both the Admin and Content APIs:

- `adminApiKey`: Required for creating/updating/publishing posts
- `contentApiKey`: Required for reading published posts
- `url`: The Ghost site URL (e.g., 'https://demo.ghost.io')