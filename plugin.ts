import type { TokenRingPlugin } from "@tokenring-ai/app";
import { BlogService } from "@tokenring-ai/blog";
import { CDNService } from "@tokenring-ai/cdn";
import { z } from "zod";
import GhostBlogProvider from "./GhostBlogProvider.ts";
import GhostCDNProvider from "./GhostCDNProvider.ts";
import packageJSON from "./package.json" with { type: "json" };
import { GhostConfigSchema } from "./schema.ts";

const packageConfigSchema = z.object({
  ghost: GhostConfigSchema.prefault({ accounts: {} }),
});

export default {
  name: packageJSON.name,
  displayName: "Ghost.io Integration",
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    for (const [name, account] of Object.entries(config.ghost.accounts)) {
      app.services.waitForItemByType(CDNService, cdnService => {
        cdnService.registerProvider(name, new GhostCDNProvider({ url: account.url, apiKey: account.apiKey }));
      });

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
  },
  configSchema: packageConfigSchema,
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
