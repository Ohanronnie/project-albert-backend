import mongoose from "mongoose";
import bcrypt from "bcryptjs";
const userSchema = new mongoose.Schema(
  {
    password: {
      type: String,
      required: true,
      unique: false,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    hasPaid: {
      type: Boolean,
      required: false,
      default: false,
    },
    paymentExpiresIn: {
      type: Date,
      required: false,
    },
    paymentReference: {
      type: String,
      required: false,
    },
    savedClips: [],
    editedVideos: []
  },
  { timestamps: true },
);
userSchema.pre("save", function (next) {
  if (this.isNew || this.isModified("password")) {
    this.password = bcrypt.hashSync(this.password, 10);
  }
  next();
});
export const User = mongoose.model("User", userSchema);
