import AppError from "../../common/utils/appError.js";
import { catchAsync } from "../../common/utils/errorHandler.js";
import { User } from "../schemas/user.schema.js";
import { addVideoOverlay, downloadFile } from "../../common/utils/helper.js";
import { unlinkSync, existsSync as existSync } from "fs";
import { join } from "path";
import { cloudUpload } from "../../common/utils/cloudinary.js";
import { randomBytes } from "crypto";
const resolvePath = (path) => join(process.cwd(), path);
export const addWatermark = catchAsync(async (req, res) => {
  if (!req.files || !req.files.video || !req.files.watermark)
    throw new AppError("Upload a file to continue.", 302);
  const { video, watermark } = req.files;
  const insertTime = req.body.insertTime;
  const type = req.body.type || "image";
  const insertPath = req.body.insertVideo;
  const username = req.body.username;
  const [videoPath, watermarkPath] = [
    resolvePath(video[0].path),
    resolvePath(watermark[0].path),
  ];
  if (!existSync(videoPath) || !existSync(watermarkPath))
    throw new AppError("Error occured somewhere, reupload your file.", 302);
  const output = resolvePath(`uploads/${Date.now().toString(32)}.mp4`);
  let insertVideo;
  if (insertPath) {
    if (!insertPath.startsWith('http')) {
      insertVideo = insertPath
    } else {
      insertVideo = randomBytes(12).toString('base64') + '.mp4';
      let downloaded = await downloadFile(insertPath, insertVideo);
    }
  }
  const addOverlay = addVideoOverlay(
    type,
    videoPath,
    watermarkPath,
    output,
    insertVideo,
    insertTime,
    username,
    res
  )
    .then(async () => {
      unlinkSync(videoPath);
      unlinkSync(watermarkPath);
      const videoId = Date.now().toString(12);
      const cloudResponse = await cloudUpload(output, "EditedVideos");
      await User.findByIdAndUpdate(req.userId, {
        $push: {
          editedVideos: {
            id: videoId,
            video: cloudResponse,
          },
        },
      });
      console.log(await User.find());
      unlinkSync(output);
      if (insertVideo && existSync(insertVideo)) unlinkSync(insertVideo);
      res.status(200).json({
        success: true,
        url: cloudResponse.url,
        id: videoId,
      });
    })
    .catch((err) => {
      console.error(err);
      unlinkSync(videoPath);
      unlinkSync(watermarkPath);
      throw new AppError("Error processing your file.", 302);
    })
    .catch(console.error);
});

export const saveClip = catchAsync(async (req, res) => {
  const insertPath = join(process.cwd(), req.body.path);
  if (existSync(insertPath)) {
    const insertCloudResponse = await cloudUpload(insertPath, "SavedClips");
    const user = await User.findByIdAndUpdate(req.userId, {
      $push: { savedClips: insertCloudResponse },
    });
  }
  res.sendStatus(200)
});
export const getSavedClip = catchAsync(async (req, res) => {
  const saved = await User.findById(req.userId).select('savedClips');  
  return res.status(201).json({ clips: saved.savedClips });
})
export const getVideoUrl = catchAsync(async (req, res) => {
  const videos = await User.find().select('editedVideos');
  const id = req.params.videoId;
  for (let video of videos) {
    for (let edited of video.editedVideos) {
      if (edited.id == id) {
        return res.status(200).json({
          src: edited.video.url
        })
      }
    }
  }
  return res.sendStatus(404)
})