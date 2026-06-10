import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from './errorHandler';
import { DOSSIER_UPLOADS_ROOT, removeUploadedFilesSync } from '../lib/dossier-storage';

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    fs.mkdirSync(DOSSIER_UPLOADS_ROOT, { recursive: true });
    cb(null, DOSSIER_UPLOADS_ROOT);
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
const MAX_TOTAL_UPLOAD_SIZE = 100 * 1024 * 1024; // 100 MB par requête

export const uploadDossierFiles = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(_req, file, cb) {
    if (
      file.mimetype === 'application/octet-stream' &&
      path.extname(file.originalname).toLowerCase() !== '.dcm'
    ) {
      cb(new Error(`Type de fichier non autorisé : ${file.mimetype}`));
      return;
    }
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Type de fichier non autorisé : ${file.mimetype}`));
    }
  },
}).array('files', 10);

/**
 * Signatures binaires utilisées contre le MIME spoofing. Les fichiers DICOM
 * doivent contenir le marqueur DICM ; les formats texte n'ont pas de signature stable.
 */
interface MagicSignature {
  bytes: number;
  check: (buffer: Buffer) => boolean;
}

const dicomSignature: MagicSignature = {
  bytes: 132,
  check: (buffer) => buffer.subarray(128, 132).toString('ascii') === 'DICM',
};

const MAGIC_SIGNATURES: Record<string, MagicSignature> = {
  'image/jpeg': {
    bytes: 3,
    check: (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  'image/png': {
    bytes: 8,
    check: (buffer) =>
      buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  'image/gif': {
    bytes: 4,
    check: (buffer) => buffer.subarray(0, 4).toString('ascii') === 'GIF8',
  },
  'image/webp': {
    bytes: 12,
    check: (buffer) =>
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP',
  },
  'application/pdf': {
    bytes: 5,
    check: (buffer) => buffer.subarray(0, 5).toString('ascii') === '%PDF-',
  },
  'application/dicom': dicomSignature,
  'application/octet-stream': dicomSignature,
};

/**
 * Middleware exécuté après Multer : vérifie que le contenu réel des fichiers
 * correspond au type MIME déclaré (protection contre le MIME spoofing).
 * En cas d'incohérence, supprime les fichiers déjà écrits et rejette la requête.
 */
export function verifyUploadedMagicBytes(req: Request, _res: Response, next: NextFunction): void {
  const files = (req.files as Express.Multer.File[]) || [];

  if (files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_UPLOAD_SIZE) {
    removeUploadedFilesSync(files);
    next(
      new ApiError(
        'La taille totale des fichiers dépasse la limite de 100 Mo',
        'UPLOAD_TOTAL_SIZE_EXCEEDED',
        413
      )
    );
    return;
  }

  const rejectInvalidContent = (file: Express.Multer.File): void => {
    removeUploadedFilesSync(files);
    next(
      new ApiError(
        `Le contenu du fichier ne correspond pas au type déclaré : ${file.originalname}`,
        'UPLOAD_INVALID_CONTENT',
        400
      )
    );
  };

  try {
    for (const file of files) {
      const signature = MAGIC_SIGNATURES[file.mimetype];
      if (!signature) continue;

      const buffer = Buffer.alloc(signature.bytes);
      const fd = fs.openSync(file.path, 'r');
      try {
        const bytesRead = fs.readSync(fd, buffer, 0, signature.bytes, 0);
        if (bytesRead < signature.bytes) {
          rejectInvalidContent(file);
          return;
        }
      } finally {
        fs.closeSync(fd);
      }

      if (!signature.check(buffer)) {
        rejectInvalidContent(file);
        return;
      }
    }
    next();
  } catch (err) {
    removeUploadedFilesSync(files);
    next(err);
  }
}
