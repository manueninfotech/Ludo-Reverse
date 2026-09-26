import assert from "node:assert/strict";
import mongoose from "mongoose";
import dotenv from "dotenv";

import User from "../../models/User.js";

dotenv.config();

const test = async () => {
  let createdUser = null;

  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");

    createdUser = await User.create({
      username: "testuser",
      email: "testuser@gmail.com",
      passwordHash: "temporary-hash",
      displayName: "Test User",
    });

    console.log("User created");

    assert.ok(createdUser.userId);
    assert.match(
      createdUser.userId,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );

    assert.equal(
      createdUser.username,
      "testuser"
    );

    assert.equal(
      createdUser.email,
      "testuser@gmail.com"
    );

    assert.equal(
      createdUser.isEmailVerified,
      false
    );

    assert.equal(
      createdUser.status,
      "active"
    );

    assert.ok(createdUser.createdAt);
    assert.ok(createdUser.updatedAt);

    console.log(
      `Generated userId: ${createdUser.userId}`
    );

    console.log(
      "✓ user model test passed"
    );
  } catch (error) {
    console.error(
      "User model test failed:"
    );
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (createdUser?._id) {
      await User.deleteOne({
        _id: createdUser._id,
      });
    }

    await mongoose.disconnect();
  }
};

test();