import type { TokenRingPlugin } from "@tokenring-ai/app";
import { z } from "zod";
import GhostIOService from "./GhostService.ts";
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
  install(app) {
    app.addServices(new GhostIOService());
  },
  reconfigure(app, config) {
    app.requireService(GhostIOService).reconfigure(config.ghost.accounts, app);
  },
  configSchema: packageConfigSchema,
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
