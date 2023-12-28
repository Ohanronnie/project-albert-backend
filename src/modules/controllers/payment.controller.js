import AppError from "../../common/utils/appError.js";
import { catchAsync } from "../../common/utils/errorHandler.js";
import { User } from "../schemas/user.schema.js";
import { axios } from "../../common/utils/helper.js";
import crypto from "crypto";
export const initiatePayment = catchAsync(async (req, res) => {
  const user = await User.findOne({ _id: req.userId });

  if (!user) throw new AppError("Unauthorized", 302);
  const email = user.email;
  const options = {
    method: "POST",
    url: "https://api.paystack.co/transaction/initialize",
    headers: {
      authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "cache-control": "no-cache",
    },
    data: JSON.stringify({
      email,
      amount: 3000*100,
    }),
  };
  try {
    const response = await axios(options);
    const { reference, authorization_url } = response.data.data;
    await User.findOneAndUpdate(
      { _id: req.userId },
      {
        paymentReference: reference,
      },
    );
    return res.status(200).json({
      payment_url: authorization_url,
    });
  } catch (err) {
    console.error(err);
    throw new AppError(err);
  }
});
export const validatePayment = catchAsync(async (req, res) => {
  const user = await User.findOne({ _id: req.userId });
  if (!user.paymentReference)
    throw new AppError("Payment hasn't been made", 302);
  const options = {
    method: "GET",
    url: `https://api.paystack.co/transaction/verify/${encodeURIComponent(
      user.paymentReference,
    )}`,
    headers: {
      authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "cache-control": "no-cache",
    },
  };
  try {
    const response = await axios(options);
    if (!response?.data?.data?.paid_at)
      throw new AppError("Payment hasn't been made", 305);
    else {
      return res.status(200).json(response.data);
    }
  } catch (err) {
    throw new AppError(err);
  }
});

export const paymentWebhook = catchAsync(async (req, res) => {
  const body = req.body;
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const hash = crypto
    .createHmac("sha512", secret)
    .update(JSON.stringify(body))
    .digest("hex");
  console.log(hash);
  if (hash != req.headers["x-paystack-signature"])
    throw new AppError("Unauthorized");
  if (body.event === "charge.success") {
    const email = body.data.customer.email;
    const thisDate = new Date();
    const expiresDate = thisDate.setMonth(thisDate.getMonth() + 1);
    await User.findOneAndUpdate(
      { email },
      {
        hasPaid: true,
        paymentExpiresIn: thisDate,
      },
    );
  }
  return res.status(200).json({});
});
