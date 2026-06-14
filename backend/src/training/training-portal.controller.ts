import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { PortalJwtAuthGuard } from '../portal-auth/portal-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TrainingService } from './training.service';
import { SubmitQuizDto } from './dto/training.dto';

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
