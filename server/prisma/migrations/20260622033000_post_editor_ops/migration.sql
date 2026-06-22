-- Add editorial controls for cover image, pinning, ordering, and draft metadata.
ALTER TABLE "Post" ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Post" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Post" ADD COLUMN "draftSavedAt" DATETIME;

DROP INDEX IF EXISTS "Post_status_publishedAt_idx";
CREATE INDEX "Post_status_isPinned_sortOrder_publishedAt_idx" ON "Post"("status", "isPinned", "sortOrder", "publishedAt");
