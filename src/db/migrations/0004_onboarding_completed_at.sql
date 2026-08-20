-- Migration: adiciona campos de onboarding à tabela organizations
-- task_18: Onboarding guiado — fluxo 3 passos e tour interativo

ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "cnpj" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "area_atuacao" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "onboarding_completed_at" timestamp;
