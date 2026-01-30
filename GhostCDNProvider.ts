import CDNProvider from "@tokenring-ai/cdn/CDNProvider";
import {UploadOptions, UploadResult} from "@tokenring-ai/cdn/types";
// @ts-ignore
import GhostAdminAPI from "@tryghost/admin-api";
import FormData from "form-data";
import {v4 as uuid} from "uuid";
import {z} from "zod";

export default class GhostCDNProvider extends CDNProvider {
  private readonly adminAPI: GhostAdminAPI;

  /**
   * Creates an instance of GhostIOService
   */
  constructor(private options: GhostCDNProviderOptions) {
    super();


    this.adminAPI = new GhostAdminAPI({
      // Ghost Admin API client
      url: options.url,
      version: "v5.0",
      key: options.apiKey,
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
export const GhostCDNProviderOptionsSchema = z.object({
  url: z.string(),
  apiKey: z.string(),
});
export type GhostCDNProviderOptions = z.infer<typeof GhostCDNProviderOptionsSchema>;
