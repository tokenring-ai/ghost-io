import {TokenRingPlugin} from "@tokenring-ai/app";
import {BlogConfigSchema, BlogService} from "@tokenring-ai/blog";
import {CDNConfigSchema, CDNService} from "@tokenring-ai/cdn";
import {z} from "zod";
import GhostBlogProvider, {GhostBlogProviderOptionsSchema} from "./GhostBlogProvider.ts";
import GhostCDNProvider, {GhostCDNProviderOptionsSchema} from "./GhostCDNProvider.ts";
import packageJSON from './package.json' with {type: 'json'};

const packageConfigSchema = z.object({
  cdn: CDNConfigSchema.optional(),
  blog: BlogConfigSchema.optional(),
});

export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    if (config.cdn) {
      app.services.waitForItemByType(CDNService, cdnService => {
        for (const name in config.cdn!.providers) {
          const provider = config.cdn!.providers[name];
          if (provider.type === "ghost") {
            cdnService.registerProvider(name, new GhostCDNProvider(GhostCDNProviderOptionsSchema.parse(provider)));
          }
        }
      });
    }

    if (config.blog) {
      app.services.waitForItemByType(BlogService, blogService => {
        for (const name in config.blog!.providers) {
          const provider = config.blog!.providers[name];
          if (provider.type === "ghost") {
            blogService.registerBlog(name, new GhostBlogProvider(GhostBlogProviderOptionsSchema.parse(provider)));
          }
        }
      });
    }
  },
  config: packageConfigSchema
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
