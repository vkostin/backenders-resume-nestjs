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

export const PORTFOLIO_QUERIES = 'PORTFOLIO_QUERIES';
export const PORTFOLIO_STORE = 'PORTFOLIO_STORE';

export type ErrorCode = 'NOT_FOUND' | 'BAD_USER_INPUT' | 'CONFLICT';

export class PortfolioError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PortfolioError';
  }
}

export function notFound(what: string): PortfolioError {
  return new PortfolioError('NOT_FOUND', `${what} not found`);
}

export function badInput(message: string): PortfolioError {
  return new PortfolioError('BAD_USER_INPUT', message);
}

export function conflict(message: string): PortfolioError {
  return new PortfolioError('CONFLICT', message);
}

/** Read port: batched lookups consumed by GraphQL DataLoaders. */
export interface PortfolioQueries {
  /** The single profile this API publishes, or null when the database is empty. */
  findSoleProfile(): Promise<ProfileRecord | null>;
  findLinksByProfileIds(profileIds: readonly string[]): Promise<LinkRecord[]>;
  findSkillCategories(): Promise<SkillCategoryRecord[]>;
  findSkills(): Promise<SkillRecord[]>;
  findSkillsByCategoryIds(
    categoryIds: readonly string[],
  ): Promise<SkillCategoryLinkRecord[]>;
  findCategoryLinksBySkillIds(
    skillIds: readonly string[],
  ): Promise<SkillCategoryLinkRecord[]>;
  findExperiencesByProfileIds(
    profileIds: readonly string[],
  ): Promise<ExperienceRecord[]>;
  findExperienceSkillIdsByExperienceIds(
    experienceIds: readonly string[],
  ): Promise<{ experienceId: string; skillId: string }[]>;
  findExperiencesByIds(
    experienceIds: readonly string[],
  ): Promise<ExperienceRecord[]>;
  findProjectsByIds(
    projectIds: readonly string[],
  ): Promise<ProjectRecord[]>;
  findProjectsByExperienceIds(
    experienceIds: readonly string[],
  ): Promise<ProjectRecord[]>;
  findAchievementsByExperienceIds(
    experienceIds: readonly string[],
  ): Promise<AchievementRecord[]>;
  findAchievementsByProjectIds(
    projectIds: readonly string[],
  ): Promise<AchievementRecord[]>;
  findProjectsByProfileIds(
    profileIds: readonly string[],
  ): Promise<ProjectRecord[]>;
  findProjectSkillIdsByProjectIds(
    projectIds: readonly string[],
  ): Promise<{ projectId: string; skillId: string; sortOrder: number }[]>;
  findIllustrationsByProjectIds(
    projectIds: readonly string[],
  ): Promise<IllustrationRecord[]>;
  findIllustrationById(id: string): Promise<IllustrationRecord | null>;
}

/** Profile fields editable through the API; the photo has its own method. */
export interface ProfileInput {
  name: string;
  headline: string | null;
  description: string;
}

export interface LinkInput {
  label: string;
  url: string;
  preferred: boolean;
}

export interface SkillCategoryInput {
  name: string;
}

export interface SkillInput {
  name: string;
  obsolete: boolean;
  categoryIds: readonly string[];
}

export interface ExperienceInput {
  company: string | null;
  /** Job title. */
  position: string;
  description: string;
  from: string; // YYYY-MM
  to: string | null; // YYYY-MM
}

export interface ProjectInput {
  experienceId: string | null;
  name: string;
  summary: string;
  url: string | null;
  skillIds: readonly string[];
}

export interface AchievementInput {
  experienceId: string;
  projectId: string | null;
  statement: string;
}

export interface IllustrationInput {
  projectId: string;
  key: string;
  alt: string;
}

/**
 * Write port: every mutation of stored data.
 *
 * Ordered lists append on create. `idx`, where accepted, moves the item to
 * that zero-based index (clamped) within its list. It is always a separate
 * argument so it cannot collide with input fields such as the experience
 * `position` (job title).
 */
export interface PortfolioStore {
  updateProfile(profileId: string, input: ProfileInput): Promise<void>;
  setProfilePhotoKey(profileId: string, photoKey: string | null): Promise<void>;

  createLink(profileId: string, input: LinkInput): Promise<LinkRecord>;
  updateLink(id: string, input: LinkInput, idx?: number): Promise<LinkRecord>;
  deleteLink(id: string): Promise<string>;

  createSkillCategory(input: SkillCategoryInput): Promise<SkillCategoryRecord>;
  updateSkillCategory(
    id: string,
    input: SkillCategoryInput,
    idx?: number,
  ): Promise<SkillCategoryRecord>;
  deleteSkillCategory(id: string): Promise<string>;

  createSkill(input: SkillInput): Promise<SkillRecord>;
  updateSkill(id: string, input: SkillInput, idx?: number): Promise<SkillRecord>;
  deleteSkill(id: string): Promise<string>;

  createExperience(profileId: string, input: ExperienceInput): Promise<ExperienceRecord>;
  updateExperience(
    id: string,
    input: ExperienceInput,
    idx?: number,
  ): Promise<ExperienceRecord>;
  deleteExperience(id: string): Promise<string>;
  setExperienceSkills(experienceId: string, skillIds: readonly string[]): Promise<void>;

  createProject(profileId: string, input: ProjectInput): Promise<ProjectRecord>;
  updateProject(id: string, input: ProjectInput, idx?: number): Promise<ProjectRecord>;
  deleteProject(id: string): Promise<string>;
  setProjectSkills(projectId: string, skillIds: readonly string[]): Promise<void>;

  createAchievement(input: AchievementInput): Promise<AchievementRecord>;
  updateAchievement(
    id: string,
    input: AchievementInput,
    idx?: number,
  ): Promise<AchievementRecord>;
  deleteAchievement(id: string): Promise<string>;

  addIllustration(input: IllustrationInput, idx?: number): Promise<IllustrationRecord>;
  updateIllustration(
    id: string,
    patch: { alt?: string },
    idx?: number,
  ): Promise<IllustrationRecord>;
  deleteIllustration(id: string): Promise<string>;
}
