import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from '../features/auth/routes/auth.routes';
import planningRoutes from '../features/planning/routes/planning.routes';
import patientRoutes from '../features/patients/routes/patient.routes';

const router = Router();

// Routes de santé
router.use('/health', healthRoutes);

// Routes d'authentification
router.use('/auth', authRoutes);

// Routes de planning
router.use('/planning', planningRoutes);

// Routes de patients
router.use('/patients', patientRoutes);

export default router;




