import { Router } from "express";
import { addWatermark, getSavedClip, getVideoUrl, saveClip } from "../controllers/product.controller.js";
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
  }
];
export const productRoutes = () => {
  router.post(
    "/watermark",
    guard,
    paymentGuard,
    upload.fields(fields),
    addWatermark,
  );
  router.post('/save-clip', guard, paymentGuard, saveClip);
  router.post('/saved/clips', guard, paymentGuard, getSavedClip);
  router.get('/saved/video/:videoId', getVideoUrl)
  return router;
};

export const insertVideoRoute = () => {
  router.post("/insert-video", guard, paymentGuard, upload.single('video'), (req, res) => {
    console.log(req.file)
    const path = req.file.path;
    return res.json({
      path
    })
  });
  return router
}