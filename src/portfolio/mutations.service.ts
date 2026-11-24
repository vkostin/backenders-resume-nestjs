import { Inject, Injectable } from '@nestjs/common';
import {
  AchievementRecord,
  ExperienceRecord,
  LinkRecord,
  ProfileRecord,
  ProjectRecord,
  SkillCategoryRecord,
  SkillRecord,
} from '../domain';
import { PORTFOLIO_STORE, PortfolioStore } from '../persistence/ports';
import { call } from './errors';
import {
  AchievementInput,
  ExperienceInput,
  LinkInput,
  ProfileInput,
  ProjectInput,
  SkillCategoryInput,
  SkillInput,
} from './inputs';
import { PortfolioService } from './portfolio.service';

/**
 * Mutations of rows that own no stored media. Anything that also touches
 * the object store lives in MediaMutations.
 *
 * `idx` (zero-based list index) arrives as `number | null | undefined` from
 * GraphQL; `null` means "keep the current slot".
 */
@Injectable()
export class PortfolioMutations {
  constructor(
    private readonly portfolio: PortfolioService,
    @Inject(PORTFOLIO_STORE)
    private readonly store: PortfolioStore,
  ) {}

  private async profileId(): Promise<string> {
    return (await this.portfolio.getProfile()).id;
  }

  async updateProfile(input: ProfileInput): Promise<ProfileRecord> {
    const profile = await this.portfolio.getProfile();
    const fields = {
      name: input.name,
      headline: input.headline ?? null,
      description: input.description,
    };
    await call(() => this.store.updateProfile(profile.id, fields));
    return { ...profile, ...fields };
  }

  createLink(input: LinkInput): Promise<LinkRecord> {
    return call(async () => this.store.createLink(await this.profileId(), input));
  }

  updateLink(id: string, input: LinkInput, idx?: number | null): Promise<LinkRecord> {
    return call(() => this.store.updateLink(id, input, idx ?? undefined));
  }

  deleteLink(id: string): Promise<string> {
    return call(() => this.store.deleteLink(id));
  }

  createSkillCategory(input: SkillCategoryInput): Promise<SkillCategoryRecord> {
    return call(() => this.store.createSkillCategory(input));
  }

  updateSkillCategory(
    id: string,
    input: SkillCategoryInput,
    idx?: number | null,
  ): Promise<SkillCategoryRecord> {
    return call(() => this.store.updateSkillCategory(id, input, idx ?? undefined));
  }

  deleteSkillCategory(id: string): Promise<string> {
    return call(() => this.store.deleteSkillCategory(id));
  }

  createSkill(input: SkillInput): Promise<SkillRecord> {
    return call(() => this.store.createSkill(input));
  }

  updateSkill(id: string, input: SkillInput, idx?: number | null): Promise<SkillRecord> {
    return call(() => this.store.updateSkill(id, input, idx ?? undefined));
  }

  deleteSkill(id: string): Promise<string> {
    return call(() => this.store.deleteSkill(id));
  }

  createExperience(input: ExperienceInput): Promise<ExperienceRecord> {
    return call(async () =>
      this.store.createExperience(await this.profileId(), input),
    );
  }

  updateExperience(
    id: string,
    input: ExperienceInput,
    idx?: number | null,
  ): Promise<ExperienceRecord> {
    return call(() => this.store.updateExperience(id, input, idx ?? undefined));
  }

  deleteExperience(id: string): Promise<string> {
    return call(() => this.store.deleteExperience(id));
  }

  async setExperienceSkills(
    experienceId: string,
    skillIds: readonly string[],
  ): Promise<string> {
    await call(() => this.store.setExperienceSkills(experienceId, skillIds));
    return experienceId;
  }

  createProject(input: ProjectInput): Promise<ProjectRecord> {
    return call(async () =>
      this.store.createProject(await this.profileId(), input),
    );
  }

  updateProject(
    id: string,
    input: ProjectInput,
    idx?: number | null,
  ): Promise<ProjectRecord> {
    return call(() => this.store.updateProject(id, input, idx ?? undefined));
  }

  async setProjectSkills(
    projectId: string,
    skillIds: readonly string[],
  ): Promise<string> {
    await call(() => this.store.setProjectSkills(projectId, skillIds));
    return projectId;
  }

  createAchievement(input: AchievementInput): Promise<AchievementRecord> {
    return call(() => this.store.createAchievement(input));
  }

  updateAchievement(
    id: string,
    input: AchievementInput,
    idx?: number | null,
  ): Promise<AchievementRecord> {
    return call(() => this.store.updateAchievement(id, input, idx ?? undefined));
  }

  deleteAchievement(id: string): Promise<string> {
    return call(() => this.store.deleteAchievement(id));
  }
}
