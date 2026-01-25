-- Migration: Add serviceName and price columns to PatientTreatment
-- This allows storing treatment data without requiring FK to Treatment table
-- Run this in Supabase SQL Editor

-- Add serviceName column to store treatment name directly
ALTER TABLE "PatientTreatment" ADD COLUMN IF NOT EXISTS "serviceName" TEXT;

-- Add price column to store treatment price directly
ALTER TABLE "PatientTreatment" ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION DEFAULT 0;

-- Make serviceId nullable (remove FK constraint requirement)
-- Note: The FK might already allow NULL, but ensure the column accepts NULL
ALTER TABLE "PatientTreatment" ALTER COLUMN "serviceId" DROP NOT NULL;

COMMENT ON COLUMN "PatientTreatment"."serviceName" IS 'Nombre del tratamiento (almacenado directamente sin necesidad de FK)';
COMMENT ON COLUMN "PatientTreatment"."price" IS 'Precio del tratamiento (almacenado directamente)';
