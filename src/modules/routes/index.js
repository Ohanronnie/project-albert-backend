import { Router } from "express";
import { userRoutes } from "./user.route.js";
import { productRoutes } from "./product.route.js";
const router = Router();
export const setRoutes = () => {
  router.use("/user", userRoutes());
  router.use("/product", productRoutes());
  return router;
};
