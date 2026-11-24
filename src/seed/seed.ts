import { PrismaClient } from '@prisma/client';
import { readFile } from 'fs/promises';
import { basename, join } from 'path';
import { PortfolioCatalog, slugId } from './catalog';
import { MediaStorage } from '../media/media-storage';
import { parseYearMonth } from '../year-month';

export type SeedMediaMode = 'full' | 'none';

export interface SeedOptions {
  media: SeedMediaMode;
  /** When true and media=full, the bucket is emptied before upload. */
  resetMedia: boolean;
  /** Directory containing media files referenced by the catalog. */
  mediaDir: string;
}

export async function seedDatabase(
  prisma: PrismaClient,
  catalog: PortfolioCatalog,
  storage: MediaStorage | null,
  options: SeedOptions,
): Promise<void> {
  assertCatalog(catalog);

  const mediaKeys = await prepareMedia(
    catalog,
    storage,
    options,
  );

  await prisma.$transaction(async (tx) => {
    const profile = catalog.profile;
    const photoKey =
      options.media === 'full' ? (mediaKeys.photoKey ?? null) : null;

    const existingProfile = await tx.profile.findFirst({
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    const profileData = {
      name: profile.name,
      headline: profile.headline,
      description: profile.description,
      photoKey,
    };
    const profileId = existingProfile
      ? (
          await tx.profile.update({
            where: { id: existingProfile.id },
            data: profileData,
          })
        ).id
      : (await tx.profile.create({ data: profileData })).id;

    // Links
    const linkIds: string[] = [];
    for (const [index, link] of catalog.links.entries()) {
      const id = slugId('link', link.label);
      linkIds.push(id);
      await tx.link.upsert({
        where: { id },
        create: {
          id,
          profileId,
          label: link.label,
          url: link.url,
          preferred: link.preferred ?? false,
          sortOrder: index,
        },
        update: {
          profileId,
          label: link.label,
          url: link.url,
          preferred: link.preferred ?? false,
          sortOrder: index,
        },
      });
    }
    await tx.link.deleteMany({
      where: { profileId, id: { notIn: linkIds } },
    });
    // At most one preferred link
    const preferred = await tx.link.findMany({
      where: { profileId, preferred: true },
      select: { id: true },
    });
    if (preferred.length > 1) {
      const keep = preferred[0].id;
      await tx.link.updateMany({
        where: { profileId, preferred: true, id: { not: keep } },
        data: { preferred: false },
      });
    }

    // Skill categories
    const categoryIds = new Map<string, string>();
    for (const [index, cat] of catalog.skillCategories.entries()) {
      const id = slugId('cat', cat.name);
      categoryIds.set(cat.name, id);
      await tx.skillCategory.upsert({
        where: { id },
        create: { id, name: cat.name, sortOrder: index },
        update: { name: cat.name, sortOrder: index },
      });
    }
    await tx.skillCategory.deleteMany({
      where: { id: { notIn: [...categoryIds.values()] } },
    });

    // Skills
    const skillIds = new Map<string, string>();
    for (const [index, skill] of catalog.skills.entries()) {
      const id = slugId('skill', skill.name);
      skillIds.set(skill.name, id);
      const obsolete = skill.obsolete ?? false;
      await tx.skill.upsert({
        where: { id },
        create: { id, name: skill.name, obsolete, sortOrder: index },
        update: { name: skill.name, obsolete, sortOrder: index },
      });
    }
    await tx.skill.deleteMany({
      where: { id: { notIn: [...skillIds.values()] } },
    });

    // Category <-> skill memberships are derived data: rebuild fully.
    await tx.skillCategorySkill.deleteMany({});
    const membershipRows: {
      categoryId: string;
      skillId: string;
      sortOrder: number;
    }[] = [];
    for (const cat of catalog.skillCategories) {
      const categoryId = categoryIds.get(cat.name);
      if (!categoryId) continue;
      for (const [i, skillName] of cat.skillNames.entries()) {
        const skillId = skillIds.get(skillName);
        if (skillId) {
          membershipRows.push({ categoryId, skillId, sortOrder: i });
        }
      }
    }
    if (membershipRows.length > 0) {
      await tx.skillCategorySkill.createMany({ data: membershipRows });
    }

    // Experiences
    const experienceIds = new Map<string, string>();
    for (const [index, exp] of catalog.experiences.entries()) {
      const id = `exp-${exp.key}`;
      experienceIds.set(exp.key, id);
      const data = {
        profileId,
        company: exp.company,
        position: exp.position,
        description: exp.description,
        from: parseYearMonth(exp.from),
        to: exp.to === null ? null : parseYearMonth(exp.to),
        sortOrder: index,
      };
      await tx.experience.upsert({
        where: { id },
        create: { id, ...data },
        update: data,
      });
    }
    await tx.experience.deleteMany({
      where: { id: { notIn: [...experienceIds.values()] } },
    });

    // Experience <-> skill links: rebuild fully.
    await tx.experienceSkill.deleteMany({});
    const experienceSkillRows: { experienceId: string; skillId: string }[] = [];
    for (const exp of catalog.experiences) {
      const experienceId = experienceIds.get(exp.key);
      if (!experienceId) continue;
      for (const skillName of exp.skillNames ?? []) {
        const skillId = skillIds.get(skillName);
        if (skillId) {
          experienceSkillRows.push({ experienceId, skillId });
        }
      }
    }
    if (experienceSkillRows.length > 0) {
      await tx.experienceSkill.createMany({ data: experienceSkillRows });
    }

    // Projects
    const projectIds = new Map<string, string>();
    for (const [index, project] of catalog.projects.entries()) {
      const id = `proj-${project.key}`;
      projectIds.set(project.key, id);
      const data = {
        profileId,
        experienceId: project.experience
          ? experienceIds.get(project.experience) ?? null
          : null,
        name: project.name,
        summary: project.summary,
        url: project.url ?? null,
        sortOrder: index,
      };
      await tx.project.upsert({
        where: { id },
        create: { id, ...data },
        update: data,
      });
    }
    await tx.project.deleteMany({
      where: { id: { notIn: [...projectIds.values()] } },
    });

    // Project <-> skill links: rebuild fully.
    await tx.projectSkill.deleteMany({});
    const projectSkillRows: {
      projectId: string;
      skillId: string;
      sortOrder: number;
    }[] = [];
    for (const project of catalog.projects) {
      const projectId = projectIds.get(project.key);
      if (!projectId) continue;
      for (const [i, skillName] of project.skillNames.entries()) {
        const skillId = skillIds.get(skillName);
        if (skillId) {
          projectSkillRows.push({ projectId, skillId, sortOrder: i });
        }
      }
    }
    if (projectSkillRows.length > 0) {
      await tx.projectSkill.createMany({ data: projectSkillRows });
    }

    // Achievements
    const achievementIds: string[] = [];
    const achievementOrder = new Map<string, number>();
    for (const achievement of catalog.achievements) {
      const experienceId = experienceIds.get(achievement.experience);
      if (!experienceId) continue;
      const projectId = achievement.project
        ? projectIds.get(achievement.project) ?? null
        : null;
      const order = achievementOrder.get(achievement.experience) ?? 0;
      achievementOrder.set(achievement.experience, order + 1);
      const id = `ach-${achievement.experience}-${order}`;
      achievementIds.push(id);
      const data = {
        experienceId,
        projectId,
        statement: achievement.statement,
        sortOrder: order,
      };
      await tx.achievement.upsert({
        where: { id },
        create: { id, ...data },
        update: data,
      });
    }
    await tx.achievement.deleteMany({
      where: { id: { notIn: achievementIds } },
    });

    // Illustrations
    if (options.media === 'none') {
      await tx.illustration.deleteMany({});
    } else {
      const illustrationIds: string[] = [];
      for (const project of catalog.projects) {
        const projectId = projectIds.get(project.key);
        if (!projectId) continue;
        for (const [i, ill] of (project.illustrations ?? []).entries()) {
          const stored = mediaKeys.illustrations.get(
            `${project.key}/${ill.file}`,
          );
          if (!stored) continue;
          const id = `ill-${project.key}-${i}`;
          illustrationIds.push(id);
          const data = {
            projectId,
            key: stored,
            alt: ill.alt,
            sortOrder: i,
          };
          await tx.illustration.upsert({
            where: { id },
            create: { id, ...data },
            update: data,
          });
        }
      }
      await tx.illustration.deleteMany({
        where: { id: { notIn: illustrationIds } },
      });
    }
  });
}

interface MediaKeys {
  photoKey: string | null;
  illustrations: Map<string, string>;
}

async function prepareMedia(
  catalog: PortfolioCatalog,
  storage: MediaStorage | null,
  options: SeedOptions,
): Promise<MediaKeys> {
  const result: MediaKeys = { photoKey: null, illustrations: new Map() };
  if (options.media !== 'full' || !storage) {
    return result;
  }
  await storage.ensureBucket();
  if (options.resetMedia) {
    await storage.emptyBucket();
  }

  if (catalog.profile.photoFile) {
    const file = catalog.profile.photoFile;
    const body = await readMediaFile(options.mediaDir, file);
    const ext = extensionOf(file);
    const key = `media/profile-photo${ext}`;
    await storage.putObject({
      key,
      contentType: contentTypeOf(ext),
      body,
    });
    result.photoKey = key;
  }

  for (const project of catalog.projects) {
    for (const ill of project.illustrations ?? []) {
      const body = await readMediaFile(options.mediaDir, ill.file);
      const ext = extensionOf(ill.file);
      const key = `media/${project.key}/${ill.file}`;
      await storage.putObject({
        key,
        contentType: contentTypeOf(ext),
        body,
      });
      result.illustrations.set(`${project.key}/${ill.file}`, key);
    }
  }
  return result;
}

async function readMediaFile(dir: string, file: string): Promise<Buffer> {
  // Media files live next to each other; reject paths that would escape `dir`.
  if (basename(file) !== file) {
    throw new Error(`Seed media file must be a plain file name: ${file}`);
  }
  const path = join(dir, file);
  try {
    return await readFile(path);
  } catch {
    throw new Error(
      `Seed media file not found: ${path}. ` +
        'Add the file or remove the catalog entry.',
    );
  }
}

function extensionOf(file: string): string {
  const match = /\.[a-zA-Z0-9]+$/.exec(file);
  return match ? match[0].toLowerCase() : '';
}

function contentTypeOf(ext: string): string {
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

export function assertCatalog(catalog: PortfolioCatalog): void {
  const skillNames = new Set<string>();
  for (const skill of catalog.skills) {
    if (skillNames.has(skill.name)) {
      throw new Error(`Duplicate skill name: ${skill.name}`);
    }
    skillNames.add(skill.name);
  }

  const categorized = new Set<string>();
  for (const cat of catalog.skillCategories) {
    for (const name of cat.skillNames) {
      if (!skillNames.has(name)) {
        throw new Error(
          `Category "${cat.name}" references unknown skill "${name}"`,
        );
      }
      categorized.add(name);
    }
  }
  for (const name of skillNames) {
    if (!categorized.has(name)) {
      throw new Error(`Skill "${name}" is in no category`);
    }
  }

  const experienceKeys = new Set(catalog.experiences.map((e) => e.key));
  for (const exp of catalog.experiences) {
    for (const name of exp.skillNames ?? []) {
      if (!skillNames.has(name)) {
        throw new Error(
          `Experience "${exp.key}" references unknown skill "${name}"`,
        );
      }
    }
    if (exp.to !== null && exp.to < exp.from) {
      throw new Error(`Experience "${exp.key}": "to" before "from"`);
    }
  }

  const projectsByKey = new Map(catalog.projects.map((p) => [p.key, p]));
  for (const project of catalog.projects) {
    if (project.experience && !experienceKeys.has(project.experience)) {
      throw new Error(
        `Project "${project.key}" references unknown experience "${project.experience}"`,
      );
    }
    for (const name of project.skillNames) {
      if (!skillNames.has(name)) {
        throw new Error(
          `Project "${project.key}" references unknown skill "${name}"`,
        );
      }
    }
  }

  for (const achievement of catalog.achievements) {
    if (!experienceKeys.has(achievement.experience)) {
      throw new Error(
        `Achievement references unknown experience "${achievement.experience}"`,
      );
    }
    if (achievement.project) {
      const project = projectsByKey.get(achievement.project);
      if (!project) {
        throw new Error(
          `Achievement references unknown project "${achievement.project}"`,
        );
      }
      if (project.experience !== achievement.experience) {
        throw new Error(
          `Achievement on project "${achievement.project}" must use the same experience`,
        );
      }
    }
  }

  for (const link of catalog.links) {
    if (!link.url || link.label.trim() === '') {
      throw new Error('Link with empty label or url');
    }
  }
}
