const ffmpeg = require("fluent-ffmpeg");

const firstVideoPath =
  "/sdcard/DCIM/Camera/c20286d0e23213dad7aa39e8a210321d.mp4";
const secondVideoPath = "../watermark/testone.mp4";
const outputPath = "video.mp4";

ffmpeg()
  .input(firstVideoPath)
  .input(secondVideoPath)
  .complexFilter([
    //    '[0:v][1:v]overlay=10:10[overlayed]',
    "[1:v]scale=iw/4:ih/4 [overlay]; [0:v][overlay]overlay=10:10[outv]",
    "[1:a]anull[aud]",
  ])
  .map("[outv]")
  .map("[aud]")
  .output(outputPath)
  .videoCodec("libx264")
  .audioCodec("aac")
  .on("end", () => {
    console.log("Processing finished");
  })
  .on("error", (err) => {
    console.error("Error:", err);
  })
  .run();
