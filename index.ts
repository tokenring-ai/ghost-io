import TokenRingApp, { TokenRingPlugin } from "@tokenring-ai/app";
import {BlogConfigSchema, BlogService} from "@tokenring-ai/blog";
import {CDNConfigSchema, CDNService} from "@tokenring-ai/cdn";
import GhostBlogProvider, {GhostBlogProviderOptionsSchema} from "./GhostBlogProvider.ts";
import GhostCDNProvider, {GhostCDNProviderOptionsSchema} from "./GhostCDNProvider.ts";
import packageJSON from './package.json' with {type: 'json'};

export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(app: TokenRingApp) {
    const cdnConfig = app.getConfigSlice("cdn", CDNConfigSchema);

    if (cdnConfig) {
      app.services.waitForItemByType(CDNService, cdnService => {
        for (const name in cdnConfig.providers) {
          const provider = cdnConfig.providers[name];
          if (provider.type === "ghost") {
            cdnService.registerProvider(name, new GhostCDNProvider(GhostCDNProviderOptionsSchema.parse(provider)));
          }
        }
      });
    }

    const blogConfig = app.getConfigSlice("blog", BlogConfigSchema);

    if (blogConfig) {
      app.services.waitForItemByType(BlogService, blogService => {
        for (const name in blogConfig.providers) {
          const provider = blogConfig.providers[name];
          if (provider.type === "ghost") {
            blogService.registerBlog(name, new GhostBlogProvider(GhostBlogProviderOptionsSchema.parse(provider)));
          }
        }
      });
    }
  },
} as TokenRingPlugin;

export {default as GhostBlogProvider} from "./GhostBlogProvider.ts";
export {default as GhostCDNProvider} from "./GhostCDNProvider.ts";
