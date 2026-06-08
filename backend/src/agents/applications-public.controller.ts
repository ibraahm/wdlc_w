import { Body, Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/application.dto';

// Unauthenticated "Become an Agent" application intake.
@Controller('agents')
export class ApplicationsPublicController {
  constructor(private applications: ApplicationsService) {}

  @Post('apply')
  apply(@Body() dto: CreateApplicationDto, @Req() req: Request) {
    return this.applications.create(dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
