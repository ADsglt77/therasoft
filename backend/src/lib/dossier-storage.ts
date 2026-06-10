import fs from 'fs';
import path from 'path';
import { logger } from './logger';
import { ApiError } from '../middlewares/errorHandler';

export const DOSSIER_UPLOADS_ROOT = path.resolve('uploads', 'dossiers');

export function resolveDossierFile(storedName: string): string {
  if (path.basename(storedName) !== storedName) {
    throw new ApiError('Nom de fichier stocké invalide', 'INVALID_FILE_PATH', 500);
  }

  const resolved = path.resolve(DOSSIER_UPLOADS_ROOT, storedName);
  if (path.dirname(resolved) !== DOSSIER_UPLOADS_ROOT) {
    throw new ApiError('Chemin de fichier stocké invalide', 'INVALID_FILE_PATH', 500);
  }
  return resolved;
}

export async function removeDossierFiles(storedNames: string[]): Promise<void> {
  const results = await Promise.allSettled(
    storedNames.map(async (storedName) => fs.promises.unlink(resolveDossierFile(storedName)))
  );

  results.forEach((result, index) => {
    if (result.status === 'rejected' && !isMissingFileError(result.reason)) {
      logger.error(
        { err: result.reason, storedName: storedNames[index] },
        'Dossier file cleanup failed'
      );
    }
  });
}

export async function removeUploadedFiles(files: Express.Multer.File[]): Promise<void> {
  const results = await Promise.allSettled(files.map((file) => fs.promises.unlink(file.path)));
  results.forEach((result, index) => {
    if (result.status === 'rejected' && !isMissingFileError(result.reason)) {
      logger.error(
        { err: result.reason, path: files[index]?.path },
        'Uploaded file cleanup failed'
      );
    }
  });
}

export function removeUploadedFilesSync(files: Express.Multer.File[]): void {
  files.forEach((file) => {
    try {
      fs.unlinkSync(file.path);
    } catch (error) {
      if (!isMissingFileError(error)) {
        logger.error({ err: error, path: file.path }, 'Uploaded file cleanup failed');
      }
    }
  });
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOENT'
  );
}
