import {TokenRingPackage} from "@tokenring-ai/agent";
import packageJSON from './package.json' with {type: 'json'};

export const packageInfo: TokenRingPackage = {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description
};

export {default as GhostBlogResource} from "./GhostBlogResource.ts";
export {default as GhostCDNResource} from "./GhostCDNResource.ts";
