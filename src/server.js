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
app.use(helmet());
app.use(
  cors({
    origin: ["http://localhost:5173","http://localhost:5173/","*", process.env.FRONTEND_URL],
    method: ["GET", "POST"],
    credentials: true,
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.disable("x-powered-by");
app.use(compression());
app.use((req, res, next) => {
  console.log(Date.now());
  next();
});

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
//app.use('/video', express.static('uploads/'))
/**
 * Initialize routes
 */
/*app.get("/video/:path", (req, res) => {
  if(fs.existsSync(req.params.path)){
    fs.createReadStream("uploads/"+req.params.path).pipe(res)
  }
})*/

app.get('/video/:path', (req, res) => {
  const videoPath = path.join(process.cwd(), "uploads", req.params.path); // Update with your video file path

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(videoPath).pipe(res);
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
