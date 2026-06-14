import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegionalService } from '../regional/regional.service';

// Aggregated metrics for the admin CRM cockpit. One round-trip instead of the
// frontend stitching together a dozen list endpoints. All queries are scoped to
// a regional officer's office/states when applicable.
@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService, private regional: RegionalService) {}

  async summary(adminId?: string, role?: string) {
    const now = new Date();
    const scope = adminId ? await this.regional.scopeForAdmin(adminId, role) : null;

    // Build scoped WHERE clauses (empty = unrestricted, for full admins).
    let appWhere: any = {};
    let ddWhere: any = {};
    let docWhere: any = {};
    let userWhere: any = {};
    let tellerStatus: any = { status: { in: ['NEW', 'UNDER_REVIEW'] } };
    let completionWhere: any = {};
    let scopedSubmissions = true;

    if (scope) {
      // Regional officer: limit to their office's branches/states.
      const officeFiles = scope.officeId
        ? await this.prisma.agentDDFile.findMany({ where: { regionalOfficeId: scope.officeId }, select: { branchCode: true } })
        : [];
      const branchCodes = officeFiles.map((f) => f.branchCode).filter(Boolean) as string[];
      appWhere = scope.states.length ? { businessState: { in: scope.states } } : { id: '__none__' };
      ddWhere = { regionalOfficeId: scope.officeId ?? '__none__' };
      docWhere = { ddFile: { regionalOfficeId: scope.officeId ?? '__none__' } };
      userWhere = branchCodes.length ? { branchCode: { in: branchCodes } } : { id: '__none__' };
      tellerStatus = { status: { in: ['NEW', 'UNDER_REVIEW'] }, branchCode: branchCodes.length ? { in: branchCodes } : '__none__' };
      completionWhere = branchCodes.length ? { branchCode: { in: branchCodes } } : { id: '__none__' };
      scopedSubmissions = false; // submissions are not region-specific
    }

    const [
      appsByStatus,
      ddByStage,
      docsByStatus,
      reviewsDue,
      agentUsers,
      unverifiedUsers,
      tellerPending,
      submissionsOpen,
      coursesPublished,
      coursesPastDue,
      completionsTotal,
      completionsPassed,
    ] = await Promise.all([
      this.prisma.agentApplication.groupBy({ by: ['status'], _count: { _all: true }, where: appWhere }),
      this.prisma.agentDDFile.groupBy({ by: ['stage'], _count: { _all: true }, where: ddWhere }),
      this.prisma.agentDocument.groupBy({ by: ['status'], _count: { _all: true }, where: docWhere }),
      this.prisma.agentDDFile.count({ where: { ...ddWhere, nextReviewDueAt: { lt: now } } }),
      this.prisma.agentUser.groupBy({ by: ['role'], _count: { _all: true }, where: userWhere }),
      this.prisma.agentUser.count({ where: { ...userWhere, emailVerified: false } }),
      this.prisma.tellerApplication.count({ where: tellerStatus }),
      scopedSubmissions ? this.prisma.formSubmission.count({ where: { status: { in: ['NEW', 'IN_PROGRESS'] } } }) : Promise.resolve(0),
      this.prisma.course.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.course.count({ where: { status: 'PUBLISHED', dueAt: { lt: now } } }),
      this.prisma.courseCompletion.count({ where: completionWhere }),
      this.prisma.courseCompletion.count({ where: { ...completionWhere, passed: true } }),
    ]);

    const countBy = (rows: { _count: { _all: number } }[], key: string, match: (r: any) => boolean) =>
      rows.filter(match).reduce((n, r) => n + r._count._all, 0);

    const appStatus = (s: string) => appsByStatus.find((r) => r.status === s)?._count._all ?? 0;
    const stage = (s: string) => ddByStage.find((r) => r.stage === s)?._count._all ?? 0;
    const docStatus = (s: string) => docsByStatus.find((r) => r.status === s)?._count._all ?? 0;
    const roleCount = (r: string) => agentUsers.find((u) => u.role === r)?._count._all ?? 0;

    const applicationsTotal = appsByStatus.reduce((n, r) => n + r._count._all, 0);
    void countBy;

    return {
      applications: {
        total: applicationsTotal,
        new: appStatus('NEW'),
        reviewing: appStatus('REVIEWING'),
        approved: appStatus('APPROVED'),
        rejected: appStatus('REJECTED'),
        pending: appStatus('NEW') + appStatus('REVIEWING'),
      },
      // Onboarding pipeline (DD lifecycle stages).
      pipeline: {
        application: stage('APPLICATION'),
        underReview: stage('UNDER_REVIEW'),
        ddInProgress: stage('DD_IN_PROGRESS'),
        active: stage('ACTIVE'),
        suspended: stage('SUSPENDED'),
        terminated: stage('TERMINATED'),
      },
      branches: {
        active: stage('ACTIVE'),
        portalUsers: roleCount('PRINCIPAL') + roleCount('TELLER'),
        principals: roleCount('PRINCIPAL'),
        tellers: roleCount('TELLER'),
        unverifiedUsers,
      },
      dd: {
        expired: docStatus('EXPIRED'),
        expiring: docStatus('EXPIRING'),
        missing: docStatus('MISSING'),
        reviewsDue,
      },
      tellerApplicationsPending: tellerPending,
      submissionsOpen,
      training: {
        coursesPublished,
        coursesPastDue,
        completionsTotal,
        completionsPassed,
      },
    };
  }

  // Agent 360: one record tying together the DD file, the originating
  // application, the branch's portal users, their training, and a timeline.
  async agentProfile(ddFileId: string, adminId?: string, role?: string) {
    const file = await this.prisma.agentDDFile.findUnique({
      where: { id: ddFileId },
      include: {
        application: true,
        documents: { orderBy: [{ section: 'asc' }, { code: 'asc' }] },
      },
    });
    if (!file) return null;

    // A regional officer may only open files belonging to their office.
    const scope = adminId ? await this.regional.scopeForAdmin(adminId, role) : null;
    if (scope && file.regionalOfficeId !== scope.officeId) return null;

    const users = file.branchCode
      ? await this.prisma.agentUser.findMany({
          where: { branchCode: file.branchCode },
          select: {
            id: true, firstName: true, lastName: true, email: true, phone: true,
            role: true, status: true, active: true, emailVerified: true, lastLoginAt: true, createdAt: true,
          },
          orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
        })
      : [];
    const userIds = users.map((u) => u.id);

    const completions = userIds.length
      ? await this.prisma.courseCompletion.findMany({
          where: { agentId: { in: userIds } },
          orderBy: { completedAt: 'desc' },
          take: 100,
          include: { course: { select: { title: true, category: true, passingScore: true } } },
        })
      : [];

    // Document status rollup.
    const docCounts = { OK: 0, EXPIRING: 0, EXPIRED: 0, MISSING: 0, NA: 0 } as Record<string, number>;
    for (const d of file.documents) docCounts[d.status] = (docCounts[d.status] ?? 0) + 1;

    // Timeline: audit entries touching this file, its application, or its users.
    const timelineIds = [file.id, file.applicationId, ...userIds].filter(Boolean) as string[];
    const timeline = await this.prisma.auditLog.findMany({
      where: { OR: [{ entityId: { in: timelineIds } }, { agentId: { in: userIds } }] },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        admin: { select: { name: true, email: true } },
        agent: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    return {
      ddFile: {
        id: file.id, agentName: file.agentName, branchCode: file.branchCode, entityType: file.entityType,
        states: file.states, regionalOffice: file.regionalOffice, stage: file.stage, riskRating: file.riskRating,
        onboardedAt: file.onboardedAt, lastReviewedAt: file.lastReviewedAt, reviewedBy: file.reviewedBy,
        nextReviewDueAt: file.nextReviewDueAt,
        documents: file.documents.map((d) => ({
          code: d.code, section: d.section, label: d.label, present: d.present, status: d.status,
          expiry: d.expiry, notes: d.notes, dropboxUrl: d.dropboxUrl,
        })),
        documentSummary: docCounts,
        compliant: docCounts.EXPIRED === 0 && docCounts.MISSING === 0,
      },
      application: file.application,
      users,
      training: completions.map((c) => ({
        id: c.id, courseTitle: c.course.title, category: c.course.category, score: c.score,
        passed: c.passed, passingScore: c.course.passingScore, attempt: c.attempt, completedAt: c.completedAt,
        agentId: c.agentId,
      })),
      timeline: timeline.map((t) => ({
        id: t.id, action: t.action, createdAt: t.createdAt,
        actor: t.admin?.name ?? t.admin?.email ?? (t.agent ? `${t.agent.firstName} ${t.agent.lastName}` : null),
      })),
    };
  }

  // Cross-entity global search for the admin header (region-scoped for officers).
  async search(qRaw: string, adminId?: string, role?: string) {
    const q = (qRaw || '').trim();
    if (q.length < 2) return { query: q, results: [] as SearchResult[] };
    const like = { contains: q, mode: 'insensitive' as const };
    const take = 6;

    const scope = adminId ? await this.regional.scopeForAdmin(adminId, role) : null;
    let appScope: any = {};
    let ddScope: any = {};
    let userScope: any = {};
    let tellerScope: any = {};
    if (scope) {
      const officeFiles = scope.officeId
        ? await this.prisma.agentDDFile.findMany({ where: { regionalOfficeId: scope.officeId }, select: { branchCode: true } })
        : [];
      const branchCodes = officeFiles.map((f) => f.branchCode).filter(Boolean) as string[];
      appScope = scope.states.length ? { businessState: { in: scope.states } } : { id: '__none__' };
      ddScope = { regionalOfficeId: scope.officeId ?? '__none__' };
      userScope = branchCodes.length ? { branchCode: { in: branchCodes } } : { id: '__none__' };
      tellerScope = branchCodes.length ? { branchCode: { in: branchCodes } } : { id: '__none__' };
    }

    const [apps, ddFiles, users, tellers] = await Promise.all([
      this.prisma.agentApplication.findMany({
        where: { AND: [appScope, { OR: [{ firstName: like }, { lastName: like }, { company: like }, { email: like }, { businessCity: like }] }] },
        take, orderBy: { createdAt: 'desc' },
        select: { id: true, firstName: true, lastName: true, company: true, email: true, status: true, businessState: true },
      }),
      this.prisma.agentDDFile.findMany({
        where: { AND: [ddScope, { OR: [{ agentName: like }, { branchCode: like }] }] },
        take, orderBy: { updatedAt: 'desc' },
        select: { id: true, agentName: true, branchCode: true, stage: true },
      }),
      this.prisma.agentUser.findMany({
        where: { AND: [userScope, { OR: [{ firstName: like }, { lastName: like }, { email: like }, { branchCode: like }] }] },
        take, orderBy: { createdAt: 'desc' },
        select: { id: true, firstName: true, lastName: true, email: true, role: true, branchCode: true, status: true },
      }),
      this.prisma.tellerApplication.findMany({
        where: { AND: [tellerScope, { OR: [{ firstName: like }, { lastName: like }, { email: like }, { branchCode: like }] }] },
        take, orderBy: { createdAt: 'desc' },
        select: { id: true, firstName: true, lastName: true, email: true, branchCode: true, status: true },
      }),
    ]);

    const results: SearchResult[] = [
      ...apps.map((a) => ({
        type: 'Application' as const,
        id: a.id,
        title: `${a.firstName} ${a.lastName}${a.company ? ` · ${a.company}` : ''}`,
        subtitle: `${a.email}${a.businessState ? ` · ${a.businessState}` : ''}`,
        badge: a.status,
        href: '/applications',
      })),
      ...ddFiles.map((d) => ({
        type: 'DD file' as const,
        id: d.id,
        title: d.agentName,
        subtitle: d.branchCode ? `Branch ${d.branchCode}` : 'No branch code',
        badge: d.stage,
        href: `/agent-profile/${d.id}`,
      })),
      ...users.map((u) => ({
        type: 'Portal user' as const,
        id: u.id,
        title: `${u.firstName} ${u.lastName}`,
        subtitle: `${u.email}${u.branchCode ? ` · ${u.branchCode}` : ''} · ${u.role}`,
        badge: u.status,
        href: '/branches',
      })),
      ...tellers.map((t) => ({
        type: 'Teller app' as const,
        id: t.id,
        title: `${t.firstName} ${t.lastName}`,
        subtitle: `${t.email} · Branch ${t.branchCode}`,
        badge: t.status,
        href: '/tellers',
      })),
    ];

    return { query: q, results };
  }
}

export type SearchResult = {
  type: 'Application' | 'DD file' | 'Portal user' | 'Teller app';
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  href: string;
};
