export interface MediaObject {
  /** Stored key, never taken from client input. */
  key: string;
  contentType: string;
  body: Buffer;
}

export interface StoredMedia {
  key: string;
  contentType: string;
  sizeBytes: number;
}

/** Port for the object store that holds illustrations and the profile photo. */
export interface MediaStorage {
  putObject(object: MediaObject): Promise<StoredMedia>;
  removeObjects(keys: readonly string[]): Promise<void>;
  /** Creates the bucket if missing and allows anonymous reads. */
  ensureBucket(): Promise<void>;
  /** Removes every object in the bucket; used by seed reset. */
  emptyBucket(): Promise<void>;
}

export const MEDIA_STORAGE = 'MEDIA_STORAGE';
export const MEDIA_URLS = 'MEDIA_URLS';

/** Upload size limit, enforced both by the multipart parser and on read. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
