import User from "../models/User.js";
import { ROLES } from "../constants/roles.js";
import { env } from "../config/env.js";
import logger from "../config/logger.js";

export const bootstrapSuperAdmin = async () => {
  const { name, username, password, email } = env.superAdmin;

  if (!username || !password || !name) {
    logger.warn(
      "Super Admin bootstrap skipped because credentials are missing"
    );
    return;
  }

  const existingSuperAdmin = await User.findOne({
    role: ROLES.SUPER_ADMIN,
  });

  if (existingSuperAdmin) {
    logger.info("Super Admin already exists");
    return;
  }

  const usernameTaken = await User.findOne({
    username: username.toLowerCase(),
  });

  if (usernameTaken) {
    throw new Error(
      "Configured Super Admin username already belongs to another user"
    );
  }

  const superAdmin = await User.create({
    name,
    username: username.toLowerCase(),
    email: email || null,
    password,
    role: ROLES.SUPER_ADMIN,
  });

  logger.info(
    {
      userId: superAdmin._id.toString(),
      username: superAdmin.username,
    },
    "Initial Super Admin created"
  );
};