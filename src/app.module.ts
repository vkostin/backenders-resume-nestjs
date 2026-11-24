import { join } from 'path';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { PortfolioModule } from './portfolio/portfolio.module';
import { ResumeModule } from './resume/resume.module';
import { GRAPHQL_CONTEXT_FACTORY } from './portfolio/loaders';

@Module({
  imports: [
    PortfolioModule,
    ResumeModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [PortfolioModule],
      inject: [GRAPHQL_CONTEXT_FACTORY],
      useFactory: (context: () => unknown): ApolloDriverConfig => ({
        autoSchemaFile: join(process.cwd(), 'schema.graphql'),
        sortSchema: true,
        introspection: true,
        playground: false,
        plugins: [
          ApolloServerPluginLandingPageLocalDefault({ embed: true }),
        ],
        context,
      }),
    }),
  ],
})
export class AppModule {}
