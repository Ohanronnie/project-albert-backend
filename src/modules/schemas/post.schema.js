import mongoose from "mongoose";
const { Schema, model } = mongoose;

const postSchema = new Schema({
  content: {
    type: String,
    required: true,
  },
});
const pageSchema = new Schema({
  pageId: {
    type: String,
    required: true,
  },
  pageToken: {
    type: String,
    required: true,
  },
  pageName: {
    type: String,
    required: true,
  },
  pageCookie: {
    type: String,
    required: true,
  },
  contentType: String,
  ownerId: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
});
export const Post = model("Post", postSchema);
export const Page = model("Page", pageSchema);
