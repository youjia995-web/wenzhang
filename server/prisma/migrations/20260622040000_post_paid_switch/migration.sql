-- Add per-article paid/free switch. Existing articles remain paid by default.
ALTER TABLE "Post" ADD COLUMN "isPaid" BOOLEAN NOT NULL DEFAULT true;
