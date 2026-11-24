import { PrismaClient } from '@prisma/client';
import { catalog } from './catalog';
import { seedDatabase, SeedMediaMode } from './seed';
import { S3MediaStorage } from '../media/s3-media-storage';
import { requiredEnv } from '../env';
import { join } from 'path';

async function main(): Promise<void> {
  const mediaMode = (process.env.SEED_MEDIA ?? 'none') as SeedMediaMode;
  if (mediaMode !== 'full' && mediaMode !== 'none') {
    throw new Error(`SEED_MEDIA must be "full" or "none", got "${mediaMode}"`);
  }
  const reset = process.env.SEED_RESET === '1';

  const prisma = new PrismaClient();
  try {
    const profileCount = await prisma.profile.count();
    if (profileCount > 0 && !reset) {
      console.log(
        `Database already seeded (${profileCount} profile(s)); skipping. ` +
          'Set SEED_RESET=1 to reseed from the catalog.',
      );
      return;
    }

    let storage: S3MediaStorage | null = null;
    if (mediaMode === 'full') {
      storage = S3MediaStorage.fromEnv();
    }

    const mediaDir =
      process.env.SEED_MEDIA_DIR ?? join(process.cwd(), 'seed', 'media');

    await seedDatabase(prisma, catalog, storage, {
      media: mediaMode,
      resetMedia: reset,
      mediaDir,
    });
    console.log(
      `Seeded portfolio (media=${mediaMode}${reset ? ', reset' : ''})`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

requiredEnv('DATABASE_URL');
void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
