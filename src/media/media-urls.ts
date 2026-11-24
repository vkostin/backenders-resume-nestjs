import { Injectable } from '@nestjs/common';
import { requiredEnv } from '../env';

/** Builds public URLs for stored media keys. Reads never touch the S3 API. */
@Injectable()
export class MediaUrls {
  private readonly publicBaseUrl: string;

  constructor(publicBaseUrl: string) {
    this.publicBaseUrl = publicBaseUrl.replace(/\/$/, '');
  }

  static fromEnv(): MediaUrls {
    return new MediaUrls(requiredEnv('S3_PUBLIC_BASE_URL'));
  }

  urlFor(key: string): string;
  urlFor(key: string | null): string | null;
  urlFor(key: string | null): string | null {
    return key === null ? null : `${this.publicBaseUrl}/${key}`;
  }
}
