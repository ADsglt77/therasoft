import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from '../features/auth/routes/auth.routes';

const router = Router();

// Routes de santé
router.use('/health', healthRoutes);

// Routes d'authentification
router.use('/auth', authRoutes);

export default router;




