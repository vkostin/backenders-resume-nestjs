import { Module } from '@nestjs/common';
import { PrismaPortfolioQueries } from './prisma-queries';
import { PrismaPortfolioStore } from './prisma-store';
import { PrismaService } from './prisma.service';
import { PORTFOLIO_QUERIES, PORTFOLIO_STORE } from './ports';

@Module({
  providers: [
    PrismaService,
    PrismaPortfolioQueries,
    PrismaPortfolioStore,
    { provide: PORTFOLIO_QUERIES, useExisting: PrismaPortfolioQueries },
    { provide: PORTFOLIO_STORE, useExisting: PrismaPortfolioStore },
  ],
  exports: [PORTFOLIO_QUERIES, PORTFOLIO_STORE, PrismaService],
})
export class PersistenceModule {}
