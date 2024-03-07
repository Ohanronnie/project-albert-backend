import { v2 as cloudinary } from "cloudinary";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const cloudUpload = (file, folder) => {
  return new Promise(async (resolve, reject) => {
    const response = await cloudinary.uploader.upload(file, {
      resource_type: "auto",
      folder,
    });
    resolve({
      url: response.secure_url,
      id: response.public_id,
    });
  });
};
