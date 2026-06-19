import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { buildCertificatePdf, DEFAULT_CERT_LAYOUT, type CertLayout } from './certificate';

// Owns the completion-certificate template, branding (logo/address) and the
// global + per-course layout config. Split out of TrainingService; the portal
// certificate download (TrainingService.getCertificate) delegates here.
@Injectable()
export class CertificateService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  dataUrlToBuffer(dataUrl: string): Buffer {
    const comma = dataUrl.indexOf(',');
    return Buffer.from(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl, 'base64');
  }

  async getCertificateConfig(): Promise<{ templateImage: string | null; layout: CertLayout; brandLogo: string | null; brandAddress: string | null }> {
    const [imgRow, layoutRow, logoRow, addrRow] = await Promise.all([
      this.prisma.siteSetting.findUnique({ where: { key: 'cert.templateImage' } }),
      this.prisma.siteSetting.findUnique({ where: { key: 'cert.layout' } }),
      this.prisma.siteSetting.findUnique({ where: { key: 'brand.logo' } }),
      this.prisma.siteSetting.findUnique({ where: { key: 'brand.address' } }),
    ]);
    const templateImage = imgRow ? (JSON.parse(imgRow.value) as string | null) : null;
    const brandLogo = logoRow ? (JSON.parse(logoRow.value) as string | null) : null;
    const brandAddress = addrRow ? (JSON.parse(addrRow.value) as string | null) : null;
    const layout = layoutRow
      ? { ...DEFAULT_CERT_LAYOUT, ...(JSON.parse(layoutRow.value) as Partial<CertLayout>) }
      : DEFAULT_CERT_LAYOUT;
    return { templateImage, layout, brandLogo, brandAddress };
  }

  async brandAddress(): Promise<string | null> {
    const row = await this.prisma.siteSetting.findUnique({ where: { key: 'brand.address' } });
    return row ? (JSON.parse(row.value) as string | null) : null;
  }

  // The company logo (data URL) shared by the built-in certificate and the DD
  // file PDF, as a decoded buffer.
  async brandLogoBuffer(): Promise<Buffer | undefined> {
    const row = await this.prisma.siteSetting.findUnique({ where: { key: 'brand.logo' } });
    if (!row) return undefined;
    const url = JSON.parse(row.value) as string | null;
    return url ? this.dataUrlToBuffer(url) : undefined;
  }

  async saveCertificateConfig(dto: { templateImage?: string | null; layout?: CertLayout; brandLogo?: string | null; brandAddress?: string | null }, adminId: string) {
    if (dto.brandAddress !== undefined) {
      const addr = (dto.brandAddress ?? '').toString().slice(0, 200) || null;
      await this.prisma.siteSetting.upsert({
        where: { key: 'brand.address' },
        update: { value: JSON.stringify(addr) },
        create: { key: 'brand.address', value: JSON.stringify(addr) },
      });
    }
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
  async certificatePreviewPdf(dto: { templateImage?: string | null; layout?: CertLayout; brandLogo?: string | null; brandAddress?: string | null }): Promise<Buffer> {
    const sample = {
      learnerName: 'Jordan A. Sample',
      courseTitle: 'Anti-Money-Laundering Essentials',
      category: 'Compliance',
      description: 'Core BSA/AML obligations for money services agents, including red flags and reporting.',
      score: 95,
      completedAt: new Date(),
      branchCode: 'USWDLC',
      certificateId: 'SAMPLE1234',
      address: dto.brandAddress !== undefined ? (dto.brandAddress || null) : await this.brandAddress(),
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
    const [cfg, logo, address] = await Promise.all([this.resolveCertConfigForCourse(courseId), this.brandLogoBuffer(), this.brandAddress()]);
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
        address,
      },
      cfg.templateImage ? { image: this.dataUrlToBuffer(cfg.templateImage), layout: cfg.layout } : undefined,
      { logo },
    );
  }
}
