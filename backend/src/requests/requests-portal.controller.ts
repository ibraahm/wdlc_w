import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PortalJwtAuthGuard } from '../portal-auth/portal-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestsService } from './requests.service';

const TYPES = ['RISK_ASSESSMENT', 'LOCATION_DD', 'CHECKLIST', 'PHOTOS', 'OTHER'];

class CreateRequestDto {
  @IsOptional() @IsIn(TYPES) type?: string;
  @IsString() @MaxLength(200) subject: string;
  @IsOptional() @IsString() @MaxLength(5000) details?: string;
  @IsOptional() @IsArray() attachments?: unknown[];
}
class MessageDto {
  @IsString() @MaxLength(5000) body: string;
}

@UseGuards(PortalJwtAuthGuard)
@Controller('portal/requests')
export class RequestsPortalController {
  constructor(private requests: RequestsService) {}

  @Get()
  list(@CurrentUser('id') agentId: string) {
    return this.requests.listForAgent(agentId);
  }

  @Post()
  create(@CurrentUser('id') agentId: string, @Body() dto: CreateRequestDto) {
    return this.requests.createForAgent(agentId, dto);
  }

  @Get(':id')
  get(@CurrentUser('id') agentId: string, @Param('id') id: string) {
    return this.requests.getForAgent(agentId, id);
  }

  @Post(':id/messages')
  message(@CurrentUser('id') agentId: string, @Param('id') id: string, @Body() dto: MessageDto) {
    return this.requests.agentMessage(agentId, id, dto.body);
  }
}
