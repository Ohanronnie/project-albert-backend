import { Router } from "express";
import {
  createUser,
  createToken,
  getUser,
} from "../controllers/user.controller.js";
import { guard } from "../../common/utils/helper.js";
const router = Router();

export const userRoutes = () => {
  router.post("/create", createUser);
  router.post("/login", createToken);
  router.post("/", guard, getUser);
  return router;
};
