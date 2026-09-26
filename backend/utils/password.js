import bcrypt from "bcrypt";
import crypto from "node:crypto";

const SALT_ROUNDS = 12;

export const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (
  password,
  passwordHash
) => {
  return bcrypt.compare(
    password,
    passwordHash
  );
};

export const hashRefreshToken = (
  token
) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};