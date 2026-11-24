import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AdminHttpGuard } from '../auth/admin-http.guard';
import { ResumeService } from './resume.service';
import { renderHtml } from './resume-html';
import { renderMarkdown } from './resume-markdown';
import { renderPdf } from './resume-pdf';

const FORMATS = new Set(['html', 'pdf', 'md', 'markdown']);

@Controller('resume')
@UseGuards(AdminHttpGuard)
export class ResumeController {
  constructor(private readonly resume: ResumeService) {}

  @Get()
  async resumeDocument(
    @Query('format') format = 'html',
    @Res() res: Response,
  ): Promise<void> {
    const kind = format === 'markdown' ? 'md' : format;
    if (!FORMATS.has(kind)) {
      throw new BadRequestException(
        `Unknown format "${format}". Use html, pdf or md.`,
      );
    }
    const data = await this.resume.build();

    if (kind === 'pdf') {
      const pdf = await renderPdf(data);
      res
        .type('application/pdf')
        .set('Content-Disposition', 'inline; filename="resume.pdf"')
        .send(pdf);
      return;
    }
    if (kind === 'md') {
      res
        .type('text/markdown; charset=utf-8')
        .set('Content-Disposition', 'inline; filename="resume.md"')
        .send(renderMarkdown(data));
      return;
    }
    res
      .type('text/html; charset=utf-8')
      .set('Content-Disposition', 'inline; filename="resume.html"')
      .send(renderHtml(data));
  }
}
