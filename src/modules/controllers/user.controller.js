import AppError from "../../common/utils/appError.js";
import { catchAsync } from "../../common/utils/errorHandler.js";
import { User } from "../schemas/user.schema.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Joi from "joi";
const userValidationSchema = Joi.object().keys({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});
export const createUser = catchAsync(async (req, res) => {
  const {
    value: { email, password },
    error,
  } = userValidationSchema.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 301);
  const emailExist = await User.findOne({ email });
  if (emailExist) throw new AppError("Email already exists", 302);
  const user = new User({
    email,
    password,
  });
  await user.save();
  return res.status(200).json({
    success: true,
  });
});
export const createToken = catchAsync(async (req, res) => {
  const {
    value: { email, password },
    error,
  } = userValidationSchema.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 301);

  const user = await User.findOne({ email });
  if (!user) throw new AppError("Email/Account doesn't exist", 404);
  const isPassValid = bcrypt.compareSync(password, user.password);
  if (!isPassValid) throw new AppError("Incorrect Password", 301);
  const token = jwt.sign(
    {
      id: user._id,
      date: Date.now(),
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "30d",
    },
  );
  return res.status(200).json({ token, id: user._id, success: true });
});
export const getUser = catchAsync(async (req, res) => {
  const userId = req.userId;
  const user = await User.findOne({ _id: userId });
  if (!user) throw new AppError("Error occured somewhere, try relogin");
  const nowDate = new Date();
  const createdAt = new Date(user.createdAt);
  createdAt.setDate(createdAt.getDate() + 7);
  let daysRemain = createdAt.getDate() - nowDate.getDate();
  let response = {
    success: true,
  };
  if (daysRemain < 1) {
    response = { ...response, paymentRequired: true, freeTrialDaysRemain: 0 };
  } else {
    response = {
      ...response,
      paymentRequired: false,
      freeTrialDaysRemain: daysRemain,
    };
  }
  return res.status(200).json({
    ...response,
    success: true,
  });
});
