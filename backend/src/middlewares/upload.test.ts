import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Request, Response } from 'express';
import { verifyUploadedMagicBytes } from './upload';
import { ApiError } from './errorHandler';

function mockReqRes(files: Express.Multer.File[]) {
  const req = { files } as Request;
  const res = {} as Response;
  const next = vi.fn();
  return { req, res, next };
}

describe('verifyUploadedMagicBytes', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upload-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('accepte un fichier PDF valide', () => {
    const filePath = path.join(tmpDir, 'rapport.pdf');
    fs.writeFileSync(filePath, '%PDF-1.4 fake content');

    const file = {
      path: filePath,
      mimetype: 'application/pdf',
      originalname: 'rapport.pdf',
    } as Express.Multer.File;

    const { req, res, next } = mockReqRes([file]);
    verifyUploadedMagicBytes(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('rejette un PDF dont le contenu ne correspond pas au MIME', () => {
    const filePath = path.join(tmpDir, 'fake.pdf');
    fs.writeFileSync(filePath, 'not a pdf at all');

    const file = {
      path: filePath,
      mimetype: 'application/pdf',
      originalname: 'fake.pdf',
    } as Express.Multer.File;

    const { req, res, next } = mockReqRes([file]);
    verifyUploadedMagicBytes(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('UPLOAD_INVALID_CONTENT');
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('passe sans vérification pour les types sans signature (DICOM)', () => {
    const filePath = path.join(tmpDir, 'scan.dcm');
    fs.writeFileSync(filePath, Buffer.from([0x00, 0x01, 0x02]));

    const file = {
      path: filePath,
      mimetype: 'application/dicom',
      originalname: 'scan.dcm',
    } as Express.Multer.File;

    const { req, res, next } = mockReqRes([file]);
    verifyUploadedMagicBytes(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});
