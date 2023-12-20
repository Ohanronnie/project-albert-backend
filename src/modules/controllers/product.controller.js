import AppError from "../../common/utils/appError.js";
import { catchAsync } from "../../common/utils/errorHandler.js";
import { User } from "../schemas/user.schema.js";
import Joi from "joi";
import { addVideoOverlay } from "../../common/utils/helper.js";
import { unlinkSync, existsSync as existSync, createReadStream, writeFileSync } from "fs";
import { join } from "path";
const resolvePath = (path) => join(process.cwd(), path);
export const addWatermark = catchAsync(async (req, res) => {
  if (!req.files || !req.files.video || !req.files.watermark)
    throw new AppError("Upload a file to continue.", 302);
  const { video, watermark } = req.files;
  const type = req.body.type || "image";
  const [videoPath, watermarkPath] = [
    resolvePath(video[0].path),
    resolvePath(watermark[0].path),
  ];
  if (!existSync(videoPath) || !existSync(watermarkPath))
    throw new AppError("Error occured somewhere, reupload your file.", 302);
  const output = join(`uploads/${Date.now().toString(32)}.mp4`);
  writeFileSync(output,"");
  const addOverlay = addVideoOverlay(
    type,
    videoPath,
    watermarkPath,
    resolvePath(output),
    res,
  )
    .catch((err) => {
      throw new AppError("Error processing your file.", 302);
    })
    .then(() => {
      unlinkSync(videoPath);
      unlinkSync(watermarkPath);
      res.status(200).json({
        success: true,
        path: output.split("/")[1],
      });
    });
});
