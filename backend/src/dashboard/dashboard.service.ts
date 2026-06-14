import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Aggregated metrics for the admin CRM cockpit. One round-trip instead of the
// frontend stitching together a dozen list endpoints.
@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async summary() {
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

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
      this.prisma.agentApplication.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.agentDDFile.groupBy({ by: ['stage'], _count: { _all: true } }),
      this.prisma.agentDocument.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.agentDDFile.count({ where: { nextReviewDueAt: { lt: now } } }),
      this.prisma.agentUser.groupBy({ by: ['role'], _count: { _all: true } }),
      this.prisma.agentUser.count({ where: { emailVerified: false } }),
      this.prisma.tellerApplication.count({ where: { status: { in: ['NEW', 'UNDER_REVIEW'] } } }),
      this.prisma.formSubmission.count({ where: { status: { in: ['NEW', 'IN_PROGRESS'] } } }),
      this.prisma.course.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.course.count({ where: { status: 'PUBLISHED', dueAt: { lt: now } } }),
      this.prisma.courseCompletion.count(),
      this.prisma.courseCompletion.count({ where: { passed: true } }),
    ]);

    const countBy = (rows: { _count: { _all: number } }[], key: string, match: (r: any) => boolean) =>
      rows.filter(match).reduce((n, r) => n + r._count._all, 0);

    const appStatus = (s: string) => appsByStatus.find((r) => r.status === s)?._count._all ?? 0;
    const stage = (s: string) => ddByStage.find((r) => r.stage === s)?._count._all ?? 0;
    const docStatus = (s: string) => docsByStatus.find((r) => r.status === s)?._count._all ?? 0;
    const role = (r: string) => agentUsers.find((u) => u.role === r)?._count._all ?? 0;

    const applicationsTotal = appsByStatus.reduce((n, r) => n + r._count._all, 0);
    void countBy; void soon;

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
        portalUsers: role('PRINCIPAL') + role('TELLER'),
        principals: role('PRINCIPAL'),
        tellers: role('TELLER'),
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

  // Cross-entity global search for the admin header.
  async search(qRaw: string) {
    const q = (qRaw || '').trim();
    if (q.length < 2) return { query: q, results: [] as SearchResult[] };
    const like = { contains: q, mode: 'insensitive' as const };
    const take = 6;

    const [apps, ddFiles, users, tellers] = await Promise.all([
      this.prisma.agentApplication.findMany({
        where: { OR: [{ firstName: like }, { lastName: like }, { company: like }, { email: like }, { businessCity: like }] },
        take, orderBy: { createdAt: 'desc' },
        select: { id: true, firstName: true, lastName: true, company: true, email: true, status: true, businessState: true },
      }),
      this.prisma.agentDDFile.findMany({
        where: { OR: [{ agentName: like }, { branchCode: like }] },
        take, orderBy: { updatedAt: 'desc' },
        select: { id: true, agentName: true, branchCode: true, stage: true },
      }),
      this.prisma.agentUser.findMany({
        where: { OR: [{ firstName: like }, { lastName: like }, { email: like }, { branchCode: like }] },
        take, orderBy: { createdAt: 'desc' },
        select: { id: true, firstName: true, lastName: true, email: true, role: true, branchCode: true, status: true },
      }),
      this.prisma.tellerApplication.findMany({
        where: { OR: [{ firstName: like }, { lastName: like }, { email: like }, { branchCode: like }] },
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
        href: `/agent-dd/${d.id}`,
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
