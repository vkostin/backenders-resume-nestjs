import { Module } from '@nestjs/common';
import { PersistenceModule } from '../persistence/persistence.module';
import { MediaModule } from '../media/media.module';
import { MEDIA_URLS } from '../media/media-storage';
import { MediaUrls } from '../media/media-urls';
import { PORTFOLIO_QUERIES, PortfolioQueries } from '../persistence/ports';
import { YearMonthScalar } from '../year-month.scalar';
import { GRAPHQL_CONTEXT_FACTORY, createLoaders } from './loaders';
import { PortfolioService } from './portfolio.service';
import { PortfolioMutations } from './mutations.service';
import { MediaMutations } from './media-mutations.service';
import { MutationsResolver } from './mutations.resolver';
import { AdminGuard } from '../auth/admin.guard';
import {
  AchievementResolver,
  ExperienceResolver,
  ProfileResolver,
  ProjectResolver,
  SkillCategoryResolver,
  SkillResolver,
} from './profile.resolver';

@Module({
  imports: [PersistenceModule, MediaModule],
  providers: [
    PortfolioService,
    YearMonthScalar,
    ProfileResolver,
    ExperienceResolver,
    ProjectResolver,
    SkillResolver,
    SkillCategoryResolver,
    AchievementResolver,
    PortfolioMutations,
    MediaMutations,
    MutationsResolver,
    AdminGuard,
    {
      provide: GRAPHQL_CONTEXT_FACTORY,
      useFactory: (queries: PortfolioQueries, mediaUrls: MediaUrls) => {
        return () => ({
          loaders: createLoaders(queries),
          mediaUrls,
        });
      },
      inject: [PORTFOLIO_QUERIES, MEDIA_URLS],
    },
  ],
  exports: [PortfolioService, GRAPHQL_CONTEXT_FACTORY],
})
export class PortfolioModule {}
