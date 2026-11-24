import { randomUUID } from 'crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { FileUpload } from 'graphql-upload-ts';
import {
  PORTFOLIO_QUERIES,
  PORTFOLIO_STORE,
  PortfolioQueries,
  PortfolioStore,
} from '../persistence/ports';
import {
  MAX_UPLOAD_BYTES,
  MEDIA_STORAGE,
  MEDIA_URLS,
  MediaStorage,
} from '../media/media-storage';
import { MediaUrls } from '../media/media-urls';
import { badUserInput, call } from './errors';
import { IllustrationType, PhotoType, toIllustrationType } from './graphql-types';
import { PortfolioService } from './portfolio.service';

interface DetectedImage {
  ext: string;
  contentType: string;
}

/**
 * Mutations that touch the object store as well as the database.
 * Uploads write the object first, then the row; deletes remove the row
 * first, then the object (best-effort).
 */
@Injectable()
export class MediaMutations {
  private readonly logger = new Logger(MediaMutations.name);

  constructor(
    private readonly portfolio: PortfolioService,
    @Inject(PORTFOLIO_QUERIES)
    private readonly queries: PortfolioQueries,
    @Inject(PORTFOLIO_STORE)
    private readonly store: PortfolioStore,
    @Inject(MEDIA_STORAGE)
    private readonly storage: MediaStorage,
    @Inject(MEDIA_URLS)
    private readonly mediaUrls: MediaUrls,
  ) {}

  async addProjectIllustration(
    projectId: string,
    upload: Promise<FileUpload>,
    alt: string,
    idx?: number | null,
  ): Promise<IllustrationType> {
    const key = await this.storeUpload(await upload);
    try {
      const record = await call(() =>
        this.store.addIllustration({ projectId, key, alt }, idx ?? undefined),
      );
      return toIllustrationType(record, this.mediaUrls);
    } catch (error) {
      await this.removeBestEffort([key]);
      throw error;
    }
  }

  async updateIllustration(
    id: string,
    patch: { alt?: string },
    idx?: number | null,
  ): Promise<IllustrationType> {
    const record = await call(() =>
      this.store.updateIllustration(id, patch, idx ?? undefined),
    );
    return toIllustrationType(record, this.mediaUrls);
  }

  async deleteIllustration(id: string): Promise<string> {
    const row = await this.queries.findIllustrationById(id);
    const deleted = await call(() => this.store.deleteIllustration(id));
    if (row) {
      await this.removeBestEffort([row.key]);
    }
    return deleted;
  }

  /** Deletes a project; its illustration rows cascade, objects follow. */
  async deleteProject(id: string): Promise<string> {
    const illustrations = await this.queries.findIllustrationsByProjectIds([id]);
    const deleted = await call(() => this.store.deleteProject(id));
    await this.removeBestEffort(illustrations.map((row) => row.key));
    return deleted;
  }

  async setProfilePhoto(upload: Promise<FileUpload>): Promise<PhotoType> {
    const profile = await this.portfolio.getProfile();
    const key = await this.storeUpload(await upload);
    try {
      await call(() => this.store.setProfilePhotoKey(profile.id, key));
    } catch (error) {
      await this.removeBestEffort([key]);
      throw error;
    }
    if (profile.photoKey && profile.photoKey !== key) {
      await this.removeBestEffort([profile.photoKey]);
    }
    return { url: this.mediaUrls.urlFor(key) };
  }

  async removeProfilePhoto(): Promise<boolean> {
    const profile = await this.portfolio.getProfile();
    if (profile.photoKey) {
      await call(() => this.store.setProfilePhotoKey(profile.id, null));
      await this.removeBestEffort([profile.photoKey]);
    }
    return true;
  }

  /** Validates the upload and stores it under a server-generated key. */
  private async storeUpload(file: FileUpload): Promise<string> {
    const body = await readUpload(file);
    if (body.length === 0) {
      throw badUserInput('Empty file');
    }
    if (body.length > MAX_UPLOAD_BYTES) {
      throw badUserInput('File exceeds 5 MB');
    }
    const detected = detectImage(body);
    if (!detected) {
      throw badUserInput('Only PNG, JPEG and WebP images are allowed');
    }
    const key = `uploads/${randomUUID()}${detected.ext}`;
    await this.storage.putObject({
      key,
      contentType: detected.contentType,
      body,
    });
    return key;
  }

  /** Orphaned objects are harmless; a failed cleanup must not fail the call. */
  private async removeBestEffort(keys: readonly string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      await this.storage.removeObjects(keys);
    } catch (error) {
      this.logger.warn(`Media cleanup failed for ${keys.join(', ')}: ${String(error)}`);
    }
  }
}

async function readUpload(file: FileUpload): Promise<Buffer> {
  const stream = file.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function detectImage(body: Buffer): DetectedImage | null {
  if (
    body.length >= 8 &&
    body[0] === 0x89 &&
    body[1] === 0x50 &&
    body[2] === 0x4e &&
    body[3] === 0x47
  ) {
    return { ext: '.png', contentType: 'image/png' };
  }
  if (body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) {
    return { ext: '.jpg', contentType: 'image/jpeg' };
  }
  if (
    body.length >= 12 &&
    body.toString('ascii', 0, 4) === 'RIFF' &&
    body.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { ext: '.webp', contentType: 'image/webp' };
  }
  return null;
}
