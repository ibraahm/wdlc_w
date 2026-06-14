import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { sanitizeLessonHtml } from './sanitize';
import { normalizeVideoUrl } from './video.util';
import { buildCertificatePdf } from './certificate';

interface Question {
  q: string;
  options: string[];
  answer: number;
}

const CSV = (v?: string | null): string[] =>
  (v ?? '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);

const parseQuestions = (json: string): Question[] => {
  try {
    const parsed = JSON.parse(json || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

type CourseWithCurriculum = {
  id: string; slug: string; title: string; category: string; description: string | null;
  contentHtml: string; questions: string; passingScore: number; audience: string;
  targetStates: string | null; targetBranches: string | null; status: string; order: number;
  language: string; translationGroup: string | null; dueAt: Date | null; requireLessons: boolean;
  sections: { id: string; title: string; order: number; lessons: {
    id: string; title: string; order: number; contentHtml: string; videoUrl: string | null; durationMinutes: number | null;
  }[] }[];
};

@Injectable()
export class TrainingService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  // ── Audience resolution ─────────────────────────────────────────────────
  private async resolveAudience(agentId: string): Promise<{ branchCode: string | null; states: string[]; language: string }> {
    const user = await this.prisma.agentUser.findUnique({
      where: { id: agentId },
      select: { branchCode: true, preferredLanguage: true },
    });
    const branchCode = user?.branchCode ?? null;
    let states: string[] = [];
    if (branchCode) {
      const file = await this.prisma.agentDDFile.findUnique({ where: { branchCode }, select: { states: true } });
      states = CSV(file?.states);
    }
    return { branchCode, states, language: user?.preferredLanguage || 'en' };
  }

  private matches(
    item: { audience: string; targetStates: string | null; targetBranches: string | null },
    branchCode: string | null,
    states: string[],
  ): boolean {
    if (item.audience === 'ALL') return true;
    if (item.audience === 'STATE') return CSV(item.targetStates).some((s) => states.includes(s));
    if (item.audience === 'AGENT') return !!branchCode && CSV(item.targetBranches).includes(branchCode.toUpperCase());
    return false;
  }

  private groupKey(c: { translationGroup: string | null; id: string }) {
    return c.translationGroup || c.id;
  }

  // Pick the best language variant of a course group for a given preference.
  private pickVariant<T extends { language: string; order: number }>(group: T[], pref: string): T {
    return (
      group.find((c) => c.language === pref) ||
      group.find((c) => c.language === 'en') ||
      [...group].sort((a, b) => a.order - b.order)[0]
    );
  }

  // ── PORTAL: course catalogue ──────────────────────────────────────────────
  async listCoursesForAgent(agentId: string) {
    const { branchCode, states, language } = await this.resolveAudience(agentId);
    const courses = (await this.prisma.course.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: { sections: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } } },
    })) as unknown as CourseWithCurriculum[];
    const assigned = courses.filter((c) => this.matches(c, branchCode, states));
    const assignedIds = assigned.map((c) => c.id);

    const [completions, progress] = await Promise.all([
      this.prisma.courseCompletion.findMany({ where: { agentId, courseId: { in: assignedIds } } }),
      this.prisma.lessonProgress.findMany({ where: { agentId } }),
    ]);
    const passedCourseIds = new Set(completions.filter((c) => c.passed).map((c) => c.courseId));
    const bestScoreByCourse = new Map<string, number>();
    for (const c of completions) {
      if (c.passed) bestScoreByCourse.set(c.courseId, Math.max(bestScoreByCourse.get(c.courseId) ?? 0, c.score));
    }
    const doneLessons = new Set(progress.map((p) => p.lessonId));

    // Group translations and present one card per group.
    const groups = new Map<string, CourseWithCurriculum[]>();
    for (const c of assigned) {
      const key = this.groupKey(c);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    }

    const now = new Date();
    const cards = Array.from(groups.values()).map((group) => {
      const variant = this.pickVariant(group, language);
      const lessons = variant.sections.flatMap((s) => s.lessons);
      const lessonsDone = lessons.filter((l) => doneLessons.has(l.id)).length;
      const passed = group.some((c) => passedCourseIds.has(c.id));
      const bestScore = Math.max(0, ...group.map((c) => bestScoreByCourse.get(c.id) ?? 0)) || null;
      const progressPct = lessons.length
        ? Math.round((lessonsDone / lessons.length) * 100)
        : passed ? 100 : 0;
      const overdue = !passed && !!variant.dueAt && variant.dueAt < now;
      return {
        slug: variant.slug,
        title: variant.title,
        category: variant.category,
        description: variant.description,
        language: variant.language,
        languages: group.map((c) => c.language).sort(),
        passingScore: variant.passingScore,
        questionCount: parseQuestions(variant.questions).length,
        lessonCount: lessons.length,
        lessonsDone,
        progressPct,
        completed: passed,
        bestScore: passed ? bestScore : null,
        dueAt: variant.dueAt,
        overdue,
        order: variant.order,
      };
    });
    return cards.sort((a, b) => a.order - b.order);
  }

  // ── PORTAL: course detail (curriculum + quiz, no answer key) ───────────────
  async getCourseForAgent(agentId: string, slug: string) {
    const { branchCode, states } = await this.resolveAudience(agentId);
    const course = (await this.prisma.course.findUnique({
      where: { slug },
      include: { sections: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } } },
    })) as unknown as CourseWithCurriculum | null;
    if (!course || course.status !== 'PUBLISHED' || !this.matches(course, branchCode, states)) {
      throw new NotFoundException('Course not found or not assigned to you');
    }

    const progress = await this.prisma.lessonProgress.findMany({ where: { agentId } });
    const doneLessons = new Set(progress.map((p) => p.lessonId));

    // Sibling language variants (for the language switcher).
    let siblings: { slug: string; language: string }[] = [];
    if (course.translationGroup) {
      const group = await this.prisma.course.findMany({
        where: { translationGroup: course.translationGroup, status: 'PUBLISHED' },
        select: { slug: true, language: true },
      });
      siblings = group;
    }

    const sections = course.sections.map((s) => ({
      id: s.id,
      title: s.title,
      lessons: s.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        contentHtml: l.contentHtml,
        videoUrl: l.videoUrl,
        durationMinutes: l.durationMinutes,
        completed: doneLessons.has(l.id),
      })),
    }));
    const allLessons = course.sections.flatMap((s) => s.lessons);
    const lessonsDone = allLessons.filter((l) => doneLessons.has(l.id)).length;

    const questions = parseQuestions(course.questions).map((q, i) => ({ i, q: q.q, options: q.options }));
    const last = await this.prisma.courseCompletion.findFirst({
      where: { agentId, courseId: course.id },
      orderBy: { completedAt: 'desc' },
    });

    return {
      slug: course.slug,
      title: course.title,
      category: course.category,
      description: course.description,
      contentHtml: course.contentHtml,
      language: course.language,
      languages: siblings,
      passingScore: course.passingScore,
      requireLessons: course.requireLessons,
      dueAt: course.dueAt,
      sections,
      lessonCount: allLessons.length,
      lessonsDone,
      questions,
      lastAttempt: last ? { score: last.score, passed: last.passed, completedAt: last.completedAt } : null,
      certificateAvailable: !!last?.passed,
    };
  }

  // Verify a lesson belongs to a published, assigned course before recording.
  private async assertLessonAccess(agentId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { section: { include: { course: true } } },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    const course = lesson.section.course;
    const { branchCode, states } = await this.resolveAudience(agentId);
    if (course.status !== 'PUBLISHED' || !this.matches(course, branchCode, states)) {
      throw new NotFoundException('Lesson not available to you');
    }
    return { lesson, course };
  }

  async markLessonComplete(agentId: string, lessonId: string) {
    await this.assertLessonAccess(agentId, lessonId);
    await this.prisma.lessonProgress.upsert({
      where: { lessonId_agentId: { lessonId, agentId } },
      create: { lessonId, agentId },
      update: {},
    });
    return { ok: true };
  }

  // ── PORTAL: quiz ───────────────────────────────────────────────────────────
  async submitQuiz(agentId: string, slug: string, answers: number[], meta: { ip?: string; userAgent?: string }) {
    const { branchCode, states } = await this.resolveAudience(agentId);
    const course = (await this.prisma.course.findUnique({
      where: { slug },
      include: { sections: { include: { lessons: { select: { id: true } } } } },
    })) as any;
    if (!course || course.status !== 'PUBLISHED' || !this.matches(course, branchCode, states)) {
      throw new NotFoundException('Course not found or not assigned to you');
    }
    const questions = parseQuestions(course.questions);
    if (questions.length === 0) throw new BadRequestException('This course has no quiz questions');
    if (!Array.isArray(answers) || answers.length !== questions.length) {
      throw new BadRequestException('Please answer every question');
    }

    if (course.requireLessons) {
      const lessonIds: string[] = course.sections.flatMap((s: any) => s.lessons.map((l: any) => l.id));
      if (lessonIds.length > 0) {
        const done = await this.prisma.lessonProgress.count({ where: { agentId, lessonId: { in: lessonIds } } });
        if (done < lessonIds.length) {
          throw new BadRequestException('Please complete every lesson before taking the quiz');
        }
      }
    }

    let correct = 0;
    questions.forEach((q, i) => { if (answers[i] === q.answer) correct++; });
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= course.passingScore;
    const prior = await this.prisma.courseCompletion.count({ where: { agentId, courseId: course.id } });

    const completion = await this.prisma.courseCompletion.create({
      data: {
        courseId: course.id, agentId, branchCode,
        agentState: states.join(',') || null,
        score, passed, answers: JSON.stringify(answers), attempt: prior + 1,
      },
    });
    await this.audit.log({
      action: 'training.quiz.submit', agentId, entity: 'Course', entityId: course.id,
      after: { score, passed, attempt: prior + 1 }, ip: meta.ip, userAgent: meta.userAgent,
    });

    return {
      score, passed, passingScore: course.passingScore, correct, total: questions.length,
      results: questions.map((q, i) => ({ i, correct: answers[i] === q.answer })),
      certificateAvailable: passed,
      completionId: completion.id,
    };
  }

  // ── PORTAL: certificate ────────────────────────────────────────────────────
  async getCertificate(agentId: string, slug: string): Promise<{ pdf: Buffer; filename: string }> {
    const { branchCode, states } = await this.resolveAudience(agentId);
    const course = await this.prisma.course.findUnique({ where: { slug } });
    if (!course || !this.matches(course, branchCode, states)) throw new NotFoundException('Course not found');
    const completion = await this.prisma.courseCompletion.findFirst({
      where: { agentId, courseId: course.id, passed: true },
      orderBy: { score: 'desc' },
    });
    if (!completion) throw new BadRequestException('You have not passed this course yet');
    const agent = await this.prisma.agentUser.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Account not found');

    const pdf = await buildCertificatePdf({
      learnerName: `${agent.firstName} ${agent.lastName}`,
      courseTitle: course.title,
      category: course.category,
      score: completion.score,
      completedAt: completion.completedAt,
      branchCode: completion.branchCode,
      certificateId: completion.id.slice(-10).toUpperCase(),
    });
    return { pdf, filename: `certificate-${course.slug}.pdf` };
  }

  // ── PORTAL: language preference ────────────────────────────────────────────
  async setLanguage(agentId: string, language: string) {
    const lang = (language || 'en').slice(0, 8);
    await this.prisma.agentUser.update({ where: { id: agentId }, data: { preferredLanguage: lang } });
    return { ok: true, language: lang };
  }

  // ── PORTAL: resources ─────────────────────────────────────────────────────
  async listResourcesForAgent(agentId: string) {
    const { branchCode, states } = await this.resolveAudience(agentId);
    const resources = await this.prisma.resource.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    const assigned = resources.filter((r) => this.matches(r, branchCode, states));
    const acks = await this.prisma.resourceAck.findMany({
      where: { agentId, resourceId: { in: assigned.map((r) => r.id) } },
    });
    const ackedIds = new Set(acks.map((a) => a.resourceId));
    return assigned.map((r) => ({
      id: r.id, title: r.title, category: r.category, description: r.description, url: r.url,
      acknowledged: ackedIds.has(r.id),
    }));
  }

  async acknowledgeResource(agentId: string, resourceId: string, meta: { ip?: string; userAgent?: string }) {
    const { branchCode, states } = await this.resolveAudience(agentId);
    const resource = await this.prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource || resource.status !== 'PUBLISHED' || !this.matches(resource, branchCode, states)) {
      throw new NotFoundException('Resource not found or not assigned to you');
    }
    const ack = await this.prisma.resourceAck.upsert({
      where: { resourceId_agentId: { resourceId, agentId } },
      create: { resourceId, agentId, branchCode },
      update: {},
    });
    await this.audit.log({
      action: 'training.resource.ack', agentId, entity: 'Resource', entityId: resourceId,
      ip: meta.ip, userAgent: meta.userAgent,
    });
    return { acknowledged: true, acknowledgedAt: ack.acknowledgedAt };
  }

  // ── ADMIN: courses ──────────────────────────────────────────────────────────
  async adminListCourses() {
    const courses = await this.prisma.course.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: { sections: { include: { lessons: { select: { id: true } } } } },
    });
    const counts = await this.prisma.courseCompletion.groupBy({
      by: ['courseId'], where: { passed: true }, _count: { _all: true },
    });
    const passedByCourse = new Map(counts.map((c) => [c.courseId, c._count._all]));
    return courses.map((c) => ({
      id: c.id, slug: c.slug, title: c.title, category: c.category, description: c.description,
      status: c.status, audience: c.audience, targetStates: c.targetStates, targetBranches: c.targetBranches,
      order: c.order, language: c.language, translationGroup: c.translationGroup, dueAt: c.dueAt,
      passingScore: c.passingScore,
      questionCount: parseQuestions(c.questions).length,
      sectionCount: c.sections.length,
      lessonCount: c.sections.reduce((n, s) => n + s.lessons.length, 0),
      passedCount: passedByCourse.get(c.id) ?? 0,
    }));
  }

  async adminGetCourse(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: { sections: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } } },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  private slugify(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  }

  private validateCoursePayload(dto: any) {
    if (dto.questions !== undefined) {
      const qs = typeof dto.questions === 'string' ? parseQuestions(dto.questions) : dto.questions;
      if (!Array.isArray(qs)) throw new BadRequestException('Questions must be an array');
      qs.forEach((q: any, i: number) => {
        if (!q || typeof q.q !== 'string' || !Array.isArray(q.options) || q.options.length < 2) {
          throw new BadRequestException(`Question ${i + 1} needs text and at least two options`);
        }
        if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= q.options.length) {
          throw new BadRequestException(`Question ${i + 1} has an invalid correct-answer index`);
        }
      });
    }
  }

  private parseDueAt(v: unknown): Date | null | undefined {
    if (v === undefined) return undefined;
    if (v === null || v === '') return null;
    const d = new Date(v as string);
    if (isNaN(d.getTime())) throw new BadRequestException('Invalid due date');
    return d;
  }

  async adminCreateCourse(dto: any, adminId: string) {
    this.validateCoursePayload(dto);
    let slug = dto.slug ? this.slugify(dto.slug) : this.slugify(dto.title);
    if (!slug) throw new BadRequestException('A title is required');
    const clash = await this.prisma.course.findUnique({ where: { slug } });
    if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    const course = await this.prisma.course.create({
      data: {
        slug,
        title: dto.title,
        category: dto.category || 'General',
        description: dto.description ?? null,
        contentHtml: sanitizeLessonHtml(dto.contentHtml ?? ''),
        questions: typeof dto.questions === 'string' ? dto.questions : JSON.stringify(dto.questions ?? []),
        passingScore: dto.passingScore ?? 80,
        audience: dto.audience || 'ALL',
        targetStates: dto.targetStates ?? null,
        targetBranches: dto.targetBranches ?? null,
        status: dto.status || 'DRAFT',
        order: dto.order ?? 0,
        language: dto.language || 'en',
        translationGroup: dto.translationGroup || null,
        dueAt: this.parseDueAt(dto.dueAt) ?? null,
        requireLessons: !!dto.requireLessons,
      },
    });
    await this.audit.log({ action: 'training.course.create', adminId, entity: 'Course', entityId: course.id, after: { title: course.title } });
    return course;
  }

  async adminUpdateCourse(id: string, dto: any, adminId: string) {
    const existing = await this.prisma.course.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Course not found');
    this.validateCoursePayload(dto);
    const data: any = {};
    for (const k of ['title', 'category', 'description', 'passingScore', 'audience', 'targetStates', 'targetBranches', 'status', 'order', 'language', 'translationGroup'] as const) {
      if (dto[k] !== undefined) data[k] = dto[k];
    }
    if (dto.contentHtml !== undefined) data.contentHtml = sanitizeLessonHtml(dto.contentHtml);
    if (dto.requireLessons !== undefined) data.requireLessons = !!dto.requireLessons;
    const due = this.parseDueAt(dto.dueAt);
    if (due !== undefined) data.dueAt = due;
    if (dto.questions !== undefined) {
      data.questions = typeof dto.questions === 'string' ? dto.questions : JSON.stringify(dto.questions);
    }
    if (dto.slug !== undefined) {
      const slug = this.slugify(dto.slug);
      const clash = await this.prisma.course.findUnique({ where: { slug } });
      if (clash && clash.id !== id) throw new BadRequestException('That slug is already in use');
      data.slug = slug;
    }
    const course = await this.prisma.course.update({ where: { id }, data });
    await this.audit.log({ action: 'training.course.update', adminId, entity: 'Course', entityId: id, after: data });
    return course;
  }

  async adminDeleteCourse(id: string, adminId: string) {
    const existing = await this.prisma.course.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Course not found');
    await this.prisma.course.delete({ where: { id } });
    await this.audit.log({ action: 'training.course.delete', adminId, entity: 'Course', entityId: id, before: { title: existing.title } });
    return { deleted: true };
  }

  // ── ADMIN: sections ─────────────────────────────────────────────────────────
  async adminCreateSection(courseId: string, dto: any, adminId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    if (!dto.title?.trim()) throw new BadRequestException('Section title is required');
    const section = await this.prisma.courseSection.create({
      data: { courseId, title: dto.title.trim(), order: dto.order ?? 0 },
    });
    await this.audit.log({ action: 'training.section.create', adminId, entity: 'CourseSection', entityId: section.id });
    return section;
  }

  async adminUpdateSection(id: string, dto: any, adminId: string) {
    const existing = await this.prisma.courseSection.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Section not found');
    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.order !== undefined) data.order = dto.order;
    const section = await this.prisma.courseSection.update({ where: { id }, data });
    await this.audit.log({ action: 'training.section.update', adminId, entity: 'CourseSection', entityId: id });
    return section;
  }

  async adminDeleteSection(id: string, adminId: string) {
    const existing = await this.prisma.courseSection.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Section not found');
    await this.prisma.courseSection.delete({ where: { id } });
    await this.audit.log({ action: 'training.section.delete', adminId, entity: 'CourseSection', entityId: id });
    return { deleted: true };
  }

  // ── ADMIN: lessons ──────────────────────────────────────────────────────────
  async adminCreateLesson(sectionId: string, dto: any, adminId: string) {
    const section = await this.prisma.courseSection.findUnique({ where: { id: sectionId } });
    if (!section) throw new NotFoundException('Section not found');
    if (!dto.title?.trim()) throw new BadRequestException('Lesson title is required');
    const lesson = await this.prisma.lesson.create({
      data: {
        sectionId,
        title: dto.title.trim(),
        order: dto.order ?? 0,
        contentHtml: sanitizeLessonHtml(dto.contentHtml ?? ''),
        videoUrl: normalizeVideoUrl(dto.videoUrl),
        durationMinutes: dto.durationMinutes ?? null,
      },
    });
    await this.audit.log({ action: 'training.lesson.create', adminId, entity: 'Lesson', entityId: lesson.id });
    return lesson;
  }

  async adminUpdateLesson(id: string, dto: any, adminId: string) {
    const existing = await this.prisma.lesson.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Lesson not found');
    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.order !== undefined) data.order = dto.order;
    if (dto.contentHtml !== undefined) data.contentHtml = sanitizeLessonHtml(dto.contentHtml);
    if (dto.videoUrl !== undefined) data.videoUrl = normalizeVideoUrl(dto.videoUrl);
    if (dto.durationMinutes !== undefined) data.durationMinutes = dto.durationMinutes;
    const lesson = await this.prisma.lesson.update({ where: { id }, data });
    await this.audit.log({ action: 'training.lesson.update', adminId, entity: 'Lesson', entityId: id });
    return lesson;
  }

  async adminDeleteLesson(id: string, adminId: string) {
    const existing = await this.prisma.lesson.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Lesson not found');
    await this.prisma.lesson.delete({ where: { id } });
    await this.audit.log({ action: 'training.lesson.delete', adminId, entity: 'Lesson', entityId: id });
    return { deleted: true };
  }

  // ── ADMIN: resources ──────────────────────────────────────────────────────
  async adminListResources() {
    return this.prisma.resource.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
  }

  async adminCreateResource(dto: any, adminId: string) {
    if (!dto.title || !dto.url) throw new BadRequestException('Title and URL are required');
    const resource = await this.prisma.resource.create({
      data: {
        title: dto.title, category: dto.category || 'General', description: dto.description ?? null,
        url: dto.url, audience: dto.audience || 'ALL', targetStates: dto.targetStates ?? null,
        targetBranches: dto.targetBranches ?? null, status: dto.status || 'DRAFT', order: dto.order ?? 0,
      },
    });
    await this.audit.log({ action: 'training.resource.create', adminId, entity: 'Resource', entityId: resource.id, after: { title: resource.title } });
    return resource;
  }

  async adminUpdateResource(id: string, dto: any, adminId: string) {
    const existing = await this.prisma.resource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Resource not found');
    const data: any = {};
    for (const k of ['title', 'category', 'description', 'url', 'audience', 'targetStates', 'targetBranches', 'status', 'order'] as const) {
      if (dto[k] !== undefined) data[k] = dto[k];
    }
    const resource = await this.prisma.resource.update({ where: { id }, data });
    await this.audit.log({ action: 'training.resource.update', adminId, entity: 'Resource', entityId: id, after: data });
    return resource;
  }

  async adminDeleteResource(id: string, adminId: string) {
    const existing = await this.prisma.resource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Resource not found');
    await this.prisma.resource.delete({ where: { id } });
    await this.audit.log({ action: 'training.resource.delete', adminId, entity: 'Resource', entityId: id, before: { title: existing.title } });
    return { deleted: true };
  }

  async adminCategories() {
    const [courseCats, resourceCats] = await Promise.all([
      this.prisma.course.findMany({ select: { category: true }, distinct: ['category'] }),
      this.prisma.resource.findMany({ select: { category: true }, distinct: ['category'] }),
    ]);
    const set = new Set<string>();
    courseCats.forEach((c) => c.category && set.add(c.category));
    resourceCats.forEach((c) => c.category && set.add(c.category));
    return Array.from(set).sort();
  }

  // ── ADMIN: reporting / score tracking ────────────────────────────────────
  async adminCompletions(filter: { state?: string; branchCode?: string; courseId?: string; passedOnly?: boolean }) {
    const where: any = {};
    if (filter.branchCode) where.branchCode = filter.branchCode;
    if (filter.courseId) where.courseId = filter.courseId;
    if (filter.passedOnly) where.passed = true;
    if (filter.state) where.agentState = { contains: filter.state.toUpperCase() };
    const rows = await this.prisma.courseCompletion.findMany({
      where, orderBy: { completedAt: 'desc' }, take: 1000,
      include: {
        course: { select: { title: true, slug: true, category: true, passingScore: true } },
        agent: { select: { firstName: true, lastName: true, email: true, role: true, branchCode: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id, completedAt: r.completedAt, score: r.score, passed: r.passed, attempt: r.attempt,
      branchCode: r.branchCode, agentState: r.agentState, course: r.course, agent: r.agent,
    }));
  }

  async adminReportSummary() {
    const courses = await this.prisma.course.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, title: true, slug: true, category: true, dueAt: true },
      orderBy: { order: 'asc' },
    });
    const completions = await this.prisma.courseCompletion.findMany({
      where: { passed: true },
      select: { courseId: true, agentId: true, branchCode: true, agentState: true },
    });
    const byCourse = new Map<string, Set<string>>();
    const byState = new Map<string, Set<string>>();
    const byBranch = new Map<string, Set<string>>();
    for (const c of completions) {
      if (!byCourse.has(c.courseId)) byCourse.set(c.courseId, new Set());
      byCourse.get(c.courseId)!.add(c.agentId);
      for (const st of CSV(c.agentState)) {
        if (!byState.has(st)) byState.set(st, new Set());
        byState.get(st)!.add(`${c.courseId}:${c.agentId}`);
      }
      if (c.branchCode) {
        if (!byBranch.has(c.branchCode)) byBranch.set(c.branchCode, new Set());
        byBranch.get(c.branchCode)!.add(`${c.courseId}:${c.agentId}`);
      }
    }
    const now = new Date();
    return {
      courses: courses.map((c) => ({
        id: c.id, title: c.title, slug: c.slug, category: c.category,
        dueAt: c.dueAt, overdue: !!c.dueAt && c.dueAt < now,
        passedLearners: byCourse.get(c.id)?.size ?? 0,
      })),
      byState: Array.from(byState.entries()).map(([state, set]) => ({ state, completions: set.size })).sort((a, b) => a.state.localeCompare(b.state)),
      byBranch: Array.from(byBranch.entries()).map(([branchCode, set]) => ({ branchCode, completions: set.size })).sort((a, b) => b.completions - a.completions),
    };
  }
}
