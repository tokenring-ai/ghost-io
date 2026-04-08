import {z} from "zod";

export const GhostAccountCDNSchema = z.object({

}).prefault({})

export const GhostAccountBlogSchema = z.object({
  description: z.string().default("Ghost blog"),
  cdn: z.string().optional(),
}).prefault({});

export const GhostAccountSchema = z.object({
  url: z.string(),
  apiKey: z.string(),
  blog: GhostAccountBlogSchema,
  cdn: GhostAccountCDNSchema,
});

export const GhostConfigSchema = z.object({
  accounts: z.record(z.string(), GhostAccountSchema).default({}),
});

export type GhostConfig = z.output<typeof GhostConfigSchema>;
export type GhostAccount = z.output<typeof GhostAccountSchema>;
export type GhostAccountBlog = z.output<typeof GhostAccountBlogSchema>;
export type GhostAccountCDN = z.output<typeof GhostAccountCDNSchema>;
