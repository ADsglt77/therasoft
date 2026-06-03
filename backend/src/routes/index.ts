import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from '../features/auth/routes/auth.routes';
import planningRoutes from '../features/planning/routes/planning.routes';
import dossierRoutes from '../features/dossier/routes/dossier.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/planning', planningRoutes);
router.use('/patients', dossierRoutes);

export default router;
