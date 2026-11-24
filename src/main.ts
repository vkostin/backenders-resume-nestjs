import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { graphqlUploadExpress } from 'graphql-upload-ts';
import { GraphQLError } from 'graphql';
import { AppModule } from './app.module';
import { requiredEnv } from './env';
import { MAX_UPLOAD_BYTES } from './media/media-storage';

/** Fail fast at boot; providers re-read these lazily. */
const REQUIRED_ENV = [
  'DATABASE_URL',
  'S3_ENDPOINT',
  'S3_BUCKET',
  'S3_ACCESS_KEY',
  'S3_SECRET_KEY',
  'S3_PUBLIC_BASE_URL',
  'ADMIN_TOKEN',
] as const;

async function bootstrap(): Promise<void> {
  REQUIRED_ENV.forEach(requiredEnv);

  const app = await NestFactory.create(AppModule);
  app.use(
    '/graphql',
    graphqlUploadExpress({
      maxFileSize: MAX_UPLOAD_BYTES,
      maxFiles: 1,
      overrideSendResponse: false,
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) =>
        new GraphQLError(
          errors
            .map((e) => Object.values(e.constraints ?? {}).join('; '))
            .join('; ') || 'Validation failed',
          { extensions: { code: 'BAD_USER_INPUT' } },
        ),
    }),
  );
  app.enableShutdownHooks();
  const port = process.env.PORT ?? '3000';
  await app.listen(port);
  new Logger('Bootstrap').log(`Apollo Sandbox at http://localhost:${port}/graphql`);
}

void bootstrap();
