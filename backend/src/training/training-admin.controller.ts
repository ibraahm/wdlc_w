import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminJwtAuthGuard } from '../admin-auth/admin-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { TrainingService } from './training.service';
import { UpsertCourseDto, UpsertResourceDto, UpsertSectionDto, UpsertLessonDto, CreateAssignmentDto, UpdateAssignmentDto } from './dto/training.dto';

@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Controller('admin/training')
export class TrainingAdminController {
  constructor(private training: TrainingService) {}

  // ── Courses ───────────────────────────────────────────────────────────────
  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'EDITOR', 'REGIONAL_OFFICER')
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

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'EDITOR')
  @Get('courses/:id/versions')
  courseVersions(@Param('id') id: string) {
    return this.training.adminListVersions(id);
  }

  // ── Curriculum: sections ────────────────────────────────────────────────────
  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
  @Post('courses/:courseId/sections')
  createSection(@Param('courseId') courseId: string, @Body() dto: UpsertSectionDto, @CurrentUser('id') adminId: string) {
    return this.training.adminCreateSection(courseId, dto, adminId);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
  @Patch('sections/:id')
  updateSection(@Param('id') id: string, @Body() dto: UpsertSectionDto, @CurrentUser('id') adminId: string) {
    return this.training.adminUpdateSection(id, dto, adminId);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
  @Delete('sections/:id')
  deleteSection(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.training.adminDeleteSection(id, adminId);
  }

  // ── Curriculum: lessons ─────────────────────────────────────────────────────
  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
  @Post('sections/:sectionId/lessons')
  createLesson(@Param('sectionId') sectionId: string, @Body() dto: UpsertLessonDto, @CurrentUser('id') adminId: string) {
    return this.training.adminCreateLesson(sectionId, dto, adminId);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
  @Patch('lessons/:id')
  updateLesson(@Param('id') id: string, @Body() dto: UpsertLessonDto, @CurrentUser('id') adminId: string) {
    return this.training.adminUpdateLesson(id, dto, adminId);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
  @Delete('lessons/:id')
  deleteLesson(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.training.adminDeleteLesson(id, adminId);
  }

  // ── Assignments (Phase 3) ───────────────────────────────────────────────────
  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
  @Get('assignments')
  listAssignments(
    @Query('courseId') courseId?: string,
    @Query('agentId') agentId?: string,
    @Query('branchCode') branchCode?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.training.adminListAssignments({
      courseId,
      agentId,
      branchCode,
      activeOnly: activeOnly === 'true' || activeOnly === '1',
    });
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
  @Post('assignments')
  createAssignment(@Body() dto: CreateAssignmentDto, @CurrentUser('id') adminId: string) {
    return this.training.adminCreateAssignment(dto, adminId);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
  @Patch('assignments/:id')
  updateAssignment(@Param('id') id: string, @Body() dto: UpdateAssignmentDto, @CurrentUser('id') adminId: string) {
    return this.training.adminUpdateAssignment(id, dto, adminId);
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
  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'REGIONAL_OFFICER')
  @Get('completions')
  completions(
    @CurrentUser() user: AuthUser,
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
    }, user.id, user.role);
  }

  @Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER', 'REGIONAL_OFFICER')
  @Get('report')
  report(@CurrentUser() user: AuthUser) {
    return this.training.adminReportSummary(user.id, user.role);
  }
}
