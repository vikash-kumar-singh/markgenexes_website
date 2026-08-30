import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

function getConnectionUri() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is required");
  }

  try {
    const parsed = new URL(uri);
    if (!parsed.pathname || parsed.pathname === "/") {
      parsed.pathname = `/${DB_NAME}`;
    }
    return parsed.toString();
  } catch {
    return uri.endsWith("/") ? `${uri}${DB_NAME}` : `${uri}/${DB_NAME}`;
  }
}

const connectDB = async () => {
  mongoose.set("strictQuery", true);
  const connection = await mongoose.connect(getConnectionUri(), {
    serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000),
    maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 20),
    minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 0),
  });
  console.log("Connected to MongoDB, Database:", connection.connection.name);
  return connection;
};

export default connectDB;
