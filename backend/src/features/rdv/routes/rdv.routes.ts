import { Router, Request, Response } from 'express';
import { rdvService } from '../services/rdv.service';
import { verifyPatientAccessToken } from '../../../middlewares/jwt.middleware';
import { requirePatientId } from '../../../middlewares/requireMedecin';
import { validateBody, validateParams, validateQuery } from '../../../middlewares/validate';
import { asyncHandler } from '../../../middlewares/asyncHandler';
import {
  createBookingSchema,
  rdvIdParamsSchema,
  RdvIdParams,
  availableDatesQuerySchema,
  AvailableDatesQuery,
  availableSlotsQuerySchema,
  AvailableSlotsQuery,
} from '../schemas/rdv.schemas';

const router = Router();

router.get(
  '/types',
  verifyPatientAccessToken,
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ types: await rdvService.getTypes() });
  })
);

router.get(
  '/booking-sites',
  verifyPatientAccessToken,
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await rdvService.getBookingSites(requirePatientId(req)));
  })
);

router.get(
  '/available-dates',
  verifyPatientAccessToken,
  validateQuery(availableDatesQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { siteId, year, month } = req.query as unknown as AvailableDatesQuery;
    res.json(await rdvService.getAvailableDates(requirePatientId(req), siteId, year, month));
  })
);

router.get(
  '/available-slots',
  verifyPatientAccessToken,
  validateQuery(availableSlotsQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { siteId, modalite, date } = req.query as unknown as AvailableSlotsQuery;
    const slots = await rdvService.getAvailableSlots(requirePatientId(req), siteId, modalite, date);
    res.json({ slots });
  })
);

router.get(
  '/me',
  verifyPatientAccessToken,
  asyncHandler(async (req: Request, res: Response) => {
    const rdvs = await rdvService.getMyBookings(requirePatientId(req));
    res.json({ rdvs, count: rdvs.length });
  })
);

router.post(
  '/',
  verifyPatientAccessToken,
  validateBody(createBookingSchema),
  asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(await rdvService.createBooking(requirePatientId(req), req.body));
  })
);

router.delete(
  '/:id',
  verifyPatientAccessToken,
  validateParams(rdvIdParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as RdvIdParams;
    await rdvService.cancelBooking(requirePatientId(req), id);
    res.status(204).send();
  })
);

export default router;
