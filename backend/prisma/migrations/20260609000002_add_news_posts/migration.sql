CREATE TABLE IF NOT EXISTS "NewsPost" (
    "id"          TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "slug"        TEXT NOT NULL,
    "category"    TEXT NOT NULL DEFAULT 'NEWS',
    "summary"     TEXT,
    "body"        TEXT NOT NULL DEFAULT '',
    "author"      TEXT,
    "imageUrl"    TEXT,
    "publishedAt" TIMESTAMP(3),
    "status"      TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsPost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NewsPost_slug_key" ON "NewsPost"("slug");
CREATE INDEX IF NOT EXISTS "NewsPost_status_category_idx" ON "NewsPost"("status", "category");
CREATE INDEX IF NOT EXISTS "NewsPost_publishedAt_idx" ON "NewsPost"("publishedAt");
