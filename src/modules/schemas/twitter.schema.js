import mongoose from "mongoose";
const { Schema, model } = mongoose;

const twitterSchema = new Schema({
  twitterAccessToken: {
    type: String,
    required: true,
  },
  twitterAccessSecret: {
    type: String,
    required: true,
  },
  twitterName: {
    type: String,
    required: true,
  },
  contentType: String,
  country: String,
  language: String,
  ownerId: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
});
export const TwitterSchema = model('Twitter', twitterSchema);