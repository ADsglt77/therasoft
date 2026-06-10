-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MEDECIN', 'PATIENT');

-- CreateEnum
CREATE TYPE "Sexe" AS ENUM ('M', 'F', 'X', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ModaliteType" AS ENUM ('XRAY', 'CT', 'MRI', 'US', 'MAMMO', 'PET', 'OTHER');

-- CreateTable
CREATE TABLE "medecin" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "specialite" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medecin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacation" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "horaire" TIME(0) NOT NULL,
    "modalite" "ModaliteType" NOT NULL,
    "id_site" INTEGER NOT NULL,
    "id_medecin" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "adresse" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "website_url" TEXT,
    "opening_hours" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "date_naissance" DATE,
    "sexe" "Sexe" DEFAULT 'UNKNOWN',
    "adresse" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "user_id" TEXT,
    "id_medecin" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rdv" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "heure_debut" TIME(0) NOT NULL,
    "heure_fin" TIME(0) NOT NULL,
    "modalite" "ModaliteType" NOT NULL,
    "motif" TEXT,
    "id_patient" INTEGER NOT NULL,
    "id_medecin" INTEGER,
    "id_site" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rdv_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rdv_vacation" (
    "id" SERIAL NOT NULL,
    "id_rdv" INTEGER NOT NULL,
    "id_vacation" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rdv_vacation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dossier" (
    "id" SERIAL NOT NULL,
    "id_rdv" INTEGER NOT NULL,
    "observations" TEXT,
    "operation_ready_at" TIMESTAMP(3),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dossier_file" (
    "id" SERIAL NOT NULL,
    "id_dossier" INTEGER NOT NULL,
    "original_name" TEXT NOT NULL,
    "stored_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dossier_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" SERIAL NOT NULL,
    "id_medecin" INTEGER,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL,
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PATIENT',

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMP(3),
    "refresh_token_expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modalite_config" (
    "id" SERIAL NOT NULL,
    "modalite" "ModaliteType" NOT NULL,
    "duree_minutes" INTEGER NOT NULL,

    CONSTRAINT "modalite_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "medecin_user_id_key" ON "medecin"("user_id");

-- CreateIndex
CREATE INDEX "vacation_id_medecin_idx" ON "vacation"("id_medecin");

-- CreateIndex
CREATE INDEX "vacation_date_idx" ON "vacation"("date");

-- CreateIndex
CREATE INDEX "vacation_id_medecin_date_idx" ON "vacation"("id_medecin", "date");

-- CreateIndex
CREATE INDEX "vacation_id_site_idx" ON "vacation"("id_site");

-- CreateIndex
CREATE UNIQUE INDEX "site_nom_ville_key" ON "site"("nom", "ville");

-- CreateIndex
CREATE UNIQUE INDEX "patient_user_id_key" ON "patient"("user_id");

-- CreateIndex
CREATE INDEX "patient_nom_prenom_idx" ON "patient"("nom", "prenom");

-- CreateIndex
CREATE INDEX "patient_date_naissance_idx" ON "patient"("date_naissance");

-- CreateIndex
CREATE INDEX "patient_id_medecin_idx" ON "patient"("id_medecin");

-- CreateIndex
CREATE INDEX "rdv_id_patient_idx" ON "rdv"("id_patient");

-- CreateIndex
CREATE INDEX "rdv_date_idx" ON "rdv"("date");

-- CreateIndex
CREATE INDEX "rdv_id_patient_date_idx" ON "rdv"("id_patient", "date");

-- CreateIndex
CREATE INDEX "rdv_id_medecin_idx" ON "rdv"("id_medecin");

-- CreateIndex
CREATE INDEX "rdv_vacation_id_rdv_idx" ON "rdv_vacation"("id_rdv");

-- CreateIndex
CREATE INDEX "rdv_vacation_id_vacation_idx" ON "rdv_vacation"("id_vacation");

-- CreateIndex
CREATE UNIQUE INDEX "rdv_vacation_id_rdv_id_vacation_key" ON "rdv_vacation"("id_rdv", "id_vacation");

-- CreateIndex
CREATE UNIQUE INDEX "dossier_id_rdv_key" ON "dossier"("id_rdv");

-- CreateIndex
CREATE INDEX "dossier_file_id_dossier_idx" ON "dossier_file"("id_dossier");

-- CreateIndex
CREATE INDEX "audit_log_id_medecin_idx" ON "audit_log"("id_medecin");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "modalite_config_modalite_key" ON "modalite_config"("modalite");

-- AddForeignKey
ALTER TABLE "medecin" ADD CONSTRAINT "medecin_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacation" ADD CONSTRAINT "vacation_id_site_fkey" FOREIGN KEY ("id_site") REFERENCES "site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacation" ADD CONSTRAINT "vacation_id_medecin_fkey" FOREIGN KEY ("id_medecin") REFERENCES "medecin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient" ADD CONSTRAINT "patient_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient" ADD CONSTRAINT "patient_id_medecin_fkey" FOREIGN KEY ("id_medecin") REFERENCES "medecin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rdv" ADD CONSTRAINT "rdv_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rdv" ADD CONSTRAINT "rdv_id_medecin_fkey" FOREIGN KEY ("id_medecin") REFERENCES "medecin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rdv" ADD CONSTRAINT "rdv_id_site_fkey" FOREIGN KEY ("id_site") REFERENCES "site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rdv_vacation" ADD CONSTRAINT "rdv_vacation_id_rdv_fkey" FOREIGN KEY ("id_rdv") REFERENCES "rdv"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rdv_vacation" ADD CONSTRAINT "rdv_vacation_id_vacation_fkey" FOREIGN KEY ("id_vacation") REFERENCES "vacation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier" ADD CONSTRAINT "dossier_id_rdv_fkey" FOREIGN KEY ("id_rdv") REFERENCES "rdv"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier_file" ADD CONSTRAINT "dossier_file_id_dossier_fkey" FOREIGN KEY ("id_dossier") REFERENCES "dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_id_medecin_fkey" FOREIGN KEY ("id_medecin") REFERENCES "medecin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

