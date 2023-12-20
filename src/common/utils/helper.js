import { randomBytes } from "crypto";
import { execSync } from "child_process";
import { catchAsync } from "./errorHandler.js";
import { User } from "../../modules/schemas/user.schema.js";
import jwt from "jsonwebtoken";
import AppError from "./appError.js";
import multer from "multer";
import { unlinkSync, existsSync as existSync, createReadStream } from "fs";
import { join } from "path";
/**
 * Generates a random string of the specified length.
 *
 * @param {number} length - The length of the random string to generate.
 * @return {string} - The generated random string.
 */
export function generateRandomString(length) {
  return randomBytes(length).toString("hex");
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
    let command = "ffmpeg";
    let argument = [];
    switch (type) {
      case "image":
//        argument = `-i ${video} -i ${watermark} -filter_complex overlay=10:10 -c:v libx264 -preset ultrafast -c:a aac -strict experimental -f mp4 -movflags frag_keyframe+empty_moov ${output}`;
        argument = `-i ${video} -i ${watermark} -filter_complex "[1:v]scale=iw/4:ih/4 [watermark]; [0:v][watermark]overlay=10:10" -c:a copy ${output}`
        break;
      case "video":
        argument = `-i ${video} -i ${watermark} -filter_complex "[1:v]scale=iw/4:ih/4 [overlay]; [0:v][overlay]overlay=10:10[outv]" -map "[outv]" -map 1:a -c:v libx264 -c:a aac -strict experimental -movflags +faststart  -f mp4 ${output}`;
        break;
      case "text":
        command = ``;
        break;
      default:
        return false;
    }
    let spawned = execSync(`${command} ${argument}`, { shell: true });
    resolve(true);
    /*    let hasRun = false;
    /*  spawned.stdout.on("data", (data) => {
      process.stdout.write(data.toString());
      if(!hasRun && existSync(output)){
        createReadStream(output).pipe(res);
        hasRun = true;
      }
    });
    spawned.stdout.pipe(res);
    spawned.on("close", () => resolve(true));
    spawned.stderr.on("data", (err) => {
      console.error(err.toString());
    });*/
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
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join("uploads/"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const fileFilter = (req, file, cb) => {
  const fileRegex = /image|video|application|octet-stream/;
  console.log(file.mimetype);
  if (!file.mimetype.match(fileRegex)) {
    return cb(new AppError("Only image and video files are supported."), false);
  } else {
    cb(null, true);
  }
};
// Create the multer instance
export const upload = multer({ storage, fileFilter });
