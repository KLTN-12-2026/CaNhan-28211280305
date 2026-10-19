import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("connect to DB success");
  } catch (error) {
    console.log("error connecting to DB:", error);
    process.exit(1);
  }
};
