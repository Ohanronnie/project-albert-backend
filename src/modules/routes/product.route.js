import { Router } from "express";
import {
  addWatermark,
  getSavedClip,
  getVideoUrl,
  saveClip,
} from "../controllers/product.controller.js";
import { upload, paymentGuard, guard } from "../../common/utils/helper.js";
import {
  LoginDetails,
  pageSelect,
  postContent,
  getPages,
  getSavedPages,
} from "../controllers/facebook.controller.js";
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
  router.post("/save-clip", guard, paymentGuard, saveClip);
  router.post("/saved/clips", guard, paymentGuard, getSavedClip);
  router.get("/saved/video/:videoId", getVideoUrl);
  router.post("/login/facebook", guard, paymentGuard, LoginDetails);
  router.post("/facebook/savepage", guard, paymentGuard, pageSelect);
  router.get("/facebook/getpage", guard, paymentGuard, getPages);
  router.post("/facebook/post", postContent);
  router.get("/facebook/getsavedpage", guard, paymentGuard, getSavedPages);
  return router;
};

export const insertVideoRoute = () => {
  router.post(
    "/insert-video",
    guard,
    paymentGuard,
    upload.single("video"),
    (req, res) => {
      console.log(req.file);
      const path = req.file.path;
      return res.json({
        path,
      });
    },
  );
  return router;
};
