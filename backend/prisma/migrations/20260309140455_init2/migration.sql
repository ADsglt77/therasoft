/*
  Warnings:

  - You are about to drop the column `observations_audio_duration` on the `dossier` table. All the data in the column will be lost.
  - You are about to drop the column `observations_audio_transcript` on the `dossier` table. All the data in the column will be lost.
  - You are about to drop the column `observations_audio_url` on the `dossier` table. All the data in the column will be lost.
  - You are about to drop the `audio_recording` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "audio_recording" DROP CONSTRAINT "audio_recording_id_dossier_fkey";

-- AlterTable
ALTER TABLE "dossier" DROP COLUMN "observations_audio_duration",
DROP COLUMN "observations_audio_transcript",
DROP COLUMN "observations_audio_url";

-- DropTable
DROP TABLE "audio_recording";
