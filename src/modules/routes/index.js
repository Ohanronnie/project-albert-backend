import { Router } from "express";
import { userRoutes } from "./user.route.js";
import { insertVideoRoute, productRoutes } from "./product.route.js";
import { paymentRoutes } from "./payment.route.js";
const router = Router();
export const setRoutes = () => {
  router.use("/user", userRoutes());
  router.use("/product", productRoutes());
  router.use("/payment", paymentRoutes());
  router.use("/upload", insertVideoRoute());
  return router;
};
