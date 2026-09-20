import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { ROLES } from "../constants/roles.js";

export const createSubAdmin = async ({
  name,
  username,
  email,
  password,
  createdBy,
}) => {
  const existingUser = await User.findOne({
    username: username.toLowerCase(),
  });

  if (existingUser) {
    throw new ApiError(
      409,
      "Username already exists"
    );
  }

  if (email) {
    const emailExists = await User.findOne({
      email: email.toLowerCase(),
    });

    if (emailExists) {
      throw new ApiError(
        409,
        "Email already exists"
      );
    }
  }

  const user = await User.create({
    name,
    username: username.toLowerCase(),
    email: email || null,
    password,
    role: ROLES.SUB_ADMIN,
    createdBy,
  });

  return user.toSafeObject();
};

export const getSubAdmins = async () => {
  return User.find({
    role: ROLES.SUB_ADMIN,
  })
    .select("-password")
    .sort({ createdAt: -1 });
};

export const getSubAdminById = async (id) => {
  const user = await User.findOne({
    _id: id,
    role: ROLES.SUB_ADMIN,
  });

  if (!user) {
    throw new ApiError(
      404,
      "Sub Admin not found"
    );
  }

  return user;
};

export const updateSubAdmin = async (
  id,
  data
) => {
  const user = await getSubAdminById(id);

  if (data.name !== undefined) {
    user.name = data.name;
  }

  if (data.email !== undefined) {
    if (data.email) {
      const emailExists = await User.findOne({
        email: data.email.toLowerCase(),
        _id: { $ne: user._id },
      });

      if (emailExists) {
        throw new ApiError(
          409,
          "Email already exists"
        );
      }

      user.email =
        data.email.toLowerCase();
    } else {
      user.email = null;
    }
  }

  await user.save();

  return user.toSafeObject();
};

export const updateSubAdminStatus = async (
  id,
  isActive
) => {
  const user = await getSubAdminById(id);

  user.isActive = isActive;

  await user.save();

  return user.toSafeObject();
};

export const resetSubAdminPassword = async (
  id,
  password
) => {
  const user = await getSubAdminById(id);

  user.password = password;

  await user.save();

  return true;
};