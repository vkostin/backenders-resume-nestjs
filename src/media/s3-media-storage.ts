import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { MediaObject, MediaStorage, StoredMedia } from './media-storage';

/** S3 caps DeleteObjects at 1000 keys per request. */
const DELETE_BATCH = 1000;

export interface S3Config {
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  forcePathStyle: boolean;
}

@Injectable()
export class S3MediaStorage implements MediaStorage {
  private readonly client: S3Client;

  constructor(private readonly config: S3Config) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
    });
  }

  static fromEnv(env: NodeJS.ProcessEnv = process.env): S3MediaStorage {
    return new S3MediaStorage({
      endpoint: required(env, 'S3_ENDPOINT'),
      region: env.S3_REGION ?? 'us-east-1',
      bucket: required(env, 'S3_BUCKET'),
      accessKey: required(env, 'S3_ACCESS_KEY'),
      secretKey: required(env, 'S3_SECRET_KEY'),
      forcePathStyle: env.S3_FORCE_PATH_STYLE !== 'false',
    });
  }

  async putObject(object: MediaObject): Promise<StoredMedia> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: object.key,
        Body: object.body,
        ContentType: object.contentType,
      }),
    );
    return {
      key: object.key,
      contentType: object.contentType,
      sizeBytes: object.body.length,
    };
  }

  async removeObjects(keys: readonly string[]): Promise<void> {
    for (let i = 0; i < keys.length; i += DELETE_BATCH) {
      const chunk = keys.slice(i, i + DELETE_BATCH);
      const result = await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.config.bucket,
          Delete: { Objects: chunk.map((Key) => ({ Key })) },
        }),
      );
      // DeleteObjects reports per-key failures in the body instead of throwing.
      if (result.Errors && result.Errors.length > 0) {
        const failed = result.Errors.map((e) => `${e.Key}: ${e.Code}`).join(', ');
        throw new Error(`Failed to delete objects: ${failed}`);
      }
    }
  }

  async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.config.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.config.bucket }));
    }
    await this.client.send(
      new PutBucketPolicyCommand({
        Bucket: this.config.bucket,
        Policy: JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: '*',
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.config.bucket}/*`],
            },
          ],
        }),
      }),
    );
  }

  async emptyBucket(): Promise<void> {
    let continuationToken: string | undefined;
    do {
      const page = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.config.bucket,
          ContinuationToken: continuationToken,
        }),
      );
      const keys = (page.Contents ?? [])
        .map((o) => o.Key)
        .filter((k): k is string => Boolean(k));
      await this.removeObjects(keys);
      continuationToken = page.IsTruncated
        ? page.NextContinuationToken
        : undefined;
    } while (continuationToken);
  }
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}
