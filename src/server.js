import { ENVIRONMENT } from "./common/config/environment.js";
import express from "express";
import AppError from "./common/utils/appError.js";
import { setRoutes } from "./modules/routes/index.js";
import {
  catchAsync,
  handleError,
  timeoutMiddleware,
} from "./common/utils/errorHandler.js";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { stream } from "./common/utils/logger.js";
import morgan from "morgan";
import { connectDb } from "./common/config/database.js";
import fs from "fs";
import path from "path";
/**
 * Default app configurations
 */
const app = express();
const port = process.env.PORT || ENVIRONMENT.APP.PORT;
const appName = ENVIRONMENT.APP.NAME;

/**
 * App Security
 */
app.set('trust proxy', true)
app.use(helmet());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5173/",
      "*",
      "https://www.itoolsai.com",
      "https://www.itoolsai.com/",
      process.env.FRONTEND_URL,
    ],
    method: ["GET", "POST"],
    credentials: true,
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.disable("x-powered-by");
app.use(compression());
/**
 * Logger Middleware
 */
app.use(
  morgan(ENVIRONMENT.APP.ENV !== "local" ? "combined" : "dev", { stream }),
);

// append request time to all request
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});


app.get("/video", (req, res) => {
  try {
  const videoPath = path.join(process.cwd(), "uploads", req.query.path || 'testfile'); // Update with your video file path

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    const chunksize = end - start + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    const head = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": "video/mp4",
      'Cross-Origin-Resource-Policy': 'cross-origin'
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      "Content-Length": fileSize,
      "Content-Type": "application/octet-stream",
      'Content-Disposition': 'attachment',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    };
    res.writeHead(200, head);
 //   res.download(videoPath)
    fs.createReadStream(videoPath).pipe(res);
  }
  } catch(err){
    console.error(err)
  }
});
app.use("/", setRoutes());

// catch 404 and forward to error handler
app.all(
  "*",
  catchAsync(async (req, res) => {
    throw new AppError("route not found", 404);
  }),
);
app.use((req, res, next) => {
  console.log(req.ip, req.socket.remoteAddress)
})
/**
 * Error handler middlewares
 */
app.use(timeoutMiddleware);
app.use(handleError);

/**
 * status check
 */
app.get("*", (req, res) =>
  res.send({
    Time: new Date(),
    status: "running",
  }),
);

/**
 * Bootstrap server 
 */
app.listen(port, () => {
  console.log("=> " + appName + "app listening on port" + port + "!");
  connectDb();
});
