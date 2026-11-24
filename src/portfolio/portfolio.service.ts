import { Inject, Injectable } from '@nestjs/common';
import { ProfileRecord } from '../domain';
import { PORTFOLIO_QUERIES, PortfolioQueries } from '../persistence/ports';
import { noProfile, toGraphQLError } from './errors';

@Injectable()
export class PortfolioService {
  constructor(
    @Inject(PORTFOLIO_QUERIES)
    private readonly queries: PortfolioQueries,
  ) {}

  /** The sole published profile; NOT_FOUND when the database is empty. */
  async getProfile(): Promise<ProfileRecord> {
    let profile: ProfileRecord | null;
    try {
      profile = await this.queries.findSoleProfile();
    } catch (error) {
      toGraphQLError(error);
    }
    if (!profile) {
      throw noProfile();
    }
    return profile;
  }
}
