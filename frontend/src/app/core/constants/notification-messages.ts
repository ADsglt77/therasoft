/**
 * Messages de notification centralisés pour toute l'application
 */
export class NotificationMessages {
  // ============================================
  // Messages de succès
  // ============================================

  // Authentification
  static readonly AUTH_LOGIN_SUCCESS = 'Connexion réussie !';
  static readonly AUTH_REGISTER_SUCCESS = 'Compte créé avec succès !';
  static readonly AUTH_LOGOUT_SUCCESS = 'Déconnexion réussie';

  // Profil
  static readonly PROFILE_UPDATE_SUCCESS = 'Profil mis à jour avec succès';
  static readonly PASSWORD_CHANGE_SUCCESS = 'Mot de passe modifié avec succès';

  // ============================================
  // Messages d'erreur par défaut
  // ============================================

  // Authentification
  static readonly AUTH_LOGIN_ERROR = 'Erreur lors de la connexion';
  static readonly AUTH_REGISTER_ERROR = 'Erreur lors de l\'inscription';

  // Profil
  static readonly PROFILE_UPDATE_ERROR = 'Erreur lors de la mise à jour du profil';
  static readonly PASSWORD_CHANGE_ERROR = 'Erreur lors du changement de mot de passe';
  static readonly PROFILE_LOAD_ERROR = 'Erreur lors du chargement du profil';

  // Généraux
  static readonly GENERIC_ERROR = 'Une erreur est survenue';
  static readonly NETWORK_ERROR = 'Erreur de connexion. Veuillez réessayer.';
  static readonly SESSION_EXPIRED = 'Session expirée. Veuillez vous reconnecter.';
}

