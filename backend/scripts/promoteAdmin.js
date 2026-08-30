import "../config/environment.js";
import mongoose from "mongoose";
import connectDB from "../db/db.js";
import { User } from "../models/index.js";

const email = String(process.argv[2] || "").trim().toLowerCase();

async function promoteAdmin() {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Usage: npm run admin:promote -- administrator@example.com");
  }

  await connectDB();
  const user = await User.findOneAndUpdate(
    { email },
    { $set: { role: "admin" } },
    { new: true }
  ).select("email role status");
  if (!user) throw new Error(`No user exists with email ${email}`);
  console.log(`Promoted ${user.email} to ${user.role} (status: ${user.status})`);
}

promoteAdmin()
  .then(async () => {
    await mongoose.disconnect();
  })
  .catch(async (error) => {
    console.error("Administrator promotion failed", error.message);
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    process.exitCode = 1;
  });
