import { Injectable } from '@nestjs/common';
import {
  AchievementRecord,
  ExperienceRecord,
  IllustrationRecord,
  LinkRecord,
  ProfileRecord,
  ProjectRecord,
  SkillCategoryLinkRecord,
  SkillCategoryRecord,
  SkillRecord,
} from '../domain';
import { PrismaService } from './prisma.service';
import { conflict, PortfolioQueries } from './ports';

const profileSelect = {
  id: true,
  name: true,
  headline: true,
  description: true,
  photoKey: true,
} as const;

const linkSelect = {
  id: true,
  profileId: true,
  label: true,
  url: true,
  preferred: true,
  sortOrder: true,
} as const;

const categorySelect = { id: true, name: true, sortOrder: true } as const;

const skillSelect = { id: true, name: true, obsolete: true, sortOrder: true } as const;

const categoryLinkSelect = {
  categoryId: true,
  skillId: true,
  sortOrder: true,
} as const;

const experienceSelect = {
  id: true,
  profileId: true,
  company: true,
  position: true,
  description: true,
  from: true,
  to: true,
  sortOrder: true,
} as const;

const projectSelect = {
  id: true,
  profileId: true,
  experienceId: true,
  name: true,
  summary: true,
  url: true,
  sortOrder: true,
} as const;

const achievementSelect = {
  id: true,
  experienceId: true,
  projectId: true,
  statement: true,
  sortOrder: true,
} as const;

const illustrationSelect = {
  id: true,
  projectId: true,
  key: true,
  alt: true,
  sortOrder: true,
} as const;

@Injectable()
export class PrismaPortfolioQueries implements PortfolioQueries {
  constructor(private readonly prisma: PrismaService) {}

  async findSoleProfile(): Promise<ProfileRecord | null> {
    const profiles = await this.prisma.profile.findMany({
      select: profileSelect,
      orderBy: { id: 'asc' },
      take: 2,
    });
    if (profiles.length > 1) {
      throw conflict('Expected exactly one profile, found multiple');
    }
    return profiles[0] ?? null;
  }

  findLinksByProfileIds(profileIds: readonly string[]): Promise<LinkRecord[]> {
    return this.prisma.link.findMany({
      where: { profileId: { in: [...profileIds] } },
      select: linkSelect,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  findSkillCategories(): Promise<SkillCategoryRecord[]> {
    return this.prisma.skillCategory.findMany({
      select: categorySelect,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  findSkills(): Promise<SkillRecord[]> {
    return this.prisma.skill.findMany({
      select: skillSelect,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  findSkillsByCategoryIds(
    categoryIds: readonly string[],
  ): Promise<SkillCategoryLinkRecord[]> {
    if (categoryIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.prisma.skillCategorySkill.findMany({
      where: { categoryId: { in: [...categoryIds] } },
      select: categoryLinkSelect,
      orderBy: [{ sortOrder: 'asc' }, { skillId: 'asc' }],
    });
  }

  findCategoryLinksBySkillIds(
    skillIds: readonly string[],
  ): Promise<SkillCategoryLinkRecord[]> {
    if (skillIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.prisma.skillCategorySkill.findMany({
      where: { skillId: { in: [...skillIds] } },
      select: categoryLinkSelect,
      orderBy: [{ sortOrder: 'asc' }, { categoryId: 'asc' }],
    });
  }

  findExperiencesByProfileIds(
    profileIds: readonly string[],
  ): Promise<ExperienceRecord[]> {
    return this.prisma.experience.findMany({
      where: { profileId: { in: [...profileIds] } },
      select: experienceSelect,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  findExperienceSkillIdsByExperienceIds(
    experienceIds: readonly string[],
  ): Promise<{ experienceId: string; skillId: string }[]> {
    if (experienceIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.prisma.experienceSkill.findMany({
      where: { experienceId: { in: [...experienceIds] } },
      select: { experienceId: true, skillId: true },
    });
  }

  findExperiencesByIds(
    experienceIds: readonly string[],
  ): Promise<ExperienceRecord[]> {
    if (experienceIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.prisma.experience.findMany({
      where: { id: { in: [...experienceIds] } },
      select: experienceSelect,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  findProjectsByIds(
    projectIds: readonly string[],
  ): Promise<ProjectRecord[]> {
    if (projectIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.prisma.project.findMany({
      where: { id: { in: [...projectIds] } },
      select: projectSelect,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  findProjectsByExperienceIds(
    experienceIds: readonly string[],
  ): Promise<ProjectRecord[]> {
    if (experienceIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.prisma.project.findMany({
      where: { experienceId: { in: [...experienceIds] } },
      select: projectSelect,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  findAchievementsByExperienceIds(
    experienceIds: readonly string[],
  ): Promise<AchievementRecord[]> {
    return this.prisma.achievement.findMany({
      where: { experienceId: { in: [...experienceIds] } },
      select: achievementSelect,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  findAchievementsByProjectIds(
    projectIds: readonly string[],
  ): Promise<AchievementRecord[]> {
    if (projectIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.prisma.achievement.findMany({
      where: { projectId: { in: [...projectIds] } },
      select: achievementSelect,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  findProjectsByProfileIds(
    profileIds: readonly string[],
  ): Promise<ProjectRecord[]> {
    return this.prisma.project.findMany({
      where: { profileId: { in: [...profileIds] } },
      select: projectSelect,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  findProjectSkillIdsByProjectIds(
    projectIds: readonly string[],
  ): Promise<{ projectId: string; skillId: string; sortOrder: number }[]> {
    if (projectIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.prisma.projectSkill.findMany({
      where: { projectId: { in: [...projectIds] } },
      select: { projectId: true, skillId: true, sortOrder: true },
      orderBy: [{ sortOrder: 'asc' }, { skillId: 'asc' }],
    });
  }

  findIllustrationsByProjectIds(
    projectIds: readonly string[],
  ): Promise<IllustrationRecord[]> {
    if (projectIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.prisma.illustration.findMany({
      where: { projectId: { in: [...projectIds] } },
      select: illustrationSelect,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  findIllustrationById(id: string): Promise<IllustrationRecord | null> {
    return this.prisma.illustration.findUnique({
      where: { id },
      select: illustrationSelect,
    });
  }
}
