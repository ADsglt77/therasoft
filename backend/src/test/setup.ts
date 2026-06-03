/**
 * Variables d'environnement minimales pour les tests (avant import de env.ts).
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/portail_medecin_test?schema=public';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-minimum-32-chars!!';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-minimum-32-chars!';
process.env.ALLOW_PUBLIC_REGISTER = 'false';
process.env.RESET_DB_ON_SEED = 'false';
process.env.FRONTEND_ORIGIN = 'http://localhost';
