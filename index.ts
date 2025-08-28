import packageJSON from './package.json' with {type: 'json'};

export const name = packageJSON.name;
export const version = packageJSON.version;
export const description = packageJSON.description;

export {default as GhostBlogResource} from "./GhostBlogResource.ts";
export {default as GhostCDNResource} from "./GhostCDNResource.ts";
