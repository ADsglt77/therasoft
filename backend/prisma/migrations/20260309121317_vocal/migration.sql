-- AlterTable
ALTER TABLE "dossier" ADD COLUMN     "observations_audio_duration" INTEGER,
ADD COLUMN     "observations_audio_transcript" TEXT,
ADD COLUMN     "observations_audio_url" TEXT;

-- CreateTable
CREATE TABLE "audio_recording" (
    "id" SERIAL NOT NULL,
    "id_dossier" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "transcript" TEXT,
    "mime_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audio_recording_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audio_recording_id_dossier_idx" ON "audio_recording"("id_dossier");

-- CreateIndex
CREATE INDEX "audio_recording_id_dossier_created_at_idx" ON "audio_recording"("id_dossier", "created_at");

-- AddForeignKey
ALTER TABLE "audio_recording" ADD CONSTRAINT "audio_recording_id_dossier_fkey" FOREIGN KEY ("id_dossier") REFERENCES "dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
