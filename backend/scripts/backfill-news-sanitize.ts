/**
 * One-time backfill: re-sanitize the stored HTML body of every news post.
 *
 * Sanitization is enforced on write (and on read), but posts authored before
 * that shipped may still hold unsanitized HTML at rest. This rewrites each row
 * through the same allowlist so the database itself is clean. Idempotent - safe
 * to run repeatedly; it only writes rows whose sanitized body differs.
 *
 *   npm run backfill:news
 */
import { PrismaClient } from '@prisma/client';
import { sanitizeRichHtml } from '../src/training/sanitize';

const prisma = new PrismaClient();

async function main() {
  const posts = await (prisma as any).newsPost.findMany({ select: { id: true, slug: true, body: true } });
  let changed = 0;
  for (const post of posts) {
    const clean = sanitizeRichHtml(post.body ?? '');
    if (clean !== (post.body ?? '')) {
      await (prisma as any).newsPost.update({ where: { id: post.id }, data: { body: clean } });
      changed++;
      console.log(`sanitized: ${post.slug}`);
    }
  }
  console.log(`Done. ${changed} of ${posts.length} post(s) rewritten.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
