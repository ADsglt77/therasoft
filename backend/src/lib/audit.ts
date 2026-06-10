import { prisma } from './prisma';
import { logger } from './logger';

/**
 * Actions tracées dans le journal d'accès (RGPD).
 */
type AuditAction =
  | 'DOSSIER_READ'
  | 'DOSSIER_OBSERVATIONS_UPDATE'
  | 'DOSSIER_VERIFIED_UPDATE'
  | 'DOSSIER_FILE_UPLOAD'
  | 'DOSSIER_FILE_DOWNLOAD'
  | 'DOSSIER_FILE_DELETE';

interface AuditEntry {
  medecinId: number;
  action: AuditAction;
  resource: string;
  resourceId?: string | number | null;
  ip?: string | null;
}

/**
 * Enregistre une entrée dans le journal d'accès aux données médicales.
 * Volontairement "fire and forget" : une erreur de log ne doit jamais
 * faire échouer la requête métier.
 */
export function recordAudit(entry: AuditEntry): void {
  prisma.auditLog
    .create({
      data: {
        medecinId: entry.medecinId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId != null ? String(entry.resourceId) : null,
        ip: entry.ip ?? null,
      },
    })
    .catch((err: unknown) => {
      logger.error({ err }, 'Audit log write failed');
    });
}
