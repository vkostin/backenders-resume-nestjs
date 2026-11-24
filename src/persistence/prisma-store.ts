import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { parseYearMonth } from '../year-month';
import { PrismaService } from './prisma.service';
import {
  AchievementInput,
  badInput,
  conflict,
  ExperienceInput,
  IllustrationInput,
  LinkInput,
  notFound,
  PortfolioStore,
  ProfileInput,
  ProjectInput,
  SkillCategoryInput,
  SkillInput,
} from './ports';
import {
  AchievementRecord,
  ExperienceRecord,
  IllustrationRecord,
  LinkRecord,
  ProjectRecord,
  SkillCategoryRecord,
  SkillRecord,
} from '../domain';

type Tx = Prisma.TransactionClient;

/** The part of a Prisma model delegate needed to rewrite a sort order. */
interface OrderedDelegate {
  findMany(args: {
    where: object;
    orderBy: object[];
    select: { id: true };
  }): Promise<{ id: string }[]>;
  update(args: {
    where: { id: string };
    data: { sortOrder: number };
  }): Promise<unknown>;
}

/** The part of a Prisma model delegate needed to allocate an append order. */
interface AppendOrderedDelegate {
  findFirst(args: {
    where: object;
    orderBy: { sortOrder: 'desc' };
    select: { sortOrder: true };
  }): Promise<{ sortOrder: number } | null>;
}

const BY_SORT_ORDER = [{ sortOrder: 'asc' }, { id: 'asc' }] as const;

/** Uses the last persisted position, not row count, so deletions leave no ambiguity. */
async function nextSortOrder(
  delegate: AppendOrderedDelegate,
  where: object,
): Promise<number> {
  const last = await delegate.findFirst({
    where,
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });
  return (last?.sortOrder ?? -1) + 1;
}

@Injectable()
export class PrismaPortfolioStore implements PortfolioStore {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(profileId: string, input: ProfileInput): Promise<void> {
    try {
      await this.prisma.profile.update({
        where: { id: profileId },
        data: {
          name: input.name,
          headline: input.headline,
          description: input.description,
        },
      });
    } catch (e) {
      throw mapPrismaError(e, 'Profile');
    }
  }

  async setProfilePhotoKey(
    profileId: string,
    photoKey: string | null,
  ): Promise<void> {
    try {
      await this.prisma.profile.update({
        where: { id: profileId },
        data: { photoKey },
      });
    } catch (e) {
      throw mapPrismaError(e, 'Profile');
    }
  }

  async createLink(profileId: string, input: LinkInput): Promise<LinkRecord> {
    return this.prisma.$transaction(async (tx) => {
      await this.assertProfileExists(tx, profileId);
      const sortOrder = await nextSortOrder(tx.link, { profileId });
      if (input.preferred) {
        await tx.link.updateMany({
          where: { profileId, preferred: true },
          data: { preferred: false },
        });
      }
      return tx.link.create({
        data: { profileId, ...input, sortOrder },
      });
    });
  }

  async updateLink(
    id: string,
    input: LinkInput,
    idx?: number,
  ): Promise<LinkRecord> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.link.findUnique({ where: { id } });
      if (!existing) throw notFound('Link');
      if (input.preferred) {
        await tx.link.updateMany({
          where: { profileId: existing.profileId, preferred: true, id: { not: id } },
          data: { preferred: false },
        });
      }
      const updated = await tx.link.update({ where: { id }, data: { ...input } });
      if (idx !== undefined) {
        await moveItem(tx.link, { profileId: existing.profileId }, id, idx);
      }
      return updated;
    });
  }

  async deleteLink(id: string): Promise<string> {
    try {
      const deleted = await this.prisma.link.delete({ where: { id } });
      return deleted.id;
    } catch (e) {
      throw mapPrismaError(e, 'Link');
    }
  }

  async createSkillCategory(
    input: SkillCategoryInput,
  ): Promise<SkillCategoryRecord> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const sortOrder = await nextSortOrder(tx.skillCategory, {});
        return tx.skillCategory.create({
          data: { name: input.name, sortOrder },
        });
      });
    } catch (e) {
      throw mapPrismaError(e, 'Skill category');
    }
  }

  async updateSkillCategory(
    id: string,
    input: SkillCategoryInput,
    idx?: number,
  ): Promise<SkillCategoryRecord> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.skillCategory.findUnique({ where: { id } });
      if (!existing) throw notFound('Skill category');
      try {
        const updated = await tx.skillCategory.update({
          where: { id },
          data: { name: input.name },
        });
        if (idx !== undefined) {
          await moveItem(tx.skillCategory, {}, id, idx);
        }
        return updated;
      } catch (e) {
        throw mapPrismaError(e, 'Skill category');
      }
    });
  }

  async deleteSkillCategory(id: string): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const memberships = await tx.skillCategorySkill.findMany({
        where: { categoryId: id },
        select: { skillId: true },
      });
      const skillIds = memberships.map((m) => m.skillId);
      if (skillIds.length > 0) {
        const remaining = await tx.skillCategorySkill.groupBy({
          by: ['skillId'],
          where: { skillId: { in: skillIds }, categoryId: { not: id } },
        });
        const covered = new Set(remaining.map((r) => r.skillId));
        const orphaned = skillIds.filter((sid) => !covered.has(sid));
        if (orphaned.length > 0) {
          throw badInput(
            'Cannot delete category: skills would be left without any category',
          );
        }
      }
      try {
        await tx.skillCategory.delete({ where: { id } });
      } catch (e) {
        throw mapPrismaError(e, 'Skill category');
      }
      return id;
    });
  }

  async createSkill(input: SkillInput): Promise<SkillRecord> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.assertCategoriesExist(input.categoryIds, tx);
        const sortOrder = await nextSortOrder(tx.skill, {});
        return tx.skill.create({
          data: {
            name: input.name,
            obsolete: input.obsolete,
            sortOrder,
            categories: {
              create: input.categoryIds.map((categoryId, i) => ({
                categoryId,
                sortOrder: i,
              })),
            },
          },
        });
      });
    } catch (e) {
      throw mapPrismaError(e, 'Skill');
    }
  }

  async updateSkill(
    id: string,
    input: SkillInput,
    idx?: number,
  ): Promise<SkillRecord> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.skill.findUnique({ where: { id } });
      if (!existing) throw notFound('Skill');
      await this.assertCategoriesExist(input.categoryIds, tx);
      try {
        await tx.skillCategorySkill.deleteMany({ where: { skillId: id } });
        const updated = await tx.skill.update({
          where: { id },
          data: {
            name: input.name,
            obsolete: input.obsolete,
            categories: {
              create: input.categoryIds.map((categoryId, i) => ({
                categoryId,
                sortOrder: i,
              })),
            },
          },
        });
        if (idx !== undefined) {
          // Skills tie-break by name, matching the read query.
          await moveItem(tx.skill, {}, id, idx, [
            { sortOrder: 'asc' },
            { name: 'asc' },
          ]);
        }
        return updated;
      } catch (e) {
        throw mapPrismaError(e, 'Skill');
      }
    });
  }

  async deleteSkill(id: string): Promise<string> {
    try {
      await this.prisma.skill.delete({ where: { id } });
      return id;
    } catch (e) {
      throw mapPrismaError(e, 'Skill');
    }
  }

  async createExperience(
    profileId: string,
    input: ExperienceInput,
  ): Promise<ExperienceRecord> {
    const { from, to } = parsePeriod(input.from, input.to);
    return this.prisma.$transaction(async (tx) => {
      await this.assertProfileExists(tx, profileId);
      const sortOrder = await nextSortOrder(tx.experience, { profileId });
      return tx.experience.create({
        data: {
          profileId,
          company: input.company,
          position: input.position,
          description: input.description,
          from,
          to,
          sortOrder,
        },
      });
    });
  }

  async updateExperience(
    id: string,
    input: ExperienceInput,
    idx?: number,
  ): Promise<ExperienceRecord> {
    const { from, to } = parsePeriod(input.from, input.to);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.experience.findUnique({ where: { id } });
      if (!existing) throw notFound('Experience');
      const updated = await tx.experience.update({
        where: { id },
        data: {
          company: input.company,
          position: input.position,
          description: input.description,
          from,
          to,
        },
      });
      if (idx !== undefined) {
        await moveItem(tx.experience, { profileId: existing.profileId }, id, idx);
      }
      return updated;
    });
  }

  async deleteExperience(id: string): Promise<string> {
    try {
      const deleted = await this.prisma.experience.delete({ where: { id } });
      return deleted.id;
    } catch (e) {
      throw mapPrismaError(e, 'Experience');
    }
  }

  async setExperienceSkills(
    experienceId: string,
    skillIds: readonly string[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const exp = await tx.experience.findUnique({ where: { id: experienceId } });
      if (!exp) throw notFound('Experience');
      await this.assertSkillsExist(skillIds, tx);
      await tx.experienceSkill.deleteMany({ where: { experienceId } });
      if (skillIds.length > 0) {
        await tx.experienceSkill.createMany({
          data: skillIds.map((skillId) => ({ experienceId, skillId })),
        });
      }
    });
  }

  async createProject(
    profileId: string,
    input: ProjectInput,
  ): Promise<ProjectRecord> {
    return this.prisma.$transaction(async (tx) => {
      await this.assertProfileExists(tx, profileId);
      await this.assertExperienceForProfile(tx, input.experienceId, profileId);
      await this.assertSkillsExist(input.skillIds, tx);
      const sortOrder = await nextSortOrder(tx.project, { profileId });
      return tx.project.create({
        data: {
          profileId,
          experienceId: input.experienceId,
          name: input.name,
          summary: input.summary,
          url: input.url,
          sortOrder,
          skills: {
            create: input.skillIds.map((skillId, i) => ({
              skillId,
              sortOrder: i,
            })),
          },
        },
      });
    });
  }

  async updateProject(
    id: string,
    input: ProjectInput,
    idx?: number,
  ): Promise<ProjectRecord> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.project.findUnique({ where: { id } });
      if (!existing) throw notFound('Project');
      await this.assertExperienceForProfile(tx, input.experienceId, existing.profileId);
      await this.assertSkillsExist(input.skillIds, tx);
      await tx.projectSkill.deleteMany({ where: { projectId: id } });
      const updated = await tx.project.update({
        where: { id },
        data: {
          experienceId: input.experienceId,
          name: input.name,
          summary: input.summary,
          url: input.url,
          skills: {
            create: input.skillIds.map((skillId, i) => ({
              skillId,
              sortOrder: i,
            })),
          },
        },
      });
      if (idx !== undefined) {
        await moveItem(tx.project, { profileId: existing.profileId }, id, idx);
      }
      return updated;
    });
  }

  async deleteProject(id: string): Promise<string> {
    try {
      const deleted = await this.prisma.project.delete({ where: { id } });
      return deleted.id;
    } catch (e) {
      throw mapPrismaError(e, 'Project');
    }
  }

  async setProjectSkills(
    projectId: string,
    skillIds: readonly string[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({ where: { id: projectId } });
      if (!project) throw notFound('Project');
      await this.assertSkillsExist(skillIds, tx);
      await tx.projectSkill.deleteMany({ where: { projectId } });
      if (skillIds.length > 0) {
        await tx.projectSkill.createMany({
          data: skillIds.map((skillId, i) => ({
            projectId,
            skillId,
            sortOrder: i,
          })),
        });
      }
    });
  }

  async createAchievement(input: AchievementInput): Promise<AchievementRecord> {
    return this.prisma.$transaction(async (tx) => {
      await this.assertAchievementRefs(tx, input.experienceId, input.projectId);
      const sortOrder = await nextSortOrder(tx.achievement, {
        experienceId: input.experienceId,
      });
      return tx.achievement.create({
        data: {
          experienceId: input.experienceId,
          projectId: input.projectId,
          statement: input.statement,
          sortOrder,
        },
      });
    });
  }

  async updateAchievement(
    id: string,
    input: AchievementInput,
    idx?: number,
  ): Promise<AchievementRecord> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.achievement.findUnique({ where: { id } });
      if (!existing) throw notFound('Achievement');
      await this.assertAchievementRefs(tx, input.experienceId, input.projectId);
      const updated = await tx.achievement.update({
        where: { id },
        data: {
          experienceId: input.experienceId,
          projectId: input.projectId,
          statement: input.statement,
        },
      });
      if (idx !== undefined) {
        await moveItem(tx.achievement, { experienceId: input.experienceId }, id, idx);
      }
      return updated;
    });
  }

  async deleteAchievement(id: string): Promise<string> {
    try {
      const deleted = await this.prisma.achievement.delete({ where: { id } });
      return deleted.id;
    } catch (e) {
      throw mapPrismaError(e, 'Achievement');
    }
  }

  async addIllustration(
    input: IllustrationInput,
    idx?: number,
  ): Promise<IllustrationRecord> {
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({
        where: { id: input.projectId },
      });
      if (!project) throw notFound('Project');
      const sortOrder = await nextSortOrder(tx.illustration, {
        projectId: input.projectId,
      });
      const created = await tx.illustration.create({
        data: {
          projectId: input.projectId,
          key: input.key,
          alt: input.alt,
          sortOrder,
        },
      });
      if (idx !== undefined) {
        await moveItem(tx.illustration, { projectId: input.projectId }, created.id, idx);
      }
      return created;
    });
  }

  async updateIllustration(
    id: string,
    patch: { alt?: string },
    idx?: number,
  ): Promise<IllustrationRecord> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.illustration.findUnique({ where: { id } });
      if (!existing) throw notFound('Illustration');
      const updated = await tx.illustration.update({
        where: { id },
        data: patch.alt === undefined ? {} : { alt: patch.alt },
      });
      if (idx !== undefined) {
        await moveItem(tx.illustration, { projectId: existing.projectId }, id, idx);
      }
      return updated;
    });
  }

  async deleteIllustration(id: string): Promise<string> {
    try {
      const deleted = await this.prisma.illustration.delete({ where: { id } });
      return deleted.id;
    } catch (e) {
      throw mapPrismaError(e, 'Illustration');
    }
  }

  // ---- helpers ----

  private async assertProfileExists(tx: Tx, profileId: string): Promise<void> {
    const profile = await tx.profile.findUnique({ where: { id: profileId } });
    if (!profile) throw notFound('Profile');
  }

  private async assertCategoriesExist(
    categoryIds: readonly string[],
    tx?: Tx,
  ): Promise<void> {
    const unique = [...new Set(categoryIds)];
    if (unique.length !== categoryIds.length) {
      throw badInput('Skill category ids must be unique');
    }
    if (unique.length === 0) {
      throw badInput('At least one skill category is required');
    }
    const client = tx ?? this.prisma;
    const found = await client.skillCategory.count({
      where: { id: { in: unique } },
    });
    if (found !== unique.length) {
      throw badInput('Unknown skill category id');
    }
  }

  private async assertSkillsExist(
    skillIds: readonly string[],
    tx?: Tx,
  ): Promise<void> {
    const unique = [...new Set(skillIds)];
    if (unique.length !== skillIds.length) {
      throw badInput('Skill ids must be unique');
    }
    if (unique.length === 0) return;
    const client = tx ?? this.prisma;
    const found = await client.skill.count({
      where: { id: { in: unique } },
    });
    if (found !== unique.length) {
      throw badInput('Unknown skill id');
    }
  }

  private async assertExperienceForProfile(
    tx: Tx,
    experienceId: string | null,
    profileId: string,
  ): Promise<void> {
    if (experienceId === null) return;
    const experience = await tx.experience.findUnique({
      where: { id: experienceId },
    });
    if (!experience) throw notFound('Experience');
    if (experience.profileId !== profileId) {
      throw badInput('Experience belongs to another profile');
    }
  }

  private async assertAchievementRefs(
    tx: Tx,
    experienceId: string,
    projectId: string | null,
  ): Promise<void> {
    const experience = await tx.experience.findUnique({
      where: { id: experienceId },
    });
    if (!experience) throw notFound('Experience');
    if (projectId === null) return;
    const project = await tx.project.findUnique({ where: { id: projectId } });
    if (!project) throw notFound('Project');
    if (project.experienceId !== experienceId) {
      throw badInput('Project does not belong to the given experience');
    }
  }
}

function parsePeriod(
  from: string,
  to: string | null,
): { from: Date; to: Date | null } {
  const fromDate = parseYearMonth(from);
  const toDate = to === null ? null : parseYearMonth(to);
  if (toDate && toDate < fromDate) {
    throw badInput('"to" must not be earlier than "from"');
  }
  return { from: fromDate, to: toDate };
}

/**
 * Moves `movedId` to zero-based `idx` (clamped) within the list selected by
 * `where`, then rewrites `sortOrder` as 0..n-1.
 */
async function moveItem(
  delegate: OrderedDelegate,
  where: object,
  movedId: string,
  idx: number,
  orderBy: object[] = [...BY_SORT_ORDER],
): Promise<void> {
  const rows = await delegate.findMany({ where, orderBy, select: { id: true } });
  const ids = rows.map((row) => row.id).filter((id) => id !== movedId);
  if (ids.length === rows.length) return;
  ids.splice(Math.max(0, Math.min(idx, ids.length)), 0, movedId);
  for (const [sortOrder, id] of ids.entries()) {
    await delegate.update({ where: { id }, data: { sortOrder } });
  }
}

/** Maps Prisma unique-violation / record-missing errors to PortfolioError. */
function mapPrismaError(e: unknown, entity: string, field = 'name'): unknown {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002') return conflict(`${entity} ${field} already exists`);
    if (e.code === 'P2025') return notFound(entity);
  }
  return e;
}
