import type TokenRingApp from "@tokenring-ai/app";
import type { TokenRingService } from "@tokenring-ai/app/types";
import { BlogService } from "@tokenring-ai/blog";
import { CDNService } from "@tokenring-ai/cdn";
import { deepEqual } from "@tokenring-ai/one-frontend/src/lib/utils";
import KeyedRegistry from "@tokenring-ai/utility/registry/KeyedRegistry";
import GhostBlogProvider from "./GhostBlogProvider.ts";
import GhostCDNProvider from "./GhostCDNProvider.ts";
import type { GhostAccount } from "./schema.ts";

export default class GhostIOService implements TokenRingService {
  readonly name = "GhostIOService";
  description = "Connects to Ghost.io blogs";

  accounts = new KeyedRegistry<GhostAccount>();

  reconfigure(config: Record<string, GhostAccount>, app: TokenRingApp) {
    const cdnService = app.requireService(CDNService);
    const blogService = app.requireService(BlogService);

    this.accounts.reconcileAgainst(config, {
      creating: (name, account) => {
        cdnService.registerProvider(name, new GhostCDNProvider({ url: account.url, apiKey: account.apiKey }));
        blogService.registerBlog(
          name,
          new GhostBlogProvider({
            url: account.url,
            apiKey: account.apiKey,
            description: account.blog.description,
            cdn: account.blog.cdn ?? name,
          }),
        );
        return account;
      },
      deleting: name => {
        cdnService.unregisterProvider(name);
        blogService.unregisterBlog(name);
      },
      updating: (name, existing, account) => {
        if (deepEqual(existing, account)) return existing;

        cdnService.unregisterProvider(name);
        blogService.unregisterBlog(name);

        cdnService.registerProvider(name, new GhostCDNProvider({ url: account.url, apiKey: account.apiKey }));
        blogService.registerBlog(
          name,
          new GhostBlogProvider({
            url: account.url,
            apiKey: account.apiKey,
            description: account.blog.description,
            cdn: account.blog.cdn ?? name,
          }),
        );
        return account;
      },
    });
  }
}
