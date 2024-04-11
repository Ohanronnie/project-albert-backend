import { randomBytes } from "crypto";
import { catchAsync } from "./errorHandler.js";
import { User } from "../../modules/schemas/user.schema.js";
import jwt from "jsonwebtoken";
import AppError from "./appError.js";
import multer from "multer";
import {
  writeFileSync,
  unlinkSync,
  readFileSync,
  createWriteStream,
  existsSync,
} from "fs";
import { join } from "path";
import ffmpeg from "fluent-ffmpeg";
import _axios from "axios";
import https from "https";

/**
 * Generates a random string of the specified length.
 *
 * @param {number} length - The length of the random string to generate.
 * @return {string} - The generated random string.
 */
export function generateRandomString(length) {
  return randomBytes(length).toString("hex");
}
export function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(destination);

    https
      .get(url, (response) => {
        response.pipe(file);

        file.on("finish", () => {
          file.close(() => {
            resolve();
          });
        });
      })
      .on("error", (err) => {
        console.log(err);
        fs.unlink(destination, () => {
          reject(`Error downloading file: ${err.message}`);
        });
      });
  });
}
function cutVideo(startTime, endTime, videoPath, outputPath) {
  return new Promise((resolve, reject) => {
    const command = ffmpeg().input(videoPath).seekInput(startTime);
    if (endTime) command.duration(endTime);
    else {
      ffmpeg.ffprobe(videoPath, function (err, metadata) {
        if (err) {
          reject(err);
          return;
        }
        const duration = metadata.format.duration;
        command.duration(duration);
      });
    }
    command.output(outputPath);
    command.on("end", () => {
      resolve(true);
    });
    command.on("error", (error) => {
      console.log(error);
      reject(false);
    });
    command.run();
  });
}

function placeWatermark(video, watermark, output) {
  return new Promise((resolve, reject) => {
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

    command.on("end", () => {
      resolve(true);
    });
    command.on("error", (error) => {
      reject(new Error(error));
    });
    command.run();
  });
}
function mergeVideos(path, output) {
  return new Promise((resolve, reject) => {
    let command = ffmpeg();
    path.forEach((file) => {
      command = command.input(file);
    });
    command.on("error", (err) => {
      reject(err);
    });
    command.on("end", () => {
      resolve(true);
    });
    command.mergeToFile(output, "./temp/");
  });
}
function insertVideo(insertPath, insertTime, video, output) {
  return new Promise(async (resolve, reject) => {
    if (!insertPath && !insertTime) {
      writeFileSync(output, readFileSync(video));
      unlinkSync(video);
      return resolve(true);
    }
    const temp2 = Date.now().toString(17) + ".mp4";
    const temp3 = Date.now().toString(18) + ".mp4";
    const temp4 = Date.now().toString(20) + ".mp4";
    const PATHS = [temp2, insertPath, temp3];
    try {
      const _cut1 = await cutVideo(0, insertTime, video, temp2);
      const _cut2 = await cutVideo(insertTime, null, video, temp3);
      await mergeVideos(PATHS, temp4);
      writeFileSync(output, readFileSync(temp4));
      unlinkSync(temp2);
      unlinkSync(temp3);
      unlinkSync(temp4);
      unlinkSync(insertPath);
      unlinkSync(video);
      resolve(true);
    } catch (error) {
      console.error(error);
      unlinkSync(temp2);
      unlinkSync(insertPath);
      unlinkSync(temp3);
      unlinkSync(temp4);
      unlinkSync(video);
      reject(error);
    }
  });
}
function placeImage(video, watermark, output) {
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
function convertVideo(
  video,
  watermark,
  insertPath,
  insertTime,
  username,
  output,
) {
  return new Promise(async (resolve, reject) => {
    const temp1 = Date.now().toString(16) + ".mp4";
    const temp2 = randomBytes(13).toString("hex") + ".mp4";
    try {
      const _watermark = await placeWatermark(video, watermark, temp1);
      await insertVideo(insertPath, insertTime, temp1, temp2);
      await insertText(temp2, username, output);
      resolve(true);
    } catch (error) {
      console.error(error);
      reject(false);
    }
  });
}

function convertImage(
  video,
  watermark,
  insertPath,
  insertTime,
  username,
  output,
) {
  return new Promise(async (resolve, reject) => {
    const inputVideo = video;
    const outputVideo = output;
    const temp1 = Date.now().toString(19) + ".mp4";
    const temp2 = randomBytes(13).toString("hex") + ".mp4";
    try {
      await placeImage(video, watermark, temp1);
      await insertVideo(insertPath, insertTime, temp1, temp2);
      await insertText(temp2, username, output);
      resolve(output);
    } catch (error) {
      reject(error);
    }
  });
}
function insertText(video, text, output) {
  return new Promise((resolve, reject) => {
    ffmpeg(video)
      .complexFilter([
        {
          filter: "drawtext",
          options: {
            font: "arial",
            text,
            fontsize: 24,
            x: "(w/2)-text_w",
            y: "(h/2)-th",
            fontcolor: "white",
            box: 1,
            boxcolor: "black@0.2",
            boxborderw: 5,
          },
        },
      ])
      .output(output)
      .on("end", () => {
        resolve(true);
      })
      .on("error", (err) => {
        reject(new Error(err));
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
 * @param {string} insertPath - Insert video path
 * @param {number} insertTime - Insert video time
 * @param {Response} res - Express Response Object
 * @return {boolean}
 *
 **/

export function addVideoOverlay(
  type,
  video,
  watermark,
  output,
  insertPath,
  insertTime,
  username,
  res,
) {
  return new Promise((resolve, reject) => {
    switch (type) {
      case "image":
        convertImage(video, watermark, insertPath, insertTime, username, output)
          .then(resolve)
          .catch(reject);
        break;
      case "video":
        convertVideo(video, watermark, insertPath, insertTime, username, output)
          .then(resolve)
          .catch(reject);
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
  if (!user) throw new AppError("Error occured somewhere, try relogin");
  const todayDate = new Date();
  const accountCreatedAt = new Date(user.createdAt);
  if (user.hasPaid) {
    if (user.paymentExpiresIn < todayDate) {
      return res.status(200).json({
        success: true,
        paymentRequired: true,
        paymentExpiredOn: user.paymentExpiresIn,
      });
    } else {
      next();
    }
  } else {
    accountCreatedAt.setDate(accountCreatedAt.getDate() + 7);
    if (accountCreatedAt < todayDate) {
      return res.status(200).json({
        success: true,
        paymentRequired: true,
        freeTrialExpiredOn: accountCreatedAt,
      });
    } else {
      return next();
    }
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
