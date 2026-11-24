import DataLoader from 'dataloader';
import {
  AchievementRecord,
  ExperienceRecord,
  IllustrationRecord,
  LinkRecord,
  ProjectRecord,
  SkillCategoryLinkRecord,
  SkillCategoryRecord,
  SkillRecord,
} from '../domain';
import { PortfolioQueries } from '../persistence/ports';
import { MediaUrls } from '../media/media-urls';
import { groupBy } from '../utils/group-by';

export const GRAPHQL_CONTEXT_FACTORY = 'GRAPHQL_CONTEXT_FACTORY';

export interface PortfolioLoaders {
  linksByProfile: DataLoader<string, LinkRecord[]>;
  skillCategories: DataLoader<'all', SkillCategoryRecord[]>;
  categoryLinksByCategory: DataLoader<string, SkillCategoryLinkRecord[]>;
  categoryLinksBySkill: DataLoader<string, SkillCategoryLinkRecord[]>;
  categoriesById: DataLoader<string, SkillCategoryRecord | null>;
  skills: DataLoader<'all', SkillRecord[]>;
  skillsById: DataLoader<string, SkillRecord | null>;
  experiencesByProfile: DataLoader<string, ExperienceRecord[]>;
  experienceById: DataLoader<string, ExperienceRecord | null>;
  projectsByProfile: DataLoader<string, ProjectRecord[]>;
  projectsByExperience: DataLoader<string, ProjectRecord[]>;
  projectById: DataLoader<string, ProjectRecord | null>;
  experienceSkillIdsByExperience: DataLoader<string, string[]>;
  projectSkillIdsByProject: DataLoader<string, { skillId: string; sortOrder: number }[]>;
  achievementsByExperience: DataLoader<string, AchievementRecord[]>;
  achievementsByProject: DataLoader<string, AchievementRecord[]>;
  illustrationsByProject: DataLoader<string, IllustrationRecord[]>;
}

export interface GraphQLContext {
  loaders: PortfolioLoaders;
  mediaUrls: MediaUrls;
}

export function createLoaders(
  queries: PortfolioQueries,
): PortfolioLoaders {
  let skillsPromise: Promise<SkillRecord[]> | null = null;
  const allSkills = () =>
    (skillsPromise ??= queries.findSkills());
  let categoriesPromise: Promise<SkillCategoryRecord[]> | null = null;
  const allCategories = () =>
    (categoriesPromise ??= queries.findSkillCategories());

  return {
    linksByProfile: new DataLoader(async (profileIds) => {
      const rows = await queries.findLinksByProfileIds(profileIds);
      return forKeys(profileIds, rows, (row) => row.profileId);
    }),
    skillCategories: new DataLoader(async (keys) => {
      const rows = await allCategories();
      return keys.map(() => rows);
    }),
    categoryLinksByCategory: new DataLoader(async (categoryIds) => {
      const rows = await queries.findSkillsByCategoryIds(categoryIds);
      return forKeys(categoryIds, rows, (row) => row.categoryId);
    }),
    categoryLinksBySkill: new DataLoader(async (skillIds) => {
      const rows = await queries.findCategoryLinksBySkillIds(skillIds);
      return forKeys(skillIds, rows, (row) => row.skillId);
    }),
    categoriesById: new DataLoader(async (ids) => {
      const rows = await allCategories();
      const byId = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => byId.get(id) ?? null);
    }),
    skills: new DataLoader(async (keys) => {
      const rows = await allSkills();
      return keys.map(() => rows);
    }),
    skillsById: new DataLoader(async (ids) => {
      const rows = await allSkills();
      const byId = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => byId.get(id) ?? null);
    }),
    experiencesByProfile: new DataLoader(async (profileIds) => {
      const rows = await queries.findExperiencesByProfileIds(profileIds);
      return forKeys(profileIds, rows, (row) => row.profileId);
    }),
    experienceById: new DataLoader(async (ids) => {
      const rows = await queries.findExperiencesByIds(ids);
      const byId = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => byId.get(id) ?? null);
    }),
    projectsByProfile: new DataLoader(async (profileIds) => {
      const rows = await queries.findProjectsByProfileIds(profileIds);
      return forKeys(profileIds, rows, (row) => row.profileId);
    }),
    projectsByExperience: new DataLoader(async (experienceIds) => {
      const rows = await queries.findProjectsByExperienceIds(experienceIds);
      return forKeys(experienceIds, rows, (row) => row.experienceId);
    }),
    projectById: new DataLoader(async (ids) => {
      const rows = await queries.findProjectsByIds(ids);
      const byId = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => byId.get(id) ?? null);
    }),
    experienceSkillIdsByExperience: new DataLoader(async (experienceIds) => {
      const rows = await queries.findExperienceSkillIdsByExperienceIds(
        experienceIds,
      );
      return forKeys(experienceIds, rows, (row) => row.experienceId, (row) => row.skillId);
    }),
    projectSkillIdsByProject: new DataLoader(async (projectIds) => {
      const rows = await queries.findProjectSkillIdsByProjectIds(projectIds);
      return forKeys(projectIds, rows, (row) => row.projectId);
    }),
    achievementsByExperience: new DataLoader(async (experienceIds) => {
      const rows = await queries.findAchievementsByExperienceIds(experienceIds);
      return forKeys(experienceIds, rows, (row) => row.experienceId);
    }),
    achievementsByProject: new DataLoader(async (projectIds) => {
      const rows = await queries.findAchievementsByProjectIds(projectIds);
      return forKeys(projectIds, rows, (row) => row.projectId);
    }),
    illustrationsByProject: new DataLoader(async (projectIds) => {
      const rows = await queries.findIllustrationsByProjectIds(projectIds);
      return forKeys(projectIds, rows, (row) => row.projectId);
    }),
  };
}

/** One result list per DataLoader key, in key order; missing keys get []. */
function forKeys<T, V = T>(
  keys: readonly string[],
  rows: readonly T[],
  keyOf: (row: T) => string | null,
  valueOf?: (row: T) => V,
): V[][] {
  const grouped = groupBy(rows, keyOf, valueOf);
  return keys.map((key) => grouped.get(key) ?? []);
}
