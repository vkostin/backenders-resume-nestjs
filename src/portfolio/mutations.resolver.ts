import { Args, ID, Int, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { FileUpload, GraphQLUpload } from 'graphql-upload-ts';
import { AdminGuard } from '../auth/admin.guard';
import {
  AchievementRecord,
  ExperienceRecord,
  LinkRecord,
  ProfileRecord,
  ProjectRecord,
  SkillCategoryRecord,
  SkillRecord,
} from '../domain';
import {
  AchievementType,
  ExperienceType,
  IllustrationType,
  LinkType,
  PhotoType,
  ProfileType,
  ProjectType,
  SkillCategoryType,
  SkillType,
} from './graphql-types';
import {
  AchievementInput,
  ExperienceInput,
  IllustrationPatchInput,
  LinkInput,
  ProfileInput,
  ProjectInput,
  SkillCategoryInput,
  SkillInput,
} from './inputs';
import { PortfolioMutations } from './mutations.service';
import { MediaMutations } from './media-mutations.service';

@Resolver()
@UseGuards(AdminGuard)
export class MutationsResolver {
  constructor(
    private readonly mutations: PortfolioMutations,
    private readonly mediaMutations: MediaMutations,
  ) {}

  @Mutation(() => ProfileType)
  updateProfile(@Args('input') input: ProfileInput): Promise<ProfileRecord> {
    return this.mutations.updateProfile(input);
  }

  @Mutation(() => LinkType)
  createLink(@Args('input') input: LinkInput): Promise<LinkRecord> {
    return this.mutations.createLink(input);
  }

  @Mutation(() => LinkType)
  updateLink(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: LinkInput,
    @Args('idx', { type: () => Int, nullable: true }) idx?: number | null,
  ): Promise<LinkRecord> {
    return this.mutations.updateLink(id, input, idx);
  }

  @Mutation(() => ID)
  deleteLink(@Args('id', { type: () => ID }) id: string): Promise<string> {
    return this.mutations.deleteLink(id);
  }

  @Mutation(() => SkillCategoryType)
  createSkillCategory(
    @Args('input') input: SkillCategoryInput,
  ): Promise<SkillCategoryRecord> {
    return this.mutations.createSkillCategory(input);
  }

  @Mutation(() => SkillCategoryType)
  updateSkillCategory(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: SkillCategoryInput,
    @Args('idx', { type: () => Int, nullable: true }) idx?: number | null,
  ): Promise<SkillCategoryRecord> {
    return this.mutations.updateSkillCategory(id, input, idx);
  }

  @Mutation(() => ID)
  deleteSkillCategory(@Args('id', { type: () => ID }) id: string): Promise<string> {
    return this.mutations.deleteSkillCategory(id);
  }

  @Mutation(() => SkillType)
  createSkill(@Args('input') input: SkillInput): Promise<SkillRecord> {
    return this.mutations.createSkill(input);
  }

  @Mutation(() => SkillType)
  updateSkill(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: SkillInput,
    @Args('idx', { type: () => Int, nullable: true }) idx?: number | null,
  ): Promise<SkillRecord> {
    return this.mutations.updateSkill(id, input, idx);
  }

  @Mutation(() => ID)
  deleteSkill(@Args('id', { type: () => ID }) id: string): Promise<string> {
    return this.mutations.deleteSkill(id);
  }

  @Mutation(() => ExperienceType)
  createExperience(
    @Args('input') input: ExperienceInput,
  ): Promise<ExperienceRecord> {
    return this.mutations.createExperience(input);
  }

  @Mutation(() => ExperienceType)
  updateExperience(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: ExperienceInput,
    @Args('idx', { type: () => Int, nullable: true }) idx?: number | null,
  ): Promise<ExperienceRecord> {
    return this.mutations.updateExperience(id, input, idx);
  }

  @Mutation(() => ID)
  deleteExperience(@Args('id', { type: () => ID }) id: string): Promise<string> {
    return this.mutations.deleteExperience(id);
  }

  @Mutation(() => ID)
  setExperienceSkills(
    @Args('experienceId', { type: () => ID }) experienceId: string,
    @Args('skillIds', { type: () => [ID] }) skillIds: string[],
  ): Promise<string> {
    return this.mutations.setExperienceSkills(experienceId, skillIds);
  }

  @Mutation(() => ProjectType)
  createProject(@Args('input') input: ProjectInput): Promise<ProjectRecord> {
    return this.mutations.createProject(input);
  }

  @Mutation(() => ProjectType)
  updateProject(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: ProjectInput,
    @Args('idx', { type: () => Int, nullable: true }) idx?: number | null,
  ): Promise<ProjectRecord> {
    return this.mutations.updateProject(id, input, idx);
  }

  @Mutation(() => ID)
  deleteProject(@Args('id', { type: () => ID }) id: string): Promise<string> {
    return this.mediaMutations.deleteProject(id);
  }

  @Mutation(() => ID)
  setProjectSkills(
    @Args('projectId', { type: () => ID }) projectId: string,
    @Args('skillIds', { type: () => [ID] }) skillIds: string[],
  ): Promise<string> {
    return this.mutations.setProjectSkills(projectId, skillIds);
  }

  @Mutation(() => AchievementType)
  createAchievement(
    @Args('input') input: AchievementInput,
  ): Promise<AchievementRecord> {
    return this.mutations.createAchievement(input);
  }

  @Mutation(() => AchievementType)
  updateAchievement(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: AchievementInput,
    @Args('idx', { type: () => Int, nullable: true }) idx?: number | null,
  ): Promise<AchievementRecord> {
    return this.mutations.updateAchievement(id, input, idx);
  }

  @Mutation(() => ID)
  deleteAchievement(@Args('id', { type: () => ID }) id: string): Promise<string> {
    return this.mutations.deleteAchievement(id);
  }

  @Mutation(() => IllustrationType)
  updateIllustration(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: IllustrationPatchInput,
  ): Promise<IllustrationType> {
    return this.mediaMutations.updateIllustration(
      id,
      { alt: input.alt },
      input.idx,
    );
  }

  @Mutation(() => ID)
  deleteIllustration(@Args('id', { type: () => ID }) id: string): Promise<string> {
    return this.mediaMutations.deleteIllustration(id);
  }

  @Mutation(() => IllustrationType)
  addProjectIllustration(
    @Args('projectId', { type: () => ID }) projectId: string,
    // Typed as unknown so the global ValidationPipe skips transforming the
    // Upload promise (class-transformer cannot handle Promise values).
    @Args('file', { type: () => GraphQLUpload })
    file: unknown,
    @Args('alt') alt: string,
    @Args('idx', { type: () => Int, nullable: true }) idx?: number | null,
  ): Promise<IllustrationType> {
    return this.mediaMutations.addProjectIllustration(
      projectId,
      file as Promise<FileUpload>,
      alt,
      idx,
    );
  }

  @Mutation(() => PhotoType)
  setProfilePhoto(
    @Args('file', { type: () => GraphQLUpload })
    file: unknown,
  ): Promise<PhotoType> {
    return this.mediaMutations.setProfilePhoto(file as Promise<FileUpload>);
  }

  @Mutation(() => Boolean)
  removeProfilePhoto(): Promise<boolean> {
    return this.mediaMutations.removeProfilePhoto();
  }
}
