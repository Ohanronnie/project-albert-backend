import AppError from "../../common/utils/appError.js";
import { catchAsync } from "../../common/utils/errorHandler.js";
import { User } from "../schemas/user.schema.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Joi from "joi";
import axios from "axios";
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
  const ip = req.headers["x-forwarded-for"]?.[0];
  const user = await User.findOne({ email });
  let countryCode;
  if (ip) {
    const response = await axios.get("http://ip-api.com/json/" + ip);
    if (response.data.countryCode) countryCode = response.data.countryCode;
  }
  if (!user) throw new AppError("Email/Account doesn't exist", 404);
  const isPassValid = bcrypt.compareSync(password, user.password);
  countryCode &&
    (await User.findOneAndUpdate({ email, password }, { countryCode }));
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
  const todayDate = new Date();
  const accountCreatedAt = new Date(user.createdAt);
  // check if the user has paid/subscribed

  if (user.hasPaid) {
    if (user.paymentExpiresIn < todayDate) {
      return res.status(200).json({
        success: true,
        paymentRequired: true,
        paymentExpiredOn: user.paymentExpiresIn,
      });
    } else {
      return res.status(200).json({
        success: true,
        paymentRequired: false,
        paymentExpiresOn: user.paymentExpiresIn,
      });
    }
  } else {
    accountCreatedAt.setDate(accountCreatedAt.getDate() + 7);
    if (accountCreatedAt < todayDate) {
      return res.status(200).json({
        success: true,
        paymentRequired: true,
        freeTrialExpiredOn: accountCreatedAt,
      });
    } else {
      return res.status(200).json({
        success: true,
        paymentRequired: false,
        freeTrialExpiredOn: accountCreatedAt,
      });
    }
  }
  /*const nowDate = new Date();
  const createdAt = new Date(user.createdAt);
  createdAt.setDate(createdAt.getDate() + 7);
  let daysRemain = createdAt.getDate() - nowDate.getDate();
  const payment_date = new Date(user.paymentExpiresIn);
  const needPayment = nowDate.getDate() > payment_date.getDate();
  let response = {
    success: true,
  };
  if(user.paymentExpiresIn && needPayment){
    response = { ...response, payment_required: true, free_trial_days: 0, payment_expired: payment_date };
  } else if(user.paymentExpiresIn && !needPayment){
  response = { ...response, payment_required: false, free_trial_days: 0, payment_expires_in: user.paymentExpiresIn };
  }
  else if (daysRemain < 1) {
    response = { ...response, payment_required: true, free_trial_days: 0 };
  } else {
    response = {
      ...response,
      payment_required: false,
      free_trial_days: daysRemain,
    };
  }*/

  /*  console.log(response)
    return res.status(200).json({
    ...response,
    success: true,
  });*/
});
