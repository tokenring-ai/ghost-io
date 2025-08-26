import CDNResource from "@token-ring/cdn/CDNResource";
import {type UploadOptions, type UploadResult} from "@token-ring/cdn/CDNService";
// @ts-ignore
import GhostAdminAPI from "@tryghost/admin-api";
import FormData from "form-data";
import {v4 as uuid} from "uuid";

export interface GhostCDNResourceOptions {
  url: string;
  adminApiKey: string;
}

export default class GhostCDNResource extends CDNResource {
  name = "GhostCDN";
  description = "Ghost.io CDN implementation using Ghost's upload API";

  private readonly adminAPI: GhostAdminAPI;

  /**
   * Creates an instance of GhostIOService
   */
  constructor({url, adminApiKey}: GhostCDNResourceOptions) {
    super();

    if (!url) {
      throw new Error("Error in Ghost config: No url provided");
    }

    if (!adminApiKey) {
      throw new Error("Error in Ghost configuration: adminApiKey not provided");
    }

    this.adminAPI = new GhostAdminAPI({
      // Ghost Admin API client
      url,
      version: "v5.0",
      key: adminApiKey,
    });
  }


  async upload(data: Buffer, options?: UploadOptions): Promise<UploadResult> {
    const filename = options?.filename || `${uuid()}.jpg`;
    
    const formData = new FormData();
    formData.append("file", data, {filename});
    formData.append("purpose", "image");

    try {
      // Use type assertion to bypass the type checking for the images property
      // This is necessary because the @tryghost/admin-api type definitions might be incomplete
      const result = await this.adminAPI.images.upload(formData);
      return {
        url: result.url,
        id: filename,
        metadata: options?.metadata,
      }
    } catch (error) {
      throw new Error(`Failed to upload image: ${(error as Error).message}`);
    }
  }
}