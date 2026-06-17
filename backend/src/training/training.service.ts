import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { sanitizeLessonHtml, safeHttpUrl } from './sanitize';
import { RegionalService } from '../regional/regional.service';
import { normalizeVideoUrl } from './video.util';
import { buildCertificatePdf, DEFAULT_CERT_LAYOUT, type CertLayout } from './certificate';
import { buildEvidencePacketPdf } from './evidence';

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
  requireAck: boolean; policyStatement: string | null;
  sections: { id: string; title: string; order: number; lessons: {
    id: string; title: string; order: number; contentHtml: string; videoUrl: string | null; durationMinutes: number | null;
  }[] }[];
};

@Injectable()
export class TrainingService {
  constructor(private prisma: PrismaService, private audit: AuditService, private regional: RegionalService) {}

  // Branch codes a regional officer may see (null = unrestricted full admin).
  private async scopedBranchCodes(adminId?: string, role?: string): Promise<string[] | null> {
    if (!adminId) return null;
    const scope = await this.regional.scopeForAdmin(adminId, role);
    if (!scope) return null;
    if (!scope.officeId) return [];
    const files = await this.prisma.agentDDFile.findMany({
      where: { regionalOfficeId: scope.officeId },
      select: { branchCode: true },
    });
    return files.map((f) => f.branchCode).filter(Boolean) as string[];
  }

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

  // ── Phase 3: assignment access (additive on audience) ──────────────────────
  // Map of courseId -> the most specific active assignment for this agent
  // (agent-specific beats branch; earlier deadline wins among equals).
  private async assignmentsForAgent(agentId: string, branchCode: string | null) {
    // Branch targets are stored upper-cased; normalise the agent's branch to match.
    const bc = branchCode ? branchCode.toUpperCase() : null;
    const rows = await this.prisma.trainingAssignment.findMany({
      where: { active: true, OR: [{ agentId }, ...(bc ? [{ branchCode: bc }] : [])] },
    });
    const byCourse = new Map<string, (typeof rows)[number]>();
    const specificity = (a: (typeof rows)[number]) => (a.agentId ? 2 : 1);
    for (const a of rows) {
      const cur = byCourse.get(a.courseId);
      if (!cur) { byCourse.set(a.courseId, a); continue; }
      if (specificity(a) > specificity(cur)) byCourse.set(a.courseId, a);
      else if (specificity(a) === specificity(cur) && a.dueAt && (!cur.dueAt || a.dueAt < cur.dueAt)) {
        byCourse.set(a.courseId, a);
      }
    }
    return byCourse;
  }

  private async hasActiveAssignment(agentId: string, courseId: string, branchCode: string | null): Promise<boolean> {
    const bc = branchCode ? branchCode.toUpperCase() : null;
    const a = await this.prisma.trainingAssignment.findFirst({
      where: { courseId, active: true, OR: [{ agentId }, ...(bc ? [{ branchCode: bc }] : [])] },
      select: { id: true },
    });
    return !!a;
  }

  // A course is accessible to an agent if the audience matches OR it is
  // explicitly assigned to them or their branch.
  private async agentCanAccess(
    agentId: string,
    course: { id: string; audience: string; targetStates: string | null; targetBranches: string | null },
    branchCode: string | null,
    states: string[],
  ): Promise<boolean> {
    if (this.matches(course, branchCode, states)) return true;
    return this.hasActiveAssignment(agentId, course.id, branchCode);
  }

  // ── PORTAL: course catalogue ──────────────────────────────────────────────
  async listCoursesForAgent(agentId: string) {
    const { branchCode, states, language } = await this.resolveAudience(agentId);
    const courses = (await this.prisma.course.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: { sections: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } } },
    })) as unknown as CourseWithCurriculum[];

    // Phase 3: explicit assignments (additive). A course is shown if the
    // audience matches OR an active assignment targets the agent or branch.
    const assignmentByCourse = await this.assignmentsForAgent(agentId, branchCode);
    // Phase 5: approved, unexpired exceptions (waive or extend the deadline).
    const exceptionByCourse = await this.activeExceptionsForAgent(agentId, branchCode);
    const shown = courses.filter((c) => this.matches(c, branchCode, states) || assignmentByCourse.has(c.id));
    const shownIds = shown.map((c) => c.id);

    const [completions, progress] = await Promise.all([
      this.prisma.courseCompletion.findMany({ where: { agentId, courseId: { in: shownIds } } }),
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
    for (const c of shown) {
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
      // Explicit assignment (if any) overrides the course deadline and carries the reason.
      const assignment = group.map((c) => assignmentByCourse.get(c.id)).find(Boolean) ?? null;
      // Approved exception (if any): waiver/equivalency excuses; extension moves the deadline.
      const exception = group.map((c) => exceptionByCourse.get(c.id)).find(Boolean) ?? null;
      const excused = !!exception && (exception.type === 'WAIVER' || exception.type === 'EQUIVALENCY');
      const baseDue = assignment?.dueAt ?? variant.dueAt;
      const dueAt = exception?.type === 'EXTENSION' ? exception.expiresAt ?? baseDue : baseDue;
      const overdue = !passed && !excused && !!dueAt && dueAt < now;
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
        dueAt,
        overdue,
        assignedReason: assignment?.reason ?? null,
        excused,
        excusedType: excused ? exception!.type : null,
        order: variant.order,
      };
    });
    return cards.sort((a, b) => a.order - b.order);
  }

  // ── PORTAL: course detail (curriculum + quiz, no answer key) ───────────────
  // ── Phase 2: content versioning (append-only) ──────────────────────────────
  private buildOutline(sections: { title: string; lessons: { title: string }[] }[]) {
    return sections.map((s) => ({ title: s.title, lessons: s.lessons.map((l) => l.title) }));
  }

  private contentHashOf(title: string, contentHtml: string, questions: string, outline: unknown): string {
    return createHash('sha256')
      .update(JSON.stringify({ title, contentHtml, questions, outline }))
      .digest('hex');
  }

  // Returns the current content version, minting a new append-only snapshot when
  // the acknowledgeable content (title/overview/quiz/outline) has changed.
  private async ensureVersion(courseId: string, adminId?: string, note?: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' }, select: { title: true } } },
        },
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    const outline = this.buildOutline(course.sections);
    const hash = this.contentHashOf(course.title, course.contentHtml, course.questions, outline);
    const latest = await this.prisma.courseVersion.findFirst({
      where: { courseId },
      orderBy: { version: 'desc' },
    });
    if (latest && latest.contentHash === hash && !note) return latest;
    if (latest && latest.contentHash === hash && note) return latest; // no content change → don't fork
    const nextNum = (latest?.version ?? 0) + 1;
    try {
      return await this.prisma.courseVersion.create({
        data: {
          courseId,
          version: nextNum,
          title: course.title,
          contentHtml: course.contentHtml,
          questions: course.questions,
          outline: JSON.stringify(outline),
          contentHash: hash,
          note: note ?? null,
          createdBy: adminId ?? null,
        },
      });
    } catch {
      // Concurrent mint raced us to this version number; return the latest.
      const current = await this.prisma.courseVersion.findFirst({
        where: { courseId },
        orderBy: { version: 'desc' },
      });
      if (current) return current;
      throw new Error('Failed to create course version');
    }
  }

  async adminListVersions(courseId: string) {
    const versions = await this.prisma.courseVersion.findMany({
      where: { courseId },
      orderBy: { version: 'desc' },
      select: { id: true, version: true, effectiveAt: true, note: true, createdBy: true, createdAt: true },
    });
    // Mint v1 lazily so the admin always sees at least the current version.
    if (versions.length === 0) {
      const v = await this.ensureVersion(courseId);
      return [{ id: v.id, version: v.version, effectiveAt: v.effectiveAt, note: v.note, createdBy: v.createdBy, createdAt: v.createdAt }];
    }
    return versions;
  }

  // ── ADMIN: assignments (Phase 3) ───────────────────────────────────────────
  private readonly ASSIGN_REASONS = ['NEW_HIRE', 'ANNUAL', 'HAZARD', 'ROLE', 'REMEDIATION', 'OTHER'];

  async adminListAssignments(filter: { courseId?: string; agentId?: string; branchCode?: string; activeOnly?: boolean }) {
    const where: any = {};
    if (filter.courseId) where.courseId = filter.courseId;
    if (filter.agentId) where.agentId = filter.agentId;
    if (filter.branchCode) where.branchCode = filter.branchCode.trim().toUpperCase();
    if (filter.activeOnly) where.active = true;
    const rows = await this.prisma.trainingAssignment.findMany({
      where,
      orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
      include: {
        course: { select: { title: true, slug: true } },
        agent: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      courseId: r.courseId,
      courseTitle: r.course.title,
      courseSlug: r.course.slug,
      agentId: r.agentId,
      agentName: r.agent ? `${r.agent.firstName} ${r.agent.lastName}` : null,
      agentEmail: r.agent?.email ?? null,
      branchCode: r.branchCode,
      reason: r.reason,
      note: r.note,
      dueAt: r.dueAt,
      active: r.active,
      assignedBy: r.assignedBy,
      createdAt: r.createdAt,
    }));
  }

  async adminCreateAssignment(dto: any, adminId: string) {
    if (!dto.courseId) throw new BadRequestException('A course is required');
    if (!dto.agentId && !dto.branchCode) throw new BadRequestException('Specify an agent or a branch code');
    const reason = String(dto.reason || 'OTHER').toUpperCase();
    if (!this.ASSIGN_REASONS.includes(reason)) throw new BadRequestException('Invalid assignment reason');
    const course = await this.prisma.course.findUnique({ where: { id: dto.courseId } });
    if (!course) throw new NotFoundException('Course not found');
    if (dto.agentId) {
      const agent = await this.prisma.agentUser.findUnique({ where: { id: dto.agentId }, select: { id: true } });
      if (!agent) throw new NotFoundException('Agent not found');
    }
    const due = this.parseDueAt(dto.dueAt);
    const assignment = await this.prisma.trainingAssignment.create({
      data: {
        courseId: dto.courseId,
        agentId: dto.agentId || null,
        branchCode: dto.branchCode ? String(dto.branchCode).trim().toUpperCase() : null,
        reason,
        note: dto.note?.trim() || null,
        dueAt: due ?? null,
        assignedBy: adminId,
      },
    });
    await this.audit.log({
      action: 'training.assignment.create', adminId, entity: 'Course', entityId: dto.courseId,
      after: { assignmentId: assignment.id, agentId: assignment.agentId, branchCode: assignment.branchCode, reason, dueAt: assignment.dueAt },
    });
    return assignment;
  }

  async adminUpdateAssignment(id: string, dto: any, adminId: string) {
    const existing = await this.prisma.trainingAssignment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Assignment not found');
    const data: any = {};
    if (dto.reason !== undefined) {
      const r = String(dto.reason).toUpperCase();
      if (!this.ASSIGN_REASONS.includes(r)) throw new BadRequestException('Invalid assignment reason');
      data.reason = r;
    }
    if (dto.note !== undefined) data.note = dto.note?.trim() || null;
    if (dto.active !== undefined) data.active = !!dto.active;
    const due = this.parseDueAt(dto.dueAt);
    if (due !== undefined) data.dueAt = due;
    const assignment = await this.prisma.trainingAssignment.update({ where: { id }, data });
    await this.audit.log({
      action: 'training.assignment.update', adminId, entity: 'Course', entityId: existing.courseId,
      after: { assignmentId: id, ...data },
    });
    return assignment;
  }

  // ── ADMIN: exceptions workflow (Phase 5) ────────────────────────────────────
  private readonly EXCEPTION_TYPES = ['WAIVER', 'EXTENSION', 'EQUIVALENCY'];

  // Active = approved and not expired. WAIVER/EQUIVALENCY excuse the learner;
  // EXTENSION moves the deadline to expiresAt.
  private isExceptionActive(e: { status: string; expiresAt: Date | null }, now: Date): boolean {
    return e.status === 'APPROVED' && (!e.expiresAt || e.expiresAt > now);
  }

  private async activeExceptionsForAgent(agentId: string, branchCode: string | null) {
    const now = new Date();
    // Branch targets are stored upper-cased; normalise the agent's branch to match.
    const bc = branchCode ? branchCode.toUpperCase() : null;
    const rows = await this.prisma.trainingException.findMany({
      where: { status: 'APPROVED', OR: [{ agentId }, ...(bc ? [{ branchCode: bc }] : [])] },
    });
    const byCourse = new Map<string, (typeof rows)[number]>();
    for (const e of rows) {
      if (!this.isExceptionActive(e, now)) continue;
      const cur = byCourse.get(e.courseId);
      // Prefer agent-specific over branch-wide.
      if (!cur || (e.agentId && !cur.agentId)) byCourse.set(e.courseId, e);
    }
    return byCourse;
  }

  async adminListExceptions(filter: { courseId?: string; agentId?: string; status?: string }) {
    const where: any = {};
    if (filter.courseId) where.courseId = filter.courseId;
    if (filter.agentId) where.agentId = filter.agentId;
    if (filter.status) where.status = filter.status.toUpperCase();
    const rows = await this.prisma.trainingException.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        course: { select: { title: true, slug: true } },
        agent: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    const now = new Date();
    return rows.map((r) => ({
      id: r.id,
      courseId: r.courseId,
      courseTitle: r.course.title,
      agentId: r.agentId,
      agentName: r.agent ? `${r.agent.firstName} ${r.agent.lastName}` : null,
      agentEmail: r.agent?.email ?? null,
      branchCode: r.branchCode,
      type: r.type,
      reason: r.reason,
      note: r.note,
      status: r.status,
      expiresAt: r.expiresAt,
      expired: !!r.expiresAt && r.expiresAt < now,
      requestedBy: r.requestedBy,
      decidedBy: r.decidedBy,
      decidedAt: r.decidedAt,
      createdAt: r.createdAt,
    }));
  }

  async adminCreateException(dto: any, userId: string) {
    if (!dto.courseId) throw new BadRequestException('A course is required');
    if (!dto.agentId && !dto.branchCode) throw new BadRequestException('Specify an agent or a branch code');
    const type = String(dto.type || '').toUpperCase();
    if (!this.EXCEPTION_TYPES.includes(type)) throw new BadRequestException('Invalid exception type');
    if (!dto.reason?.trim()) throw new BadRequestException('A reason is required');
    const expiresAt = this.parseDueAt(dto.expiresAt) ?? null;
    if (type === 'EXTENSION' && !expiresAt) throw new BadRequestException('An extension requires a new deadline');
    const course = await this.prisma.course.findUnique({ where: { id: dto.courseId }, select: { id: true } });
    if (!course) throw new NotFoundException('Course not found');
    if (dto.agentId) {
      const agent = await this.prisma.agentUser.findUnique({ where: { id: dto.agentId }, select: { id: true } });
      if (!agent) throw new NotFoundException('Agent not found');
    }
    const exception = await this.prisma.trainingException.create({
      data: {
        courseId: dto.courseId,
        agentId: dto.agentId || null,
        branchCode: dto.branchCode ? String(dto.branchCode).trim().toUpperCase() : null,
        type,
        reason: dto.reason.trim(),
        note: dto.note?.trim() || null,
        expiresAt,
        status: 'PENDING',
        requestedBy: userId,
      },
    });
    await this.audit.log({
      action: 'training.exception.request', adminId: userId, entity: 'Course', entityId: dto.courseId,
      after: { exceptionId: exception.id, type, agentId: exception.agentId, branchCode: exception.branchCode, expiresAt },
    });
    return exception;
  }

  async adminDecideException(id: string, dto: { status: string; note?: string }, userId: string) {
    const existing = await this.prisma.trainingException.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Exception not found');
    const status = String(dto.status || '').toUpperCase();
    if (!['APPROVED', 'REJECTED'].includes(status)) throw new BadRequestException('Decision must be APPROVED or REJECTED');
    const exception = await this.prisma.trainingException.update({
      where: { id },
      data: {
        status,
        decidedBy: userId,
        decidedAt: new Date(),
        ...(dto.note?.trim() ? { note: dto.note.trim() } : {}),
      },
    });
    await this.audit.log({
      action: 'training.exception.decide', adminId: userId, entity: 'Course', entityId: existing.courseId,
      after: { exceptionId: id, status },
    });
    return exception;
  }

  // ── PORTAL: policy acknowledgment ──────────────────────────────────────────
  async acknowledgePolicy(agentId: string, slug: string, meta: { ip?: string; userAgent?: string } = {}) {
    const { branchCode, states } = await this.resolveAudience(agentId);
    const course = await this.prisma.course.findUnique({ where: { slug } });
    if (!course || course.status !== 'PUBLISHED' || !(await this.agentCanAccess(agentId, course, branchCode, states))) {
      throw new NotFoundException('Course not found or not assigned to you');
    }
    const version = await this.ensureVersion(course.id);
    const effective = version.effectiveAt.toISOString().slice(0, 10);
    const statement =
      (course.policyStatement && course.policyStatement.trim()) ||
      `I have reviewed and understood the training and policy content of "${course.title}" (version ${version.version}, effective ${effective}).`;
    const ack = await this.prisma.policyAcknowledgment.upsert({
      where: { agentId_courseVersionId: { agentId, courseVersionId: version.id } },
      create: {
        courseId: course.id,
        courseVersionId: version.id,
        versionNumber: version.version,
        agentId,
        statement,
        branchCode,
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
      update: {},
    });
    await this.audit.log({
      action: 'training.policy.acknowledge', agentId, entity: 'Course', entityId: course.id,
      after: { version: version.version, statement }, ip: meta.ip, userAgent: meta.userAgent,
    });
    return { acknowledged: true, version: version.version, acknowledgedAt: ack.acknowledgedAt, statement };
  }

  async getCourseForAgent(agentId: string, slug: string) {
    const { branchCode, states } = await this.resolveAudience(agentId);
    const course = (await this.prisma.course.findUnique({
      where: { slug },
      include: { sections: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } } },
    })) as unknown as CourseWithCurriculum | null;
    if (!course || course.status !== 'PUBLISHED' || !(await this.agentCanAccess(agentId, course, branchCode, states))) {
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

    // Phase 2: current content version + this agent's acknowledgment of it.
    const version = await this.ensureVersion(course.id);
    const ack = course.requireAck
      ? await this.prisma.policyAcknowledgment.findUnique({
          where: { agentId_courseVersionId: { agentId, courseVersionId: version.id } },
        })
      : null;
    const effective = version.effectiveAt.toISOString().slice(0, 10);
    const defaultStatement = `I have reviewed and understood the training and policy content of "${course.title}" (version ${version.version}, effective ${effective}).`;

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
      // Phase 2 acknowledgment fields
      requireAck: course.requireAck,
      version: version.version,
      versionEffectiveAt: version.effectiveAt,
      policyStatement: (course.policyStatement && course.policyStatement.trim()) || defaultStatement,
      acknowledgedVersion: ack ? version.version : null,
      acknowledgedAt: ack?.acknowledgedAt ?? null,
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
    if (course.status !== 'PUBLISHED' || !(await this.agentCanAccess(agentId, course, branchCode, states))) {
      throw new NotFoundException('Lesson not available to you');
    }
    return { lesson, course };
  }

  async markLessonComplete(agentId: string, lessonId: string, meta: { ip?: string; userAgent?: string } = {}) {
    await this.assertLessonAccess(agentId, lessonId);
    const existing = await this.prisma.lessonProgress.findUnique({
      where: { lessonId_agentId: { lessonId, agentId } },
    });
    await this.prisma.lessonProgress.upsert({
      where: { lessonId_agentId: { lessonId, agentId } },
      create: { lessonId, agentId },
      update: {},
    });
    // Audit only the first completion so the lifecycle log isn't noisy on revisits.
    if (!existing) {
      await this.audit.log({
        action: 'training.lesson.complete', agentId, entity: 'Lesson', entityId: lessonId,
        ip: meta.ip, userAgent: meta.userAgent,
      });
    }
    return { ok: true };
  }

  // ── PORTAL: quiz ───────────────────────────────────────────────────────────
  async submitQuiz(agentId: string, slug: string, answers: number[], meta: { ip?: string; userAgent?: string }) {
    const { branchCode, states } = await this.resolveAudience(agentId);
    const course = (await this.prisma.course.findUnique({
      where: { slug },
      include: { sections: { include: { lessons: { select: { id: true } } } } },
    })) as any;
    if (!course || course.status !== 'PUBLISHED' || !(await this.agentCanAccess(agentId, course, branchCode, states))) {
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

    // Phase 2: gate completion on policy acknowledgment, and stamp the exact
    // content version this attempt was assessed against.
    const version = await this.ensureVersion(course.id);
    if (course.requireAck) {
      const ack = await this.prisma.policyAcknowledgment.findUnique({
        where: { agentId_courseVersionId: { agentId, courseVersionId: version.id } },
      });
      if (!ack) {
        throw new BadRequestException('Please acknowledge the policy statement before completing this course');
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
        courseVersionId: version.id, versionNumber: version.version,
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
  async getCertificate(agentId: string, slug: string, meta: { ip?: string; userAgent?: string } = {}): Promise<{ pdf: Buffer; filename: string }> {
    const { branchCode, states } = await this.resolveAudience(agentId);
    const course = await this.prisma.course.findUnique({ where: { slug } });
    if (!course || !(await this.agentCanAccess(agentId, course, branchCode, states))) throw new NotFoundException('Course not found');
    const completion = await this.prisma.courseCompletion.findFirst({
      where: { agentId, courseId: course.id, passed: true },
      orderBy: { score: 'desc' },
    });
    if (!completion) throw new BadRequestException('You have not passed this course yet');
    const agent = await this.prisma.agentUser.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Account not found');

    const [cfg, logo] = await Promise.all([this.resolveCertConfigForCourse(course.id), this.brandLogoBuffer()]);
    const pdf = await buildCertificatePdf(
      {
        learnerName: `${agent.firstName} ${agent.lastName}`,
        courseTitle: course.title,
        category: course.category,
        description: course.description,
        score: completion.score,
        completedAt: completion.completedAt,
        branchCode: completion.branchCode,
        certificateId: completion.id.slice(-10).toUpperCase(),
      },
      cfg.templateImage ? { image: this.dataUrlToBuffer(cfg.templateImage), layout: cfg.layout } : undefined,
      { logo },
    );
    await this.audit.log({
      action: 'training.certificate.download', agentId, entity: 'Course', entityId: course.id,
      after: { completionId: completion.id, score: completion.score }, ip: meta.ip, userAgent: meta.userAgent,
    });
    return { pdf, filename: `certificate-${course.slug}.pdf` };
  }

  // ── ADMIN/PORTAL: certificate template + field placement ────────────────────
  private dataUrlToBuffer(dataUrl: string): Buffer {
    const comma = dataUrl.indexOf(',');
    return Buffer.from(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl, 'base64');
  }

  async getCertificateConfig(): Promise<{ templateImage: string | null; layout: CertLayout; brandLogo: string | null }> {
    const [imgRow, layoutRow, logoRow] = await Promise.all([
      this.prisma.siteSetting.findUnique({ where: { key: 'cert.templateImage' } }),
      this.prisma.siteSetting.findUnique({ where: { key: 'cert.layout' } }),
      this.prisma.siteSetting.findUnique({ where: { key: 'brand.logo' } }),
    ]);
    const templateImage = imgRow ? (JSON.parse(imgRow.value) as string | null) : null;
    const brandLogo = logoRow ? (JSON.parse(logoRow.value) as string | null) : null;
    const layout = layoutRow
      ? { ...DEFAULT_CERT_LAYOUT, ...(JSON.parse(layoutRow.value) as Partial<CertLayout>) }
      : DEFAULT_CERT_LAYOUT;
    return { templateImage, layout, brandLogo };
  }

  // The company logo (data URL) shared by the built-in certificate and the DD
  // file PDF, as a decoded buffer.
  private async brandLogoBuffer(): Promise<Buffer | undefined> {
    const row = await this.prisma.siteSetting.findUnique({ where: { key: 'brand.logo' } });
    if (!row) return undefined;
    const url = JSON.parse(row.value) as string | null;
    return url ? this.dataUrlToBuffer(url) : undefined;
  }

  async saveCertificateConfig(dto: { templateImage?: string | null; layout?: CertLayout; brandLogo?: string | null }, adminId: string) {
    if (dto.templateImage !== undefined) {
      this.validateTemplateImage(dto.templateImage);
      await this.prisma.siteSetting.upsert({
        where: { key: 'cert.templateImage' },
        update: { value: JSON.stringify(dto.templateImage) },
        create: { key: 'cert.templateImage', value: JSON.stringify(dto.templateImage) },
      });
    }
    if (dto.brandLogo !== undefined) {
      this.validateTemplateImage(dto.brandLogo);
      await this.prisma.siteSetting.upsert({
        where: { key: 'brand.logo' },
        update: { value: JSON.stringify(dto.brandLogo) },
        create: { key: 'brand.logo', value: JSON.stringify(dto.brandLogo) },
      });
    }
    if (dto.layout !== undefined) {
      await this.prisma.siteSetting.upsert({
        where: { key: 'cert.layout' },
        update: { value: JSON.stringify(dto.layout) },
        create: { key: 'cert.layout', value: JSON.stringify(dto.layout) },
      });
    }
    await this.audit.log({
      action: 'training.certificate.config', adminId, entity: 'SiteSetting', entityId: 'cert',
      after: { hasTemplate: dto.templateImage !== undefined ? !!dto.templateImage : undefined, hasLogo: dto.brandLogo !== undefined ? !!dto.brandLogo : undefined, layoutUpdated: dto.layout !== undefined },
    });
    return this.getCertificateConfig();
  }

  // ── Per-course certificate overrides ───────────────────────────────────────
  private courseCertKey(courseId: string) {
    return `cert.course.${courseId}`;
  }

  private validateTemplateImage(img: string | null | undefined) {
    if (img && !/^data:image\/(png|jpe?g);base64,/.test(img)) {
      throw new BadRequestException('Template must be a PNG or JPEG image');
    }
    if (img && img.length > 4_000_000) {
      throw new BadRequestException('Template image is too large (max ~3 MB)');
    }
  }

  // Effective certificate config for a course: its override if one is set,
  // otherwise the global default.
  async resolveCertConfigForCourse(courseId: string): Promise<{ templateImage: string | null; layout: CertLayout }> {
    const row = await this.prisma.siteSetting.findUnique({ where: { key: this.courseCertKey(courseId) } });
    if (row) {
      const o = JSON.parse(row.value) as { templateImage?: string | null; layout?: Partial<CertLayout> } | null;
      if (o) return { templateImage: o.templateImage ?? null, layout: { ...DEFAULT_CERT_LAYOUT, ...(o.layout ?? {}) } };
    }
    return this.getCertificateConfig();
  }

  // For the admin editor: the override if present, else seeded from the global
  // default so admins start from the current look.
  async getCourseCertConfig(courseId: string): Promise<{ hasOverride: boolean; templateImage: string | null; layout: CertLayout }> {
    const row = await this.prisma.siteSetting.findUnique({ where: { key: this.courseCertKey(courseId) } });
    if (row) {
      const o = JSON.parse(row.value) as { templateImage?: string | null; layout?: Partial<CertLayout> } | null;
      if (o) return { hasOverride: true, templateImage: o.templateImage ?? null, layout: { ...DEFAULT_CERT_LAYOUT, ...(o.layout ?? {}) } };
    }
    const g = await this.getCertificateConfig();
    return { hasOverride: false, templateImage: g.templateImage, layout: g.layout };
  }

  async saveCourseCertConfig(courseId: string, dto: { templateImage?: string | null; layout?: CertLayout }, adminId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
    if (!course) throw new NotFoundException('Course not found');
    this.validateTemplateImage(dto.templateImage);
    const value = JSON.stringify({ templateImage: dto.templateImage ?? null, layout: dto.layout ?? DEFAULT_CERT_LAYOUT });
    await this.prisma.siteSetting.upsert({
      where: { key: this.courseCertKey(courseId) },
      update: { value },
      create: { key: this.courseCertKey(courseId), value },
    });
    await this.audit.log({
      action: 'training.certificate.course.config', adminId, entity: 'Course', entityId: courseId,
      after: { hasTemplate: !!dto.templateImage },
    });
    return this.getCourseCertConfig(courseId);
  }

  async deleteCourseCertConfig(courseId: string, adminId: string) {
    await this.prisma.siteSetting.deleteMany({ where: { key: this.courseCertKey(courseId) } });
    await this.audit.log({ action: 'training.certificate.course.reset', adminId, entity: 'Course', entityId: courseId });
    return this.getCourseCertConfig(courseId);
  }

  // Render a sample certificate from the supplied (possibly unsaved) config so
  // admins can preview placement before saving.
  async certificatePreviewPdf(dto: { templateImage?: string | null; layout?: CertLayout; brandLogo?: string | null }): Promise<Buffer> {
    const sample = {
      learnerName: 'Jordan A. Sample',
      courseTitle: 'Anti-Money-Laundering Essentials',
      category: 'Compliance',
      description: 'Core BSA/AML obligations for money services agents, including red flags and reporting.',
      score: 95,
      completedAt: new Date(),
      branchCode: 'USWDLC',
      certificateId: 'SAMPLE1234',
    };
    const layout = { ...DEFAULT_CERT_LAYOUT, ...(dto.layout ?? {}) };
    // Use the unsaved logo if the editor sent one, else the saved brand logo.
    const logo = dto.brandLogo !== undefined
      ? (dto.brandLogo ? this.dataUrlToBuffer(dto.brandLogo) : undefined)
      : await this.brandLogoBuffer();
    return buildCertificatePdf(
      sample,
      dto.templateImage ? { image: this.dataUrlToBuffer(dto.templateImage), layout } : undefined,
      { logo },
    );
  }

  // Sample certificate for a specific course (real title/category, saved
  // template/layout) so admins can preview the learner-facing output.
  async adminCourseCertificatePreview(courseId: string): Promise<Buffer> {
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { title: true, category: true, description: true } });
    if (!course) throw new NotFoundException('Course not found');
    const [cfg, logo] = await Promise.all([this.resolveCertConfigForCourse(courseId), this.brandLogoBuffer()]);
    return buildCertificatePdf(
      {
        learnerName: 'Jordan A. Sample',
        courseTitle: course.title,
        category: course.category,
        description: course.description,
        score: 95,
        completedAt: new Date(),
        branchCode: 'USWDLC',
        certificateId: 'SAMPLE1234',
      },
      cfg.templateImage ? { image: this.dataUrlToBuffer(cfg.templateImage), layout: cfg.layout } : undefined,
      { logo },
    );
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
      allowDownload: r.allowDownload,
      acknowledged: ackedIds.has(r.id),
    }));
  }

  // Single resource for the in-portal viewer (audience-checked).
  async getResourceForAgent(agentId: string, resourceId: string) {
    const { branchCode, states } = await this.resolveAudience(agentId);
    const resource = await this.prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource || resource.status !== 'PUBLISHED' || !this.matches(resource, branchCode, states)) {
      throw new NotFoundException('Resource not found or not assigned to you');
    }
    const ack = await this.prisma.resourceAck.findUnique({
      where: { resourceId_agentId: { resourceId, agentId } },
    });
    return {
      id: resource.id, title: resource.title, category: resource.category,
      description: resource.description, url: resource.url, allowDownload: resource.allowDownload,
      acknowledged: !!ack,
    };
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
        requireAck: !!dto.requireAck,
        policyStatement: dto.policyStatement?.trim() || null,
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
    if (dto.requireAck !== undefined) data.requireAck = !!dto.requireAck;
    if (dto.policyStatement !== undefined) data.policyStatement = dto.policyStatement?.trim() || null;
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
    const url = safeHttpUrl(dto.url);
    if (!url) throw new BadRequestException('Resource URL must be a valid http(s) link');
    const resource = await this.prisma.resource.create({
      data: {
        title: dto.title, category: dto.category || 'General', description: dto.description ?? null,
        url, allowDownload: dto.allowDownload ?? false,
        audience: dto.audience || 'ALL', targetStates: dto.targetStates ?? null,
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
    for (const k of ['title', 'category', 'description', 'allowDownload', 'audience', 'targetStates', 'targetBranches', 'status', 'order'] as const) {
      if (dto[k] !== undefined) data[k] = dto[k];
    }
    if (dto.url !== undefined) {
      const url = safeHttpUrl(dto.url);
      if (!url) throw new BadRequestException('Resource URL must be a valid http(s) link');
      data.url = url;
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
  async adminCompletions(filter: { state?: string; branchCode?: string; courseId?: string; passedOnly?: boolean }, adminId?: string, role?: string) {
    const where: any = {};
    if (filter.branchCode) where.branchCode = filter.branchCode;
    if (filter.courseId) where.courseId = filter.courseId;
    if (filter.passedOnly) where.passed = true;
    if (filter.state) where.agentState = { contains: filter.state.toUpperCase() };
    // Region scoping: limit to the officer's office branches.
    const scopedBranches = await this.scopedBranchCodes(adminId, role);
    if (scopedBranches) where.branchCode = { in: scopedBranches.length ? scopedBranches : ['__none__'] };
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

  async adminReportSummary(adminId?: string, role?: string) {
    const courses = await this.prisma.course.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, title: true, slug: true, category: true, dueAt: true },
      orderBy: { order: 'asc' },
    });
    const scopedBranches = await this.scopedBranchCodes(adminId, role);
    const completions = await this.prisma.courseCompletion.findMany({
      where: { passed: true, ...(scopedBranches ? { branchCode: { in: scopedBranches.length ? scopedBranches : ['__none__'] } } : {}) },
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

  // ── ADMIN: compliance dashboard (Phase 4) ──────────────────────────────────
  // Content older than this many days is flagged for review.
  private readonly STALE_DAYS = 365;

  async adminComplianceSummary(adminId?: string, role?: string) {
    const now = new Date();
    const scopedBranches = await this.scopedBranchCodes(adminId, role);

    const courses = await this.prisma.course.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true, title: true, category: true, order: true, translationGroup: true,
        audience: true, targetStates: true, targetBranches: true, requireAck: true, dueAt: true,
      },
      orderBy: { order: 'asc' },
    });

    const agents = await this.prisma.agentUser.findMany({
      where: { active: true, ...(scopedBranches ? { branchCode: { in: scopedBranches.length ? scopedBranches : ['__none__'] } } : {}) },
      select: { id: true, branchCode: true },
    });
    const branchCodes = [...new Set(agents.map((a) => a.branchCode).filter(Boolean) as string[])];
    const ddFiles = branchCodes.length
      ? await this.prisma.agentDDFile.findMany({ where: { branchCode: { in: branchCodes } }, select: { branchCode: true, states: true } })
      : [];
    const statesByBranch = new Map(ddFiles.map((f) => [f.branchCode, CSV(f.states)] as const));

    const assignments = await this.prisma.trainingAssignment.findMany({
      where: { active: true }, select: { courseId: true, agentId: true, branchCode: true, dueAt: true },
    });
    const exceptions = await this.prisma.trainingException.findMany({
      where: { status: 'APPROVED' }, select: { courseId: true, agentId: true, branchCode: true, type: true, expiresAt: true },
    });
    const completions = await this.prisma.courseCompletion.findMany({
      where: { passed: true }, select: { courseId: true, agentId: true },
    });
    const passedByCourse = new Map<string, Set<string>>();
    for (const c of completions) {
      if (!passedByCourse.has(c.courseId)) passedByCourse.set(c.courseId, new Set());
      passedByCourse.get(c.courseId)!.add(c.agentId);
    }

    // Latest version per course (for staleness + acknowledgment counts).
    const versions = await this.prisma.courseVersion.findMany({ select: { id: true, courseId: true, version: true, effectiveAt: true } });
    const latestByCourse = new Map<string, { id: string; effectiveAt: Date; version: number }>();
    for (const v of versions) {
      const cur = latestByCourse.get(v.courseId);
      if (!cur || v.version > cur.version) latestByCourse.set(v.courseId, { id: v.id, effectiveAt: v.effectiveAt, version: v.version });
    }
    const latestVersionIds = [...latestByCourse.values()].map((v) => v.id);
    const acks = latestVersionIds.length
      ? await this.prisma.policyAcknowledgment.findMany({ where: { courseVersionId: { in: latestVersionIds } }, select: { agentId: true, courseVersionId: true } })
      : [];
    const ackAgentsByCourse = new Map<string, Set<string>>();
    const courseByVersion = new Map([...latestByCourse.entries()].map(([cid, v]) => [v.id, cid] as const));
    for (const a of acks) {
      const cid = courseByVersion.get(a.courseVersionId);
      if (!cid) continue;
      if (!ackAgentsByCourse.has(cid)) ackAgentsByCourse.set(cid, new Set());
      ackAgentsByCourse.get(cid)!.add(a.agentId);
    }

    // Group translations so an agent is counted once per logical course.
    const groups = new Map<string, typeof courses>();
    for (const c of courses) {
      const key = c.translationGroup || c.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    }

    const staleCutoff = new Date(now.getTime() - this.STALE_DAYS * 86_400_000);
    let totRequired = 0, totCompleted = 0, totOverdue = 0, totExcused = 0;

    const courseRows = Array.from(groups.values()).map((variants) => {
      const variantIds = new Set(variants.map((v) => v.id));
      const groupAssigns = assignments.filter((a) => variantIds.has(a.courseId));
      const groupExceptions = exceptions.filter((e) => variantIds.has(e.courseId) && (!e.expiresAt || e.expiresAt > now));
      const due0 = variants.map((v) => v.dueAt).find(Boolean) ?? null;
      const requireAck = variants.some((v) => v.requireAck);
      const passedAgents = new Set<string>();
      const ackAgents = new Set<string>();
      for (const v of variants) {
        passedByCourse.get(v.id)?.forEach((id) => passedAgents.add(id));
        ackAgentsByCourse.get(v.id)?.forEach((id) => ackAgents.add(id));
      }
      // Newest version effective date across the group → staleness.
      const effectiveAt = variants
        .map((v) => latestByCourse.get(v.id)?.effectiveAt)
        .filter(Boolean)
        .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] as Date | undefined;

      let required = 0, completed = 0, overdue = 0, acknowledged = 0, excused = 0;
      for (const agent of agents) {
        const states = agent.branchCode ? statesByBranch.get(agent.branchCode) ?? [] : [];
        // Branch targets are stored upper-cased; normalise the agent's branch to match.
        const agentBranch = agent.branchCode ? agent.branchCode.toUpperCase() : null;
        const audienceMatch = variants.some((v) => this.matches(v, agent.branchCode, states));
        const assign = groupAssigns.find((a) => a.agentId === agent.id || (!!a.branchCode && a.branchCode === agentBranch));
        if (!audienceMatch && !assign) continue;
        // Approved exception: waiver/equivalency excuses (out of the denominator); extension moves the deadline.
        const exc = groupExceptions.find((e) => e.agentId === agent.id || (!!e.branchCode && e.branchCode === agentBranch));
        if (exc && (exc.type === 'WAIVER' || exc.type === 'EQUIVALENCY')) { excused++; continue; }
        required++;
        if (requireAck && ackAgents.has(agent.id)) acknowledged++;
        if (passedAgents.has(agent.id)) { completed++; continue; }
        const due = exc?.type === 'EXTENSION' ? exc.expiresAt ?? assign?.dueAt ?? due0 : assign?.dueAt ?? due0;
        if (due && due < now) overdue++;
      }
      totRequired += required; totCompleted += completed; totOverdue += overdue; totExcused += excused;
      const head = variants[0];
      return {
        id: head.translationGroup || head.id,
        courseId: head.id,
        title: head.title,
        category: head.category,
        requireAck,
        dueAt: due0,
        requiredCount: required,
        completedCount: completed,
        completionPct: required ? Math.round((completed / required) * 100) : 0,
        overdueCount: overdue,
        excusedCount: excused,
        ackCount: requireAck ? acknowledged : null,
        ackPct: requireAck && required ? Math.round((acknowledged / required) * 100) : null,
        versionEffectiveAt: effectiveAt ?? null,
        stale: !!effectiveAt && effectiveAt < staleCutoff,
      };
    });

    return {
      generatedAt: now,
      totals: {
        courses: courseRows.length,
        required: totRequired,
        completed: totCompleted,
        overdue: totOverdue,
        excused: totExcused,
        completionPct: totRequired ? Math.round((totCompleted / totRequired) * 100) : 0,
        staleCourses: courseRows.filter((c) => c.stale).length,
      },
      courses: courseRows,
    };
  }

  // ── ADMIN: evidence export (Phase 4) ───────────────────────────────────────
  private async adminEvidenceRows(
    filter: { courseId?: string; branchCode?: string; state?: string; from?: string; to?: string; passedOnly?: boolean },
    adminId?: string,
    role?: string,
  ) {
    const where: any = {};
    if (filter.courseId) where.courseId = filter.courseId;
    if (filter.branchCode) where.branchCode = filter.branchCode.toUpperCase();
    if (filter.state) where.agentState = { contains: filter.state.toUpperCase() };
    if (filter.passedOnly) where.passed = true;
    if (filter.from || filter.to) {
      where.completedAt = {};
      if (filter.from) where.completedAt.gte = new Date(filter.from);
      if (filter.to) { const d = new Date(filter.to); d.setHours(23, 59, 59, 999); where.completedAt.lte = d; }
    }
    const scopedBranches = await this.scopedBranchCodes(adminId, role);
    if (scopedBranches) where.branchCode = { in: scopedBranches.length ? scopedBranches : ['__none__'] };

    const rows = await this.prisma.courseCompletion.findMany({
      where, orderBy: { completedAt: 'desc' }, take: 5000,
      include: {
        course: { select: { id: true, title: true, category: true } },
        agent: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    const courseIds = [...new Set(rows.map((r) => r.courseId))];
    const versions = courseIds.length
      ? await this.prisma.courseVersion.findMany({ where: { courseId: { in: courseIds } }, select: { id: true, courseId: true, version: true } })
      : [];
    const latestByCourse = new Map<string, string>();
    const maxVer = new Map<string, number>();
    for (const v of versions) {
      if ((maxVer.get(v.courseId) ?? -1) < v.version) { maxVer.set(v.courseId, v.version); latestByCourse.set(v.courseId, v.id); }
    }
    const latestVersionIds = [...latestByCourse.values()];
    const acks = latestVersionIds.length
      ? await this.prisma.policyAcknowledgment.findMany({ where: { courseVersionId: { in: latestVersionIds } }, select: { agentId: true, courseVersionId: true, acknowledgedAt: true } })
      : [];
    const ackMap = new Map(acks.map((a) => [`${a.agentId}:${a.courseVersionId}`, a.acknowledgedAt] as const));

    return rows.map((r) => ({
      learnerName: `${r.agent.firstName} ${r.agent.lastName}`,
      email: r.agent.email,
      courseTitle: r.course.title,
      category: r.course.category,
      score: r.score,
      passed: r.passed,
      attempt: r.attempt,
      branchCode: r.branchCode,
      agentState: r.agentState,
      completedAt: r.completedAt,
      acknowledgedAt: ackMap.get(`${r.agentId}:${latestByCourse.get(r.courseId) ?? ''}`) ?? null,
    }));
  }

  private toCsv(headers: string[], rows: (string | number | null)[][]): string {
    const esc = (v: string | number | null) => {
      const s = v == null ? '' : String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [headers, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  }

  async adminEvidenceCsv(filter: any, adminId?: string, role?: string): Promise<{ csv: string; filename: string }> {
    const rows = await this.adminEvidenceRows(filter, adminId, role);
    const headers = ['Learner', 'Email', 'Course', 'Category', 'Score', 'Result', 'Attempt', 'Branch', 'State', 'Completed', 'Acknowledged'];
    const body = rows.map((r) => [
      r.learnerName, r.email, r.courseTitle, r.category, r.score, r.passed ? 'PASS' : 'FAIL',
      r.attempt, r.branchCode, r.agentState, r.completedAt.toISOString(), r.acknowledgedAt ? r.acknowledgedAt.toISOString() : '',
    ]);
    return { csv: this.toCsv(headers, body), filename: `training-evidence-${new Date().toISOString().slice(0, 10)}.csv` };
  }

  async adminEvidencePdf(filter: any, generatedBy: string, adminId?: string, role?: string): Promise<{ pdf: Buffer; filename: string }> {
    const rows = await this.adminEvidenceRows(filter, adminId, role);
    const courseTitle = filter.courseId
      ? (await this.prisma.course.findUnique({ where: { id: filter.courseId }, select: { title: true } }))?.title ?? filter.courseId
      : 'All courses';
    const range = `${filter.from ?? 'start'} → ${filter.to ?? 'today'}`;
    const filterSummary = `Course: ${courseTitle} · Branch: ${filter.branchCode ?? 'All'} · State: ${filter.state ?? 'All'} · ${range}`;
    const pdf = await buildEvidencePacketPdf({ generatedAt: new Date(), generatedBy, filterSummary, rows });
    if (adminId) {
      await this.audit.log({ action: 'training.evidence.export', adminId, entity: 'Course', entityId: filter.courseId ?? 'all', after: { records: rows.length, filterSummary } });
    }
    return { pdf, filename: `training-evidence-${new Date().toISOString().slice(0, 10)}.pdf` };
  }
}
