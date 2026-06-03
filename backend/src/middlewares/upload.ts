import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from './errorHandler';

const UPLOADS_ROOT = path.resolve('uploads', 'dossiers');

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
    cb(null, UPLOADS_ROOT);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, uniqueName);
  },
});

const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/dicom',
  'application/octet-stream',
  'text/plain',
  'text/csv',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export const uploadDossierFiles = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Type de fichier non autorisé : ${file.mimetype}`));
    }
  },
}).array('files', 10);

/**
 * Signatures binaires ("magic bytes") par type MIME pour lequel un contrôle
 * fiable existe. Les types sans signature stable (DICOM brut, octet-stream,
 * texte) ne sont pas vérifiés ici.
 */
const MAGIC_SIGNATURES: Record<string, (buf: Buffer) => boolean> = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) =>
    b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/gif': (b) => b.subarray(0, 4).toString('ascii') === 'GIF8',
  'image/webp': (b) =>
    b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
  'application/pdf': (b) => b.subarray(0, 5).toString('ascii') === '%PDF-',
};

/**
 * Middleware exécuté après Multer : vérifie que le contenu réel des fichiers
 * correspond au type MIME déclaré (protection contre le MIME spoofing).
 * En cas d'incohérence, supprime les fichiers déjà écrits et rejette la requête.
 */
export function verifyUploadedMagicBytes(req: Request, _res: Response, next: NextFunction): void {
  const files = (req.files as Express.Multer.File[]) || [];

  const cleanup = () => {
    files.forEach((f) => {
      try {
        fs.unlinkSync(f.path);
      } catch {
        // déjà supprimé
      }
    });
  };

  try {
    for (const file of files) {
      const check = MAGIC_SIGNATURES[file.mimetype];
      if (!check) continue;

      const buffer = Buffer.alloc(12);
      const fd = fs.openSync(file.path, 'r');
      try {
        fs.readSync(fd, buffer, 0, 12, 0);
      } finally {
        fs.closeSync(fd);
      }

      if (!check(buffer)) {
        cleanup();
        return next(
          new ApiError(
            `Le contenu du fichier ne correspond pas au type déclaré : ${file.originalname}`,
            'UPLOAD_INVALID_CONTENT',
            400
          )
        );
      }
    }
    next();
  } catch (err) {
    cleanup();
    next(err);
  }
}

export { UPLOADS_ROOT };
