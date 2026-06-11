import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminJwtAuthGuard } from '../admin-auth/admin-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { NewsService, CreateNewsPostDto, UpdateNewsPostDto } from './news.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Controller('cms/news')
export class NewsController {
  constructor(private news: NewsService) {}

  @Public()
  @Get()
  listPublished(@Query('category') category?: string) {
    return this.news.listPublished(category);
  }

  @Public()
  @Get(':slug')
  getPublished(@Param('slug') slug: string) {
    return this.news.getPublished(slug);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'EDITOR')
  @Get('admin/all')
  listAll(@Query('category') category?: string) {
    return this.news.listAll(category);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'EDITOR')
  @Post()
  create(@Body() dto: CreateNewsPostDto, @CurrentUser() user: AuthUser) {
    return this.news.create(dto, user.id);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'EDITOR')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateNewsPostDto, @CurrentUser() user: AuthUser) {
    return this.news.update(id, dto, user.id);
  }

  @Roles('SUPER_ADMIN', 'MANAGER')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.news.remove(id, user.id);
  }
}
