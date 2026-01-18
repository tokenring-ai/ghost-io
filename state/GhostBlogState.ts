import {ResetWhat} from "@tokenring-ai/agent/AgentEvents";
import type {AgentStateSlice} from "@tokenring-ai/agent/types";
import {GhostPost} from "../GhostBlogProvider.js";

export class GhostBlogState implements AgentStateSlice {
  name = "GhostBlogState";
  currentPost: GhostPost | null;

  constructor({currentPost}: { currentPost?: GhostPost | null } = {}) {
    this.currentPost = currentPost || null;
  }

  reset(what: ResetWhat[]): void {
    if (what.includes('chat')) {
      this.currentPost = null;
    }
  }

  serialize(): object {
    return {
      currentPost: this.currentPost,
    };
  }

  deserialize(data: any): void {
    this.currentPost = data.currentPost || null;
  }

  show(): string[] {
    return [
      `Current Post: ${this.currentPost ? `${this.currentPost.title || 'Untitled'} (ID: ${this.currentPost.id})` : 'None'}`
    ];
  }
}