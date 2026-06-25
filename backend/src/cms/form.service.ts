import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateFormDto, UpdateFormDto } from './dto/form.dto';
import { MailService } from '../common/mail.service';

@Injectable()
export class FormService {
  constructor(private prisma: PrismaService, private audit: AuditService, private mail: MailService) {}

  // ── Public ────────────────────────────────────────────────────────────────
  // Returns a published form by slug with its parsed field definitions.
  async getPublic(slug: string) {
    const form = await this.prisma.form.findUnique({ where: { slug } });
    if (!form || form.status !== 'PUBLISHED') {
      throw new NotFoundException(`Form "${slug}" not found`);
    }
    return this.serialize(form);
  }

  async submit(
    slug: string,
    data: Record<string, unknown>,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const form = await this.prisma.form.findUnique({ where: { slug } });
    if (!form || form.status !== 'PUBLISHED') {
      throw new NotFoundException(`Form "${slug}" not found`);
    }
    // Validate required fields server-side.
    const fields = this.parseFields(form.fields);
    for (const f of fields) {
      if (f.required && f.type !== 'heading') {
        const v = data?.[f.name];
        if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
          throw new BadRequestException(`Missing required field: ${f.label || f.name}`);
        }
      }
    }
    const submission = await this.prisma.formSubmission.create({
      data: {
        formId: form.id,
        data: JSON.stringify(data ?? {}),
        ip: ctx?.ip ?? null,
        userAgent: ctx?.userAgent ?? null,
      },
    });
    return { ok: true, id: submission.id };
  }

  // ── Admin ─────────────────────────────────────────────────────────────────
  async listAll() {
    const forms = await this.prisma.form.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { submissions: true } } },
    });
    return forms.map((f) => ({
      ...this.serialize(f),
      submissionCount: f._count.submissions,
    }));
  }

  async getById(id: string) {
    const form = await this.prisma.form.findUnique({ where: { id } });
    if (!form) throw new NotFoundException(`Form ${id} not found`);
    return this.serialize(form);
  }

  async create(dto: CreateFormDto, adminId: string) {
    const exists = await this.prisma.form.findUnique({ where: { slug: dto.slug } });
    if (exists) throw new BadRequestException(`A form with slug "${dto.slug}" already exists`);
    const form = await this.prisma.form.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description ?? null,
        fields: JSON.stringify(dto.fields ?? []),
        status: dto.status ?? 'DRAFT',
        submitLabel: dto.submitLabel ?? 'Submit',
        successMessage: dto.successMessage ?? 'Thank you - your submission has been received.',
        recaptcha: dto.recaptcha ?? true,
      },
    });
    await this.audit.log({ action: 'form.create', adminId, entity: 'Form', entityId: form.id, after: { name: dto.name, slug: dto.slug } });
    return this.serialize(form);
  }

  async update(id: string, dto: UpdateFormDto, adminId: string) {
    const existing = await this.prisma.form.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Form ${id} not found`);
    if (dto.slug && dto.slug !== existing.slug) {
      const clash = await this.prisma.form.findUnique({ where: { slug: dto.slug } });
      if (clash) throw new BadRequestException(`A form with slug "${dto.slug}" already exists`);
    }
    const form = await this.prisma.form.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.fields !== undefined ? { fields: JSON.stringify(dto.fields) } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.submitLabel !== undefined ? { submitLabel: dto.submitLabel } : {}),
        ...(dto.successMessage !== undefined ? { successMessage: dto.successMessage } : {}),
        ...(dto.recaptcha !== undefined ? { recaptcha: dto.recaptcha } : {}),
      },
    });
    await this.audit.log({ action: 'form.update', adminId, entity: 'Form', entityId: id, after: { status: form.status } });
    return this.serialize(form);
  }

  async remove(id: string, adminId: string) {
    const existing = await this.prisma.form.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Form ${id} not found`);
    const submissions = await this.prisma.formSubmission.count({ where: { formId: id } });
    if (submissions > 0) {
      throw new BadRequestException(
        `This form has ${submissions} submission(s) on record and cannot be deleted (they are intake evidence). Unpublish it instead.`,
      );
    }
    await this.prisma.form.delete({ where: { id } });
    await this.audit.log({ action: 'form.delete', adminId, entity: 'Form', entityId: id, before: { slug: existing.slug } });
    return { ok: true };
  }

  async listSubmissions(id: string, archived = false) {
    const form = await this.prisma.form.findUnique({ where: { id } });
    if (!form) throw new NotFoundException(`Form ${id} not found`);
    const subs = await this.prisma.formSubmission.findMany({
      where: { formId: id, archivedAt: archived ? { not: null } : null },
      orderBy: { createdAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    return subs.map((s) => ({
      id: s.id,
      status: s.status,
      assignee: s.assignee,
      data: this.safeParse(s.data),
      archivedAt: s.archivedAt,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      messages: s.messages,
    }));
  }

  async archiveSubmission(submissionId: string, adminId: string, archived = true) {
    await this.prisma.formSubmission.update({
      where: { id: submissionId },
      data: { archivedAt: archived ? new Date() : null, archivedBy: archived ? adminId : null },
    });
    await this.audit.log({
      action: archived ? 'form.submission.archive' : 'form.submission.unarchive',
      adminId,
      entity: 'FormSubmission',
      entityId: submissionId,
    });
    return { ok: true };
  }

  // ── Case management: status, internal notes, emailed replies ──────────────
  private submitterEmail(data: unknown): string | null {
    const d = (data ?? {}) as Record<string, unknown>;
    const v = d.email ?? d.emailAddress ?? d.Email;
    return typeof v === 'string' && v.includes('@') ? v : null;
  }

  async setSubmissionStatus(submissionId: string, status: string, adminId: string, assignee?: string) {
    const updated = await this.prisma.formSubmission.update({
      where: { id: submissionId },
      data: { status, ...(assignee !== undefined ? { assignee } : {}) },
    });
    await this.audit.log({ action: 'form.submission.status', adminId, entity: 'FormSubmission', entityId: submissionId, after: { status } });
    return updated;
  }

  async addNote(submissionId: string, body: string, admin: { id: string; name?: string }) {
    const msg = await this.prisma.submissionMessage.create({
      data: { submissionId, kind: 'NOTE', body, authorId: admin.id, authorName: admin.name },
    });
    await this.prisma.formSubmission.update({ where: { id: submissionId }, data: { updatedAt: new Date() } });
    await this.audit.log({ action: 'form.submission.note', adminId: admin.id, entity: 'FormSubmission', entityId: submissionId });
    return msg;
  }

  async reply(submissionId: string, subject: string, body: string, admin: { id: string; name?: string }) {
    const sub = await this.prisma.formSubmission.findUnique({ where: { id: submissionId } });
    if (!sub) throw new NotFoundException('Submission not found');
    const to = this.submitterEmail(this.safeParse(sub.data));
    if (!to) throw new BadRequestException('This submission has no email address to reply to.');

    let emailError: string | null = null;
    try {
      await this.mail.sendSubmissionReply(to, subject, body);
    } catch (err) {
      emailError = (err as Error).message;
    }
    const msg = await this.prisma.submissionMessage.create({
      data: { submissionId, kind: 'REPLY', body, toEmail: to, authorId: admin.id, authorName: admin.name, emailError },
    });
    await this.prisma.formSubmission.update({
      where: { id: submissionId },
      data: { status: 'RESPONDED', updatedAt: new Date() },
    });
    await this.audit.log({ action: 'form.submission.reply', adminId: admin.id, entity: 'FormSubmission', entityId: submissionId, after: { to, emailError } });
    if (emailError) throw new BadRequestException(`Reply saved but email failed to send: ${emailError}`);
    return msg;
  }

  async deleteSubmission(submissionId: string, adminId: string) {
    await this.prisma.formSubmission.delete({ where: { id: submissionId } });
    await this.audit.log({ action: 'form.submission.delete', adminId, entity: 'FormSubmission', entityId: submissionId });
    return { ok: true };
  }

  // ── helpers ─────────────────────────────────────────────────────────────
  private serialize(form: { fields: string } & Record<string, unknown>) {
    return { ...form, fields: this.safeParse(form.fields) };
  }

  private parseFields(raw: string): Array<{ name: string; label?: string; type?: string; required?: boolean }> {
    const parsed = this.safeParse(raw);
    return Array.isArray(parsed) ? parsed : [];
  }

  private safeParse(raw: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
}
