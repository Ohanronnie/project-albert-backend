import { Router } from "express";
import {
  addWatermark,
  getSavedClip,
  getVideoUrl,
  saveClip,
} from "../controllers/product.controller.js";
import { upload, paymentGuard, guard } from "../../common/utils/helper.js";
import {
  saveDetails,
  pageSelect,
  postContent,
  getPages,
  getSavedPages,
  validatePage,
} from "../controllers/facebook.controller.js";
import { getAuthUrl, getTwitterUser, getUserDetails, postDataToX, removeTwitterAccount, setTwitterContent } from "../controllers/twitter/twitter.controller.js";
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
  router.get("/saved/video/:videoId", getVideoUrl);/*
  router.post("/login/facebook", guard, paymentGuard, saveDetails);
  router.post("/login/facebook/check", guard, paymentGuard, validatePage);
  router.post("/facebook/savepage", guard, paymentGuard, pageSelect);
  router.get("/facebook/getpage", guard, paymentGuard, getPages);
  router.post("/facebook/post", postContent);
  router.get("/facebook/getsavedpage", guard, paymentGuard, getSavedPages);*/
  router.get('/auth/twitter/get_auth_url',guard,paymentGuard, getAuthUrl);
  router.post('/auth/twitter/callback',guard,paymentGuard, getUserDetails);
  router.get('/auth/twitter/user', guard, paymentGuard, getTwitterUser);
  router.post('/auth/twitter/setContent', guard, paymentGuard, setTwitterContent)
  router.delete('/auth/twitter/remove', guard, paymentGuard, removeTwitterAccount);
  router.get('/post_to_x', postDataToX)
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
