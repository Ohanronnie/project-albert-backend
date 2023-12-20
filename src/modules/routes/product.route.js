import { Router } from "express";
import { addWatermark } from "../controllers/product.controller.js";
import { upload } from "../../common/utils/helper.js";
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
  router.post("/watermark", upload.fields(fields), addWatermark);
  return router;
};
