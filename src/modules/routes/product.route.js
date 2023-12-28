import { Router } from "express";
import { addWatermark } from "../controllers/product.controller.js";
import { upload, paymentGuard, guard } from "../../common/utils/helper.js";
const router = Router();
const fields = [
  {
    name: "video",
    maxCount: 1,
  },
  {
    name: "watermark",
    maxCount: 1,
  },
];
export const productRoutes = () => {
  router.post(
    "/watermark",
    guard,
    paymentGuard,
    upload.fields(fields),
    addWatermark,
  );
  return router;
};
