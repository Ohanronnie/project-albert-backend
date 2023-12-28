import { randomBytes } from "crypto";
import { execSync } from "child_process";
import { catchAsync } from "./errorHandler.js";
import { User } from "../../modules/schemas/user.schema.js";
import jwt from "jsonwebtoken";
import AppError from "./appError.js";
import multer from "multer";
import {
  writeFileSync,
  unlinkSync,
  existsSync as existSync,
  createReadStream,
} from "fs";
import { join } from "path";
import ffmpeg from "fluent-ffmpeg";
import _axios from "axios";
/**
 * Generates a random string of the specified length.
 *
 * @param {number} length - The length of the random string to generate.
 * @return {string} - The generated random string.
 */
export function generateRandomString(length) {
  return randomBytes(length).toString("hex");
}

function convertVideo(video, watermark, output) {
  return new Promise((resolve, reject) => {
    const firstVideo = video;
    const secondVideo = watermark;
    const outputVideo = output;
    const command = ffmpeg()
      .input(video)
      .input(watermark)
      .complexFilter([
        "[1:v]scale=iw/4:ih/4 [overlay]; [0:v][overlay]overlay=10:10[outv]",
        "[1:a]anull[aud]",
      ])
      .map("[outv]")
      .map("[aud]")
      .outputOption("-preset ultrafast")
      .output(output)
      .videoCodec("libx264")
      .audioCodec("aac");
    command
      .on("end", () => {
        resolve(true);
      })
      .on("error", (err) => {
        reject(err);
      })
      .run();
  });
}

function convertImage(video, watermark, output) {
  return new Promise((resolve, reject) => {
    const inputVideo = video;
    const outputVideo = output;

    ffmpeg(inputVideo)
      .input(watermark)
      .complexFilter(
        "[1:v]scale=100:100[watermark];[0:v][watermark]overlay=5:5",
      )
      .audioCodec("copy")
      .output(outputVideo)
      .on("end", () => {
        resolve(true);
      })
      .on("error", (err) => {
        reject(err);
      })
      .run();
  });
}
/**
 *
 * Add watermark to a video.
 *
 * @param {string} type - The type of watermark
 * @param {string} video - The video to watermark
 * @param {string} watermark - The watermark
 * @param  {string} output - The output file
 * @param {Response} res - Express Response Object
 * @return {boolean}
 *
 **/

export function addVideoOverlay(type, video, watermark, output, res) {
  return new Promise((resolve, reject) => {
    switch (type) {
      case "image":
        convertImage(video, watermark, output).then(resolve).catch(reject);
        break;
      case "video":
        convertVideo(video, watermark, output).then(resolve).catch(reject);
        break;
      case "text":
        command = ``;
        break;
      default:
        reject(false);
    }
  });
}

export const guard = catchAsync(async (req, res, next) => {
  const token =
    req.headers["X-AUTH-TOKEN"] ||
    req.headers["authorization"]?.split(" ")[1] ||
    req.headers["Authorization"]?.split(" ")[1] ||
    "";
  try {
    let payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: payload.id });
    if (!user) throw new AppError("Invalid Token!", 302);
    req.userId = user._id;
    next();
  } catch (err) {
    console.log(err);
    throw new AppError("Session Expired! Relogin", 302);
  }
});
export const paymentGuard = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ _id: req.userId });
  const { hasPaid, paymentExpiresIn, createdAt } = user;

  const date = new Date();
  if (new Date(createdAt).getDate() + 7 > date.getDate()) {
    /*   if (!hasPaid) {
      return res.status(200).json({
        has_paid: false,
        free_trial_ends: (new Date(createdAt).getDate() + 7) - date.getDate(),
        payment_required: "optional"
      })
    } else {
      return res.status(200).json({
        has_paid: true,
        payment_ends: paymentExpiresIn,
        payment_required: false
      })
    }*/
    next();
  } else if (new Date(paymentExpiresIn).getTime() > new Date().getTime()) {
    /*   return res.status(200).json({
      has_paid: true,
      payment_ends: paymentExpiresIn,
      payment_required: false
    })*/
    next();
  } else {
    throw new AppError("Free trial over. Pay to use this service.");
  }
});
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join("uploads/"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const fileFilter = (req, file, cb) => {
  const fileRegex = /image|video|application/;
  if (!file.mimetype.match(fileRegex)) {
    return cb(new AppError("Only image and video files are supported."), false);
  } else {
    cb(null, true);
  }
};
export const upload = multer({ storage, fileFilter });

_axios.interceptors.request.use(
  async (config) => {
    config = { ...config, maxBodyLength: Infinity };
    config.headers = {
      ...config.headers,
      "Content-Type": "application/json",
    };
    return config;
  },
  (err) => Promise.reject(err),
);
export const axios = _axios;
