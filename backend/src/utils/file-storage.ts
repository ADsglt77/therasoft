import * as fs from 'fs';
import * as path from 'path';
import { ApiError } from '../middlewares/errorHandler';

/**
 * Service de gestion du stockage des fichiers
 */
export class FileStorageService {
  private readonly uploadsDir: string;

  constructor() {
    // Créer le dossier uploads à la racine du projet
    this.uploadsDir = path.join(process.cwd(), 'uploads', 'audio');
    this.ensureDirectoryExists();
  }

  /**
   * Crée le dossier uploads s'il n'existe pas
   */
  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.uploadsDir)) {
      console.log(`[FileStorage] Création du dossier: ${this.uploadsDir}`);
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    } else {
      console.log(`[FileStorage] Dossier existe déjà: ${this.uploadsDir}`);
    }
  }

  /**
   * Sauvegarde un fichier audio
   * @param file Buffer du fichier
   * @param fileName Nom du fichier (ex: recording_1234567890.mp3)
   * @returns Chemin relatif du fichier sauvegardé
   */
  async saveAudioFile(file: Buffer, fileName: string): Promise<string> {
    try {
      // S'assurer que le dossier existe
      this.ensureDirectoryExists();
      
      const filePath = path.join(this.uploadsDir, fileName);
      console.log(`[FileStorage] Sauvegarde du fichier: ${filePath}`);
      console.log(`[FileStorage] Taille du buffer: ${file.length} bytes`);
      
      await fs.promises.writeFile(filePath, file);
      
      // Vérifier que le fichier a bien été créé
      const stats = await fs.promises.stat(filePath);
      console.log(`[FileStorage] Fichier créé avec succès: ${filePath} (${stats.size} bytes)`);
      
      // Retourner le chemin relatif pour l'URL
      return `/uploads/audio/${fileName}`;
    } catch (error: any) {
      console.error(`[FileStorage] Erreur lors de la sauvegarde:`, error);
      throw new ApiError(
        `Erreur lors de la sauvegarde du fichier: ${error.message}`,
        'INTERNAL_ERROR',
        500
      );
    }
  }

  /**
   * Récupère un fichier audio
   * @param filePath Chemin relatif du fichier (ex: /uploads/audio/recording_1234567890.mp3)
   * @returns Buffer du fichier
   */
  async getAudioFile(filePath: string): Promise<Buffer> {
    try {
      // Sécuriser le chemin pour éviter les path traversal
      const fileName = path.basename(filePath);
      const fullPath = path.join(this.uploadsDir, fileName);

      // Vérifier que le fichier existe
      if (!fs.existsSync(fullPath)) {
        throw new ApiError('Fichier audio non trouvé', 'NOT_FOUND', 404);
      }

      return await fs.promises.readFile(fullPath);
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Erreur lors de la lecture du fichier: ${error.message}`,
        'INTERNAL_ERROR',
        500
      );
    }
  }

  /**
   * Supprime un fichier audio
   * @param filePath Chemin relatif du fichier (ex: /uploads/audio/recording_1234567890.mp3)
   */
  async deleteAudioFile(filePath: string): Promise<void> {
    try {
      // Sécuriser le chemin pour éviter les path traversal
      const fileName = path.basename(filePath);
      const fullPath = path.join(this.uploadsDir, fileName);

      // Vérifier que le fichier existe
      if (!fs.existsSync(fullPath)) {
        // Ne pas lever d'erreur si le fichier n'existe pas (déjà supprimé)
        return;
      }

      await fs.promises.unlink(fullPath);
    } catch (error: any) {
      // Ne pas lever d'erreur si le fichier n'existe pas
      if (error.code !== 'ENOENT') {
        throw new ApiError(
          `Erreur lors de la suppression du fichier: ${error.message}`,
          'INTERNAL_ERROR',
          500
        );
      }
    }
  }

  /**
   * Génère un nom de fichier unique
   * @param patientId ID du patient
   * @param rdvId ID du RDV
   * @param extension Extension du fichier (ex: mp3, webm)
   * @returns Nom de fichier unique
   */
  generateFileName(patientId: number, rdvId: number, extension: string): string {
    const timestamp = Date.now();
    return `recording_${patientId}_${rdvId}_${timestamp}.${extension}`;
  }
}

export const fileStorageService = new FileStorageService();

