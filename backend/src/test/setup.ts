/**
 * Variables d'environnement minimales pour les tests (avant import de env.ts).
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/portail_medecin_test?schema=public';
process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? 'test-auth-secret-minimum-32-characters!';
process.env.FRONTEND_ORIGIN = 'http://localhost';
