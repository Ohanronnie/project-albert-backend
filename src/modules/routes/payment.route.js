import { Router } from "express";
import { guard } from "../../common/utils/helper.js";
import {
  initiatePayment,
  validatePayment,
  paymentWebhook,
} from "../controllers/payment.controller.js";
const router = Router();
export const paymentRoutes = () => {
  router.post("/initialize", guard, initiatePayment);
  router.post("/validate", guard, validatePayment);
  router.post("/webhook", paymentWebhook);
  return router;
};
