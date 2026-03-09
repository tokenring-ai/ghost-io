import {AgentStateSlice} from "@tokenring-ai/agent/types";
import {z} from "zod";
import {GhostPost} from "../GhostBlogProvider.js";

const serializationSchema = z.object({
  currentPost: z.any().nullable()
});

export class GhostBlogState extends AgentStateSlice<typeof serializationSchema> {
  currentPost: GhostPost | null;

  constructor({currentPost}: { currentPost?: GhostPost | null } = {}) {
    super("GhostBlogState",serializationSchema);
    this.currentPost = currentPost || null;
  }

  reset(): void {
          this.currentPost = null;
  }

  serialize(): z.output<typeof serializationSchema> {
    return {
      currentPost: this.currentPost,
    };
  }

  deserialize(data: z.output<typeof serializationSchema>): void {
    this.currentPost = data.currentPost;
  }

  show(): string[] {
    return [
      `Current Post: ${this.currentPost ? `${this.currentPost.title || 'Untitled'} (ID: ${this.currentPost.id})` : 'None'}`
    ];
  }
}
