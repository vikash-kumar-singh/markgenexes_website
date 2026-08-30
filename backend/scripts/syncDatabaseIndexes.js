import "../config/environment.js";
import mongoose from "mongoose";
import connectDB from "../db/db.js";
import { AuthToken, Membership, Role, User } from "../models/index.js";

async function syncDatabaseIndexes() {
  await connectDB();
  for (const model of [User, Role, Membership, AuthToken]) {
    const changes = await model.syncIndexes();
    console.log(`${model.modelName} indexes synchronized`, changes);
  }
}

syncDatabaseIndexes()
  .then(async () => {
    await mongoose.disconnect();
    console.log("Database index migration complete");
  })
  .catch(async (error) => {
    console.error("Database index migration failed", error);
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    process.exitCode = 1;
  });
