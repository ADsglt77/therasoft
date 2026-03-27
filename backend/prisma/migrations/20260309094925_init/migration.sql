-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MEDECIN', 'ADMIN');

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
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEDECIN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "avatar_url" TEXT,
    "avatar_file_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medecin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacation" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "horaire" TIME(0) NOT NULL,
    "site" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "modalite" "ModaliteType" NOT NULL,
    "id_medecin" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "date_naissance" DATE NOT NULL,
    "sexe" "Sexe" DEFAULT 'UNKNOWN',
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
    "id_patient" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rdv_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modalite" (
    "id" SERIAL NOT NULL,
    "id_rdv" INTEGER NOT NULL,
    "id_vacation" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modalite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dossier" (
    "id" SERIAL NOT NULL,
    "id_patient" INTEGER NOT NULL,
    "id_rdv" INTEGER NOT NULL,
    "observations" TEXT,
    "resultats" TEXT,
    "documents" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_session" (
    "id" SERIAL NOT NULL,
    "id_medecin" INTEGER NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "medecin_email_key" ON "medecin"("email");

-- CreateIndex
CREATE INDEX "medecin_email_idx" ON "medecin"("email");

-- CreateIndex
CREATE INDEX "vacation_id_medecin_idx" ON "vacation"("id_medecin");

-- CreateIndex
CREATE INDEX "vacation_date_idx" ON "vacation"("date");

-- CreateIndex
CREATE INDEX "vacation_id_medecin_date_idx" ON "vacation"("id_medecin", "date");

-- CreateIndex
CREATE INDEX "patient_nom_prenom_idx" ON "patient"("nom", "prenom");

-- CreateIndex
CREATE INDEX "patient_date_naissance_idx" ON "patient"("date_naissance");

-- CreateIndex
CREATE INDEX "rdv_id_patient_idx" ON "rdv"("id_patient");

-- CreateIndex
CREATE INDEX "rdv_date_idx" ON "rdv"("date");

-- CreateIndex
CREATE INDEX "rdv_id_patient_date_idx" ON "rdv"("id_patient", "date");

-- CreateIndex
CREATE INDEX "modalite_id_rdv_idx" ON "modalite"("id_rdv");

-- CreateIndex
CREATE INDEX "modalite_id_vacation_idx" ON "modalite"("id_vacation");

-- CreateIndex
CREATE UNIQUE INDEX "modalite_id_rdv_id_vacation_key" ON "modalite"("id_rdv", "id_vacation");

-- CreateIndex
CREATE INDEX "dossier_id_patient_idx" ON "dossier"("id_patient");

-- CreateIndex
CREATE INDEX "dossier_id_rdv_idx" ON "dossier"("id_rdv");

-- CreateIndex
CREATE INDEX "dossier_id_patient_id_rdv_idx" ON "dossier"("id_patient", "id_rdv");

-- CreateIndex
CREATE UNIQUE INDEX "dossier_id_patient_id_rdv_key" ON "dossier"("id_patient", "id_rdv");

-- CreateIndex
CREATE INDEX "auth_session_id_medecin_idx" ON "auth_session"("id_medecin");

-- CreateIndex
CREATE INDEX "auth_session_expires_at_idx" ON "auth_session"("expires_at");

-- AddForeignKey
ALTER TABLE "vacation" ADD CONSTRAINT "vacation_id_medecin_fkey" FOREIGN KEY ("id_medecin") REFERENCES "medecin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rdv" ADD CONSTRAINT "rdv_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modalite" ADD CONSTRAINT "modalite_id_rdv_fkey" FOREIGN KEY ("id_rdv") REFERENCES "rdv"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modalite" ADD CONSTRAINT "modalite_id_vacation_fkey" FOREIGN KEY ("id_vacation") REFERENCES "vacation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier" ADD CONSTRAINT "dossier_id_patient_fkey" FOREIGN KEY ("id_patient") REFERENCES "patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier" ADD CONSTRAINT "dossier_id_rdv_fkey" FOREIGN KEY ("id_rdv") REFERENCES "rdv"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_id_medecin_fkey" FOREIGN KEY ("id_medecin") REFERENCES "medecin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
