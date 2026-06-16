import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminJwtAuthGuard } from '../admin-auth/admin-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PageService } from './page.service';
import { CreatePageDto, UpdatePageDto } from './dto/page.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Controller('cms/pages')
export class PageController {
  constructor(private pages: PageService) {}

  @Public()
  @Get('published')
  listPublished() {
    return this.pages.findAll('PUBLISHED');
  }

  @Public()
  @Get('published/:slug(*)')
  getPublished(@Param('slug') slug: string) {
    return this.pages.findBySlug(slug, true);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'EDITOR')
  @Get()
  list(@Query('status') status?: string) {
    return this.pages.findAll(status);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'EDITOR')
  @Post()
  create(@Body() dto: CreatePageDto, @CurrentUser() user: AuthUser) {
    return this.pages.create(dto, user.id);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
  @Patch(':slug(*)/publish')
  publish(@Param('slug') slug: string, @CurrentUser() user: AuthUser) {
    return this.pages.publish(slug, user.id, user.role!);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
  @Patch(':slug(*)/unpublish')
  unpublish(@Param('slug') slug: string, @CurrentUser() user: AuthUser) {
    return this.pages.unpublish(slug, user.id);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'EDITOR')
  @Patch(':slug(*)')
  update(@Param('slug') slug: string, @Body() dto: UpdatePageDto, @CurrentUser() user: AuthUser) {
    return this.pages.update(slug, dto, user.id);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER')
  @Delete(':slug(*)')
  remove(@Param('slug') slug: string, @CurrentUser() user: AuthUser) {
    return this.pages.remove(slug, user.id, user.role!);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'EDITOR')
  @Get(':slug(*)')
  get(@Param('slug') slug: string) {
    return this.pages.findBySlug(slug);
  }
}
