import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PortalJwtAuthGuard } from '../portal-auth/portal-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TrainingService } from './training.service';
import { SubmitQuizDto, SetLanguageDto } from './dto/training.dto';

// Agent/teller-facing training portal. All routes require a valid portal JWT.
@UseGuards(PortalJwtAuthGuard)
@Controller('portal/training')
export class TrainingPortalController {
  constructor(private training: TrainingService) {}

  @Get('courses')
  courses(@CurrentUser('id') agentId: string) {
    return this.training.listCoursesForAgent(agentId);
  }

  @Get('courses/:slug')
  course(@CurrentUser('id') agentId: string, @Param('slug') slug: string) {
    return this.training.getCourseForAgent(agentId, slug);
  }

  @Post('lessons/:lessonId/complete')
  completeLesson(@CurrentUser('id') agentId: string, @Param('lessonId') lessonId: string) {
    return this.training.markLessonComplete(agentId, lessonId);
  }

  @Post('courses/:slug/submit')
  submit(
    @CurrentUser('id') agentId: string,
    @Param('slug') slug: string,
    @Body() dto: SubmitQuizDto,
    @Req() req: Request,
  ) {
    return this.training.submitQuiz(agentId, slug, dto.answers, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get('courses/:slug/certificate')
  async certificate(@CurrentUser('id') agentId: string, @Param('slug') slug: string, @Res() res: Response) {
    const { pdf, filename } = await this.training.getCertificate(agentId, slug);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }

  @Post('language')
  setLanguage(@CurrentUser('id') agentId: string, @Body() dto: SetLanguageDto) {
    return this.training.setLanguage(agentId, dto.language);
  }

  @Get('resources')
  resources(@CurrentUser('id') agentId: string) {
    return this.training.listResourcesForAgent(agentId);
  }

  @Post('resources/:id/ack')
  ack(@CurrentUser('id') agentId: string, @Param('id') id: string, @Req() req: Request) {
    return this.training.acknowledgeResource(agentId, id, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
