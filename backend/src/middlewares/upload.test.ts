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

  it('accepte un fichier DICOM avec sa signature binaire', () => {
    const filePath = path.join(tmpDir, 'scan.dcm');
    const content = Buffer.alloc(132);
    content.write('DICM', 128, 'ascii');
    fs.writeFileSync(filePath, content);

    const file = {
      path: filePath,
      mimetype: 'application/dicom',
      originalname: 'scan.dcm',
    } as Express.Multer.File;

    const { req, res, next } = mockReqRes([file]);
    verifyUploadedMagicBytes(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejette un faux fichier DICOM', () => {
    const filePath = path.join(tmpDir, 'fake.dcm');
    fs.writeFileSync(filePath, Buffer.alloc(132));

    const file = {
      path: filePath,
      mimetype: 'application/dicom',
      originalname: 'fake.dcm',
    } as Express.Multer.File;

    const { req, res, next } = mockReqRes([file]);
    verifyUploadedMagicBytes(req, res, next);

    expect((next.mock.calls[0][0] as ApiError).code).toBe('UPLOAD_INVALID_CONTENT');
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('rejette une requête dépassant 100 Mo au total', () => {
    const firstPath = path.join(tmpDir, 'first.txt');
    const secondPath = path.join(tmpDir, 'second.txt');
    fs.writeFileSync(firstPath, 'first');
    fs.writeFileSync(secondPath, 'second');

    const files = [
      {
        path: firstPath,
        size: 60 * 1024 * 1024,
        mimetype: 'text/plain',
        originalname: 'first.txt',
      },
      {
        path: secondPath,
        size: 50 * 1024 * 1024,
        mimetype: 'text/plain',
        originalname: 'second.txt',
      },
    ] as Express.Multer.File[];

    const { req, res, next } = mockReqRes(files);
    verifyUploadedMagicBytes(req, res, next);

    expect((next.mock.calls[0][0] as ApiError).code).toBe('UPLOAD_TOTAL_SIZE_EXCEEDED');
    expect(fs.existsSync(firstPath)).toBe(false);
    expect(fs.existsSync(secondPath)).toBe(false);
  });
});
