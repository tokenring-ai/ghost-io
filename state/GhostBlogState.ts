import {ResetWhat} from "@tokenring-ai/agent/AgentEvents";
import {GhostPost} from "../GhostBlogProvider.js";
import type { AgentStateSlice } from "@tokenring-ai/agent/types";

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
}