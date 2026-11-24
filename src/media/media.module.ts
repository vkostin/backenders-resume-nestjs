import { Module } from '@nestjs/common';
import { MEDIA_URLS, MEDIA_STORAGE } from './media-storage';
import { MediaUrls } from './media-urls';
import { S3MediaStorage } from './s3-media-storage';

@Module({
  providers: [
    {
      provide: MEDIA_STORAGE,
      useFactory: () => S3MediaStorage.fromEnv(),
    },
    {
      provide: MEDIA_URLS,
      useFactory: () => MediaUrls.fromEnv(),
    },
  ],
  exports: [MEDIA_STORAGE, MEDIA_URLS],
})
export class MediaModule {}
