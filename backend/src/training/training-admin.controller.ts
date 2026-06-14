import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminJwtAuthGuard } from '../admin-auth/admin-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TrainingService } from './training.service';
import { UpsertCourseDto, UpsertResourceDto } from './dto/training.dto';

@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Controller('admin/training')
export class TrainingAdminController {
  constructor(private training: TrainingService) {}

  // ── Courses ───────────────────────────────────────────────────────────────
  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'EDITOR')
  @Get('courses')
  listCourses() {
    return this.training.adminListCourses();
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'EDITOR')
  @Get('courses/:id')
  getCourse(@Param('id') id: string) {
    return this.training.adminGetCourse(id);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
  @Post('courses')
  createCourse(@Body() dto: UpsertCourseDto, @CurrentUser('id') adminId: string) {
    return this.training.adminCreateCourse(dto, adminId);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
  @Patch('courses/:id')
  updateCourse(@Param('id') id: string, @Body() dto: UpsertCourseDto, @CurrentUser('id') adminId: string) {
    return this.training.adminUpdateCourse(id, dto, adminId);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER')
  @Delete('courses/:id')
  deleteCourse(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.training.adminDeleteCourse(id, adminId);
  }

  // ── Resources ──────────────────────────────────────────────────────────────
  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'EDITOR')
  @Get('resources')
  listResources() {
    return this.training.adminListResources();
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
  @Post('resources')
  createResource(@Body() dto: UpsertResourceDto, @CurrentUser('id') adminId: string) {
    return this.training.adminCreateResource(dto, adminId);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
  @Patch('resources/:id')
  updateResource(@Param('id') id: string, @Body() dto: UpsertResourceDto, @CurrentUser('id') adminId: string) {
    return this.training.adminUpdateResource(id, dto, adminId);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER')
  @Delete('resources/:id')
  deleteResource(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.training.adminDeleteResource(id, adminId);
  }

  // ── Categories ─────────────────────────────────────────────────────────────
  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'EDITOR')
  @Get('categories')
  categories() {
    return this.training.adminCategories();
  }

  // ── Reporting / score tracking ─────────────────────────────────────────────
  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
  @Get('completions')
  completions(
    @Query('state') state?: string,
    @Query('branchCode') branchCode?: string,
    @Query('courseId') courseId?: string,
    @Query('passedOnly') passedOnly?: string,
  ) {
    return this.training.adminCompletions({
      state,
      branchCode,
      courseId,
      passedOnly: passedOnly === 'true' || passedOnly === '1',
    });
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
  @Get('report')
  report() {
    return this.training.adminReportSummary();
  }
}
