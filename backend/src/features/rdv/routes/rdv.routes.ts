import { Router, Request, Response } from 'express';
import { rdvService } from '../services/rdv.service';
import { verifySession } from '../../../middlewares/session.middleware';
import { requirePatientId } from '../../../middlewares/requireProfile';
import { validateBody, validateParams, validateQuery } from '../../../middlewares/validate';
import { asyncHandler } from '../../../middlewares/asyncHandler';
import { emailBaseUrl } from '../../../lib/request-url';
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
  verifySession,
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ types: await rdvService.getTypes() });
  })
);

router.get(
  '/booking-sites',
  verifySession,
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await rdvService.getBookingSites(requirePatientId(req)));
  })
);

router.get(
  '/available-dates',
  verifySession,
  validateQuery(availableDatesQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { siteId, modalite, year, month } = req.query as unknown as AvailableDatesQuery;
    res.json(
      await rdvService.getAvailableDates(requirePatientId(req), siteId, modalite, year, month)
    );
  })
);

router.get(
  '/available-slots',
  verifySession,
  validateQuery(availableSlotsQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { siteId, modalite, date } = req.query as unknown as AvailableSlotsQuery;
    const slots = await rdvService.getAvailableSlots(requirePatientId(req), siteId, modalite, date);
    res.json({ slots });
  })
);

router.get(
  '/me',
  verifySession,
  asyncHandler(async (req: Request, res: Response) => {
    const rdvs = await rdvService.getMyBookings(requirePatientId(req));
    res.json({ rdvs, count: rdvs.length });
  })
);

router.post(
  '/',
  verifySession,
  validateBody(createBookingSchema),
  asyncHandler(async (req: Request, res: Response) => {
    res
      .status(201)
      .json(await rdvService.createBooking(requirePatientId(req), req.body, emailBaseUrl(req)));
  })
);

router.delete(
  '/:id',
  verifySession,
  validateParams(rdvIdParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as RdvIdParams;
    await rdvService.cancelBooking(requirePatientId(req), id, emailBaseUrl(req));
    res.status(204).send();
  })
);

export default router;
