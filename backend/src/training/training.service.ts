import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { sanitizeLessonHtml } from './sanitize';

// A quiz question as stored on the course.
interface Question {
  q: string;
  options: string[];
  answer: number; // index of the correct option
}

const CSV = (v?: string | null): string[] =>
  (v ?? '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

const parseQuestions = (json: string): Question[] => {
  try {
    const parsed = JSON.parse(json || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

@Injectable()
export class TrainingService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  // ── Audience resolution ─────────────────────────────────────────────────
  // An agent's branch is on their AgentUser.branchCode; the states the branch
  // operates in live on the matching AgentDDFile.states (CSV). We resolve both
  // so we can decide which courses/resources are assigned to this user.
  private async resolveAudience(agentId: string): Promise<{ branchCode: string | null; states: string[] }> {
    const user = await this.prisma.agentUser.findUnique({
      where: { id: agentId },
      select: { branchCode: true },
    });
    const branchCode = user?.branchCode ?? null;
    let states: string[] = [];
    if (branchCode) {
      const file = await this.prisma.agentDDFile.findUnique({
        where: { branchCode },
        select: { states: true },
      });
      states = CSV(file?.states);
    }
    return { branchCode, states };
  }

  // Decide whether a targeted item applies to a given user.
  private matches(
    item: { audience: string; targetStates: string | null; targetBranches: string | null },
    branchCode: string | null,
    states: string[],
  ): boolean {
    if (item.audience === 'ALL') return true;
    if (item.audience === 'STATE') {
      const targets = CSV(item.targetStates);
      return targets.some((s) => states.includes(s));
    }
    if (item.audience === 'AGENT') {
      const targets = CSV(item.targetBranches);
      return !!branchCode && targets.includes(branchCode.toUpperCase());
    }
    return false;
  }

  // ── PORTAL: courses ──────────────────────────────────────────────────────
  async listCoursesForAgent(agentId: string) {
    const { branchCode, states } = await this.resolveAudience(agentId);
    const courses = await this.prisma.course.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    const assigned = courses.filter((c) => this.matches(c, branchCode, states));

    // Latest passing completion per course for this agent.
    const completions = await this.prisma.courseCompletion.findMany({
      where: { agentId, courseId: { in: assigned.map((c) => c.id) } },
      orderBy: { completedAt: 'desc' },
    });
    const bestByCourse = new Map<string, { score: number; passed: boolean; completedAt: Date }>();
    for (const c of completions) {
      const cur = bestByCourse.get(c.courseId);
      if (!cur || (c.passed && !cur.passed) || (c.passed === cur.passed && c.score > cur.score)) {
        bestByCourse.set(c.courseId, { score: c.score, passed: c.passed, completedAt: c.completedAt });
      }
    }

    return assigned.map((c) => {
      const best = bestByCourse.get(c.id);
      const questions = parseQuestions(c.questions);
      return {
        id: c.id,
        slug: c.slug,
        title: c.title,
        category: c.category,
        description: c.description,
        passingScore: c.passingScore,
        questionCount: questions.length,
        completed: best?.passed ?? false,
        bestScore: best?.score ?? null,
        completedAt: best?.passed ? best.completedAt : null,
      };
    });
  }

  // Course detail with quiz, WITHOUT exposing the answer key.
  async getCourseForAgent(agentId: string, slug: string) {
    const { branchCode, states } = await this.resolveAudience(agentId);
    const course = await this.prisma.course.findUnique({ where: { slug } });
    if (!course || course.status !== 'PUBLISHED' || !this.matches(course, branchCode, states)) {
      throw new NotFoundException('Course not found or not assigned to you');
    }
    const questions = parseQuestions(course.questions).map((q, i) => ({
      i,
      q: q.q,
      options: q.options,
    }));
    const last = await this.prisma.courseCompletion.findFirst({
      where: { agentId, courseId: course.id },
      orderBy: { completedAt: 'desc' },
    });
    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      category: course.category,
      description: course.description,
      contentHtml: course.contentHtml,
      passingScore: course.passingScore,
      questions,
      lastAttempt: last ? { score: last.score, passed: last.passed, completedAt: last.completedAt } : null,
    };
  }

  // Grade a quiz submission and record an (append-only) completion.
  async submitQuiz(agentId: string, slug: string, answers: number[], meta: { ip?: string; userAgent?: string }) {
    const { branchCode, states } = await this.resolveAudience(agentId);
    const course = await this.prisma.course.findUnique({ where: { slug } });
    if (!course || course.status !== 'PUBLISHED' || !this.matches(course, branchCode, states)) {
      throw new NotFoundException('Course not found or not assigned to you');
    }
    const questions = parseQuestions(course.questions);
    if (questions.length === 0) throw new BadRequestException('This course has no quiz questions');
    if (!Array.isArray(answers) || answers.length !== questions.length) {
      throw new BadRequestException('Please answer every question');
    }

    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.answer) correct++;
    });
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= course.passingScore;

    const prior = await this.prisma.courseCompletion.count({ where: { agentId, courseId: course.id } });

    const completion = await this.prisma.courseCompletion.create({
      data: {
        courseId: course.id,
        agentId,
        branchCode,
        agentState: states.join(',') || null,
        score,
        passed,
        answers: JSON.stringify(answers),
        attempt: prior + 1,
      },
    });

    await this.audit.log({
      action: 'training.quiz.submit',
      agentId,
      entity: 'Course',
      entityId: course.id,
      after: { score, passed, attempt: prior + 1 },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return {
      score,
      passed,
      passingScore: course.passingScore,
      correct,
      total: questions.length,
      // Per-question correctness so the learner sees what to review.
      results: questions.map((q, i) => ({ i, correct: answers[i] === q.answer })),
      completionId: completion.id,
    };
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
      id: r.id,
      title: r.title,
      category: r.category,
      description: r.description,
      url: r.url,
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
      action: 'training.resource.ack',
      agentId,
      entity: 'Resource',
      entityId: resourceId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { acknowledged: true, acknowledgedAt: ack.acknowledgedAt };
  }

  // ── ADMIN: course management ────────────────────────────────────────────
  async adminListCourses() {
    const courses = await this.prisma.course.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    const counts = await this.prisma.courseCompletion.groupBy({
      by: ['courseId'],
      where: { passed: true },
      _count: { _all: true },
    });
    const passedByCourse = new Map(counts.map((c) => [c.courseId, c._count._all]));
    return courses.map((c) => ({
      ...c,
      questionCount: parseQuestions(c.questions).length,
      passedCount: passedByCourse.get(c.id) ?? 0,
    }));
  }

  async adminGetCourse(id: string) {
    const course = await this.prisma.course.findUnique({ where: { id } });
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
    for (const k of ['title', 'category', 'description', 'passingScore', 'audience', 'targetStates', 'targetBranches', 'status', 'order'] as const) {
      if (dto[k] !== undefined) data[k] = dto[k];
    }
    if (dto.contentHtml !== undefined) data.contentHtml = sanitizeLessonHtml(dto.contentHtml);
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

  // ── ADMIN: resource management ──────────────────────────────────────────
  async adminListResources() {
    return this.prisma.resource.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
  }

  async adminCreateResource(dto: any, adminId: string) {
    if (!dto.title || !dto.url) throw new BadRequestException('Title and URL are required');
    const resource = await this.prisma.resource.create({
      data: {
        title: dto.title,
        category: dto.category || 'General',
        description: dto.description ?? null,
        url: dto.url,
        audience: dto.audience || 'ALL',
        targetStates: dto.targetStates ?? null,
        targetBranches: dto.targetBranches ?? null,
        status: dto.status || 'DRAFT',
        order: dto.order ?? 0,
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

  // ── ADMIN: distinct categories (for the management UI dropdowns) ──────────
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

  // ── ADMIN: score tracking / reporting ────────────────────────────────────
  // Filterable: all, by state, or by branch (agent). Returns each completion
  // with the learner and course so compliance can prove who was trained.
  async adminCompletions(filter: { state?: string; branchCode?: string; courseId?: string; passedOnly?: boolean }) {
    const where: any = {};
    if (filter.branchCode) where.branchCode = filter.branchCode;
    if (filter.courseId) where.courseId = filter.courseId;
    if (filter.passedOnly) where.passed = true;
    if (filter.state) {
      // agentState is a CSV snapshot; match the state token loosely.
      where.agentState = { contains: filter.state.toUpperCase() };
    }
    const rows = await this.prisma.courseCompletion.findMany({
      where,
      orderBy: { completedAt: 'desc' },
      take: 1000,
      include: {
        course: { select: { title: true, slug: true, category: true, passingScore: true } },
        agent: { select: { firstName: true, lastName: true, email: true, role: true, branchCode: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      completedAt: r.completedAt,
      score: r.score,
      passed: r.passed,
      attempt: r.attempt,
      branchCode: r.branchCode,
      agentState: r.agentState,
      course: r.course,
      agent: r.agent,
    }));
  }

  // Aggregate report: per-course pass counts, by-state and by-branch breakdowns.
  async adminReportSummary() {
    const courses = await this.prisma.course.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, title: true, slug: true, category: true },
      orderBy: { order: 'asc' },
    });
    const completions = await this.prisma.courseCompletion.findMany({
      where: { passed: true },
      select: { courseId: true, agentId: true, branchCode: true, agentState: true },
    });
    // Unique passing learners per course (latest attempt already implies pass).
    const byCourse = new Map<string, Set<string>>();
    const byState = new Map<string, Set<string>>();
    const byBranch = new Map<string, Set<string>>();
    for (const c of completions) {
      if (!byCourse.has(c.courseId)) byCourse.set(c.courseId, new Set());
      byCourse.get(c.courseId)!.add(c.agentId);
      for (const st of CSV(c.agentState)) {
        const key = `${st}`;
        if (!byState.has(key)) byState.set(key, new Set());
        byState.get(key)!.add(`${c.courseId}:${c.agentId}`);
      }
      if (c.branchCode) {
        if (!byBranch.has(c.branchCode)) byBranch.set(c.branchCode, new Set());
        byBranch.get(c.branchCode)!.add(`${c.courseId}:${c.agentId}`);
      }
    }
    return {
      courses: courses.map((c) => ({ ...c, passedLearners: byCourse.get(c.id)?.size ?? 0 })),
      byState: Array.from(byState.entries()).map(([state, set]) => ({ state, completions: set.size })).sort((a, b) => a.state.localeCompare(b.state)),
      byBranch: Array.from(byBranch.entries()).map(([branchCode, set]) => ({ branchCode, completions: set.size })).sort((a, b) => b.completions - a.completions),
    };
  }
}
