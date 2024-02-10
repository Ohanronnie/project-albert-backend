import AppError from "../../common/utils/appError.js";
import { catchAsync } from "../../common/utils/errorHandler.js";
import { User } from "../schemas/user.schema.js";
import Joi from "joi";
import { addVideoOverlay } from "../../common/utils/helper.js";
import {
  unlinkSync,
  existsSync as existSync,
  createReadStream,
  writeFileSync,
} from "fs";
import { join } from "path";
const resolvePath = (path) => join(process.cwd(), path);
export const addWatermark = catchAsync(async (req, res) => {
  if (!req.files || !req.files.video || !req.files.watermark)
    throw new AppError("Upload a file to continue.", 302);
  const { video, watermark, insertVideo } = req.files;
  const insertTime = req.body.insertTime;
  const type = req.body.type || "image";
  const [videoPath, watermarkPath, insertPath] = [
    resolvePath(video[0].path),
    resolvePath(watermark[0].path),
    insertVideo?.[0]?.path &&  resolvePath(insertVideo?.[0]?.path),
  ];
  if (!existSync(videoPath) || !existSync(watermarkPath))
    throw new AppError("Error occured somewhere, reupload your file.", 302);
  const output = resolvePath(`uploads/${Date.now().toString(32)}.mp4`);
  const addOverlay = addVideoOverlay(
    type,
    videoPath,
    watermarkPath,
    output,
    insertPath,
    insertTime,
    res,
  )
    .catch((err) => {
      console.error(err);
      unlinkSync(videoPath);
      unlinkSync(watermarkPath);
      throw new AppError("Error processing your file.", 302);
    })
    .then(() => {
      unlinkSync(videoPath);
      unlinkSync(watermarkPath);
      res.status(200).json({
        success: true,
        path: output.split(new RegExp(/\/|\\/)).pop(),
      });

    });
});
