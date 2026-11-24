import { Module } from '@nestjs/common';
import { PersistenceModule } from '../persistence/persistence.module';
import { MediaModule } from '../media/media.module';
import { ResumeService } from './resume.service';
import { ResumeController } from './resume.controller';
import { AdminHttpGuard } from '../auth/admin-http.guard';

@Module({
  imports: [PersistenceModule, MediaModule],
  controllers: [ResumeController],
  providers: [ResumeService, AdminHttpGuard],
})
export class ResumeModule {}
