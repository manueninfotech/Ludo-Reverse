import assert from "node:assert/strict";

import {
  hashPassword,
  comparePassword,
} from "../../utils/password.js";

const test = async () => {
  const password = "MySecurePassword123!";

  const passwordHash =
    await hashPassword(password);

  console.log(
    `Generated hash: ${passwordHash}`
  );

  // Hash must not equal the original password.
  assert.notEqual(
    passwordHash,
    password
  );

  // Correct password should match.
  const correctPassword =
    await comparePassword(
      password,
      passwordHash
    );

  assert.equal(
    correctPassword,
    true
  );

  // Wrong password should fail.
  const wrongPassword =
    await comparePassword(
      "WrongPassword123!",
      passwordHash
    );

  assert.equal(
    wrongPassword,
    false
  );

  console.log(
    "✓ password hashing test passed"
  );
};

test().catch((error) => {
  console.error(
    "Password test failed:"
  );
  console.error(error);
  process.exitCode = 1;
});