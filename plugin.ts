import type { TokenRingPlugin } from "@tokenring-ai/app";
import { BlogService } from "@tokenring-ai/blog";
import { CDNService } from "@tokenring-ai/cdn";
import { z } from "zod";
import GhostBlogProvider from "./GhostBlogProvider.ts";
import GhostCDNProvider from "./GhostCDNProvider.ts";
import packageJSON from "./package.json" with { type: "json" };
import { type GhostAccount, GhostConfigSchema } from "./schema.ts";

const packageConfigSchema = z.object({
  ghost: GhostConfigSchema.prefault({ accounts: {} }),
});

function addAccountsFromEnv(accounts: Record<string, Partial<GhostAccount>>) {
  for (const [key, value] of Object.entries(process.env)) {
    const match = key.match(/^GHOST_URL(\d*)$/);
    if (!match || !value) continue;
    const n = match[1];
    const apiKey = process.env[`GHOST_API_KEY${n}`];
    if (!apiKey) continue;
    const name = process.env[`GHOST_ACCOUNT_NAME${n}`] ?? new URL(value).host;
    accounts[name] = {
      url: value,
      apiKey,
      blog: {
        description: process.env[`GHOST_DESCRIPTION${n}`] ?? `Ghost.io (${name})`,
        cdn: process.env[`GHOST_BLOG_CDN${n}`] ?? name,
      },
      cdn: {},
    };
  }
}

export default {
  name: packageJSON.name,
  displayName: "Ghost.io Integration",
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    addAccountsFromEnv(config.ghost.accounts);

    for (const [name, account] of Object.entries(config.ghost.accounts)) {
      if (account.cdn) {
        app.services.waitForItemByType(CDNService, cdnService => {
          cdnService.registerProvider(name, new GhostCDNProvider({ url: account.url, apiKey: account.apiKey }));
        });
      }

      if (account.blog) {
        app.services.waitForItemByType(BlogService, blogService => {
          blogService.registerBlog(
            name,
            new GhostBlogProvider({
              url: account.url,
              apiKey: account.apiKey,
              description: account.blog.description,
              cdn: account.blog.cdn ?? name,
            }),
          );
        });
      }
    }
  },
  config: packageConfigSchema,
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
