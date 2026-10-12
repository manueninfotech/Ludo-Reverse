import { friendPresence } from "../../services/friends/friendPresence.js";

const assert = (name, condition) => {
  if (condition) {
    console.log(`✅ PASS: ${name}`);
  } else {
    console.error(`❌ FAIL: ${name}`);
    process.exit(1);
  }
};

console.log("\n========== FRIEND PRESENCE TESTS ==========\n");

assert("New user is offline by default", !friendPresence.isOnline("u1"));

// Add connection
friendPresence.addConnection("u1", "socket_123");
assert("User is online after socket connects", friendPresence.isOnline("u1"));
assert("Socket list has socket_123", friendPresence.getUserSockets("u1").includes("socket_123"));

// Add second socket for same user (e.g. 2 tabs)
friendPresence.addConnection("u1", "socket_456");
assert("User still online with 2 sockets", friendPresence.getUserSockets("u1").length === 2);

// Remove 1 socket
const wentOffline1 = friendPresence.removeConnection("u1", "socket_123");
assert("User is not offline after removing 1 of 2 sockets", !wentOffline1 && friendPresence.isOnline("u1"));

// Remove second socket
const wentOffline2 = friendPresence.removeConnection("u1", "socket_456");
assert("User goes offline after removing last socket", wentOffline2 && !friendPresence.isOnline("u1"));

console.log("\n🎉 All presence tests passed!\n");
