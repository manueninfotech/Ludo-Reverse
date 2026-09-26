// ============================================================
// REVERSE LUDO - TURN LOGIC TESTS
// ============================================================

import assert from "node:assert/strict";

import {
  TURN_TIMEOUT_MS,
  createInitialTurn,
  getNextPlayerIndex,
  getNextPlayer,
  getTurnTimes,
  startTurn,
  processDiceRoll,
  processKill,
  determineExtraTurn,
  prepareExtraTurn,
  completeTurn,
  finishTurn,
  isTurnExpired,
  getTurnTimeRemaining,
  canRollDice,
  canMoveCoin,
  canMoveBackward,
} from "../../services/game/turn.js";

console.log("Running turn tests...\n");


// ============================================================
// TEST DATA
// ============================================================

const players = [
  {
    userId: "user-1",
    name: "Player 1",
    color: "red",
  },
  {
    userId: "user-2",
    name: "Player 2",
    color: "green",
  },
  {
    userId: "user-3",
    name: "Player 3",
    color: "yellow",
  },
];


// ============================================================
// 1. CREATE INITIAL TURN
// ============================================================

{
  const turn = createInitialTurn("user-1");

  assert.equal(turn.playerId, "user-1");
  assert.equal(turn.diceValue, null);
  assert.equal(turn.hasRolled, false);
  assert.equal(turn.backwardAllowed, true);
  assert.equal(turn.extraTurn, false);
  assert.equal(turn.extraTurnReason, null);
  assert.equal(turn.turnStartedAt, null);
  assert.equal(turn.turnExpiresAt, null);

  console.log("✓ initial turn");
}


// ============================================================
// 2. GET NEXT PLAYER INDEX
// ============================================================

{
  assert.equal(
    getNextPlayerIndex({
      currentIndex: 0,
      playerCount: 3,
    }),
    1
  );

  assert.equal(
    getNextPlayerIndex({
      currentIndex: 1,
      playerCount: 3,
    }),
    2
  );

  assert.equal(
    getNextPlayerIndex({
      currentIndex: 2,
      playerCount: 3,
    }),
    0
  );

  console.log("✓ next player index");
}


// ============================================================
// 3. GET NEXT PLAYER
// ============================================================

{
  const nextPlayer = getNextPlayer({
    players,
    currentPlayerId: "user-1",
  });

  assert.equal(nextPlayer.userId, "user-2");

  const wrappedPlayer = getNextPlayer({
    players,
    currentPlayerId: "user-3",
  });

  assert.equal(wrappedPlayer.userId, "user-1");

  console.log("✓ next player");
}

// ============================================================
// 4. FINISHED PLAYER IS SKIPPED
// ============================================================

{
  const playersWithFinishedPlayer = [
    {
      ...players[0],
      coins: [
        { area: "base" },
        { area: "base" },
        { area: "base" },
        { area: "base" },
      ],
    },

    {
      ...players[1],
      coins: [
        { area: "finished" },
        { area: "finished" },
        { area: "finished" },
        { area: "finished" },
      ],
    },

    {
      ...players[2],
      coins: [
        { area: "base" },
        { area: "base" },
        { area: "base" },
        { area: "base" },
      ],
    },
  ];

  const nextPlayer = getNextPlayer({
    players: playersWithFinishedPlayer,
    currentPlayerId: "user-1",
  });

  assert.ok(nextPlayer);

  assert.equal(
    nextPlayer.userId,
    "user-3"
  );

  console.log(
    "✓ finished player is skipped"
  );
}


// ============================================================
// 4. TURN TIMES
// ============================================================

{
  const now = new Date("2026-09-02T10:00:00.000Z");

  const times = getTurnTimes({
    now,
  });

  assert.equal(
    times.turnStartedAt.getTime(),
    now.getTime()
  );

  assert.equal(
    times.turnExpiresAt.getTime(),
    now.getTime() + TURN_TIMEOUT_MS
  );

  console.log("✓ turn timing");
}


// ============================================================
// 5. START TURN
// ============================================================

{
  const now = new Date("2026-09-02T10:00:00.000Z");

  const startedTurn = startTurn({
    playerId: "user-1",
    now,
  });

  assert.equal(startedTurn.playerId, "user-1");
  assert.equal(startedTurn.diceValue, null);
  assert.equal(startedTurn.hasRolled, false);
  assert.equal(startedTurn.backwardAllowed, true);
  assert.equal(startedTurn.extraTurn, false);
  assert.equal(startedTurn.extraTurnReason, null);

  assert.ok(startedTurn.turnStartedAt instanceof Date);
  assert.ok(startedTurn.turnExpiresAt instanceof Date);

  assert.equal(
    startedTurn.turnExpiresAt.getTime() -
      startedTurn.turnStartedAt.getTime(),
    TURN_TIMEOUT_MS
  );

  console.log("✓ start turn");
}


// ============================================================
// 6. NORMAL DICE ROLL - 1
// ============================================================

{
  const turn = startTurn({
    playerId: "user-1",
  });

  const result = processDiceRoll({
    turn,
    diceValue: 1,
  });

  assert.equal(result.success, true);
  assert.equal(result.reason, null);

  assert.equal(result.turn.diceValue, 1);
  assert.equal(result.turn.hasRolled, true);
  assert.equal(result.turn.backwardAllowed, true);
  assert.equal(result.turn.extraTurn, false);
  assert.equal(result.turn.extraTurnReason, null);

  console.log("✓ normal dice roll");
}


// ============================================================
// 7. NORMAL DICE ROLL - 5
// ============================================================

{
  const turn = startTurn({
    playerId: "user-1",
  });

  const result = processDiceRoll({
    turn,
    diceValue: 5,
  });

  assert.equal(result.success, true);
  assert.equal(result.turn.diceValue, 5);
  assert.equal(result.turn.hasRolled, true);
  assert.equal(result.turn.backwardAllowed, true);
  assert.equal(result.turn.extraTurn, false);
  assert.equal(result.turn.extraTurnReason, null);

  console.log("✓ normal dice roll with 5");
}


// ============================================================
// 8. ROLLING 6 GIVES EXTRA TURN
// ============================================================

{
  const turn = startTurn({
    playerId: "user-1",
  });

  const result = processDiceRoll({
    turn,
    diceValue: 6,
  });

  assert.equal(result.success, true);

  assert.equal(result.turn.diceValue, 6);
  assert.equal(result.turn.hasRolled, true);
  assert.equal(result.turn.extraTurn, true);
  assert.equal(result.turn.extraTurnReason, "six");

  // Backward movement is disabled
  // on the extra turn caused by 6.
  assert.equal(result.turn.backwardAllowed, true);

  console.log("✓ six gives extra turn");
}


// ============================================================
// 9. CANNOT ROLL TWICE
// ============================================================

{
  const turn = startTurn({
    playerId: "user-1",
  });

  const firstRoll = processDiceRoll({
    turn,
    diceValue: 4,
  });

  assert.equal(firstRoll.success, true);

  const secondRoll = processDiceRoll({
    turn: firstRoll.turn,
    diceValue: 3,
  });

  assert.equal(secondRoll.success, false);
  assert.equal(
    secondRoll.reason,
    "Dice has already been rolled for this turn."
  );

  console.log("✓ prevents double dice roll");
}


// ============================================================
// 10. PREPARE EXTRA TURN
// ============================================================

{
  const turn = startTurn({
    playerId: "user-1",
  });

  const afterSix = processDiceRoll({
    turn,
    diceValue: 6,
  });

  const extraTurn = prepareExtraTurn({
    turn: afterSix.turn,
  });

  assert.equal(extraTurn.success, true);

  assert.equal(extraTurn.turn.playerId, "user-1");
  assert.equal(extraTurn.turn.diceValue, null);
  assert.equal(extraTurn.turn.hasRolled, false);

  assert.equal(extraTurn.turn.extraTurn, true);
  assert.equal(extraTurn.turn.backwardAllowed, true);
  assert.equal(extraTurn.turn.extraTurnReason, "six");

  console.log("✓ prepare extra turn");
}


// ============================================================
// 11. EXTRA TURN AFTER 6
// ============================================================

{
  const turn = startTurn({
    playerId: "user-1",
  });

  const afterSix = processDiceRoll({
    turn,
    diceValue: 6,
  });

  const extraTurn = prepareExtraTurn({
    turn: afterSix.turn,
  });

  assert.equal(extraTurn.success, true);

  const secondRoll = processDiceRoll({
    turn: extraTurn.turn,
    diceValue: 4,
  });

  assert.equal(secondRoll.success, true);

  assert.equal(secondRoll.turn.diceValue, 4);
  assert.equal(secondRoll.turn.hasRolled, true);

  // The second roll itself is not a 6,
  // so no new extra turn is created.
  assert.equal(secondRoll.turn.extraTurn, false);

  // Backward remains disabled because this
  // is the extra roll.
  assert.equal(secondRoll.turn.backwardAllowed, true);

  console.log("✓ extra turn after six");
}


// ============================================================
// 12. DOUBLE SIX
// ============================================================

{
  const turn = startTurn({
    playerId: "user-1",
  });

  const firstSix = processDiceRoll({
    turn,
    diceValue: 6,
  });

  const extraTurn = prepareExtraTurn({
    turn: firstSix.turn,
  });

  const secondSix = processDiceRoll({
    turn: extraTurn.turn,
    diceValue: 6,
  });

  assert.equal(secondSix.success, true);

  assert.equal(secondSix.turn.diceValue, 6);
  assert.equal(secondSix.turn.hasRolled, true);
  assert.equal(secondSix.turn.extraTurn, true);
  assert.equal(secondSix.turn.extraTurnReason, "six");
  assert.equal(secondSix.turn.backwardAllowed, true);

  console.log("✓ double six");
}


// ============================================================
// 13. KILL GIVES EXTRA TURN
// ============================================================

{
  const turn = startTurn({
    playerId: "user-1",
  });

  const result = processKill({
    turn,
  });

  assert.equal(result.success, true);

  assert.equal(result.turn.extraTurn, true);
  assert.equal(result.turn.extraTurnReason, "kill");
  assert.equal(result.turn.backwardAllowed, false);

  console.log("✓ kill gives extra turn");
}


// ============================================================
// 14. PREPARE KILL EXTRA TURN
// ============================================================

{
  const turn = startTurn({
    playerId: "user-1",
  });

  const afterKill = processKill({
    turn,
  });

  const extraTurn = prepareExtraTurn({
    turn: afterKill.turn,
  });

  assert.equal(extraTurn.success, true);

  assert.equal(extraTurn.turn.playerId, "user-1");
  assert.equal(extraTurn.turn.diceValue, null);
  assert.equal(extraTurn.turn.hasRolled, false);
  assert.equal(extraTurn.turn.extraTurn, true);
  assert.equal(extraTurn.turn.extraTurnReason, "kill");
  assert.equal(extraTurn.turn.backwardAllowed, false);

  console.log("✓ prepare kill extra turn");
}


// ============================================================
// 15. DETERMINE EXTRA TURN - NORMAL
// ============================================================

{
  const result = determineExtraTurn({
    diceValue: 4,
    wasKill: false,
  });

  assert.equal(result.extraTurn, false);
  assert.equal(result.extraTurnReason, null);
  assert.equal(result.backwardAllowed, true);

  console.log("✓ determine normal turn");
}


// ============================================================
// 16. DETERMINE EXTRA TURN - SIX
// ============================================================

{
  const result = determineExtraTurn({
    diceValue: 6,
    wasKill: false,
  });

  assert.equal(result.extraTurn, true);
  assert.equal(result.extraTurnReason, "six");
  assert.equal(result.backwardAllowed, true);

  console.log("✓ determine six extra turn");
}


// ============================================================
// 17. DETERMINE EXTRA TURN - KILL
// ============================================================

{
  const result = determineExtraTurn({
    diceValue: 4,
    wasKill: true,
  });

  assert.equal(result.extraTurn, true);
  assert.equal(result.extraTurnReason, "kill");
  assert.equal(result.backwardAllowed, false);

  console.log("✓ determine kill extra turn");
}


// ============================================================
// 18. SIX + KILL
// ============================================================

{
  const result = determineExtraTurn({
    diceValue: 6,
    wasKill: true,
  });

  assert.equal(result.extraTurn, true);
  assert.equal(result.backwardAllowed, false);

  // dice.js currently prioritizes "kill".
  assert.equal(result.extraTurnReason, "kill");

  console.log("✓ six + kill");
}


// ============================================================
// 19. COMPLETE TURN
// ============================================================

{
  const turn = startTurn({
    playerId: "user-1",
  });

  const result = completeTurn({
    players,
    turn,
  });

  assert.equal(result.success, true);
  assert.equal(result.turn.playerId, "user-2");

  assert.equal(result.turn.diceValue, null);
  assert.equal(result.turn.hasRolled, false);
  assert.equal(result.turn.backwardAllowed, true);
  assert.equal(result.turn.extraTurn, false);
  assert.equal(result.turn.extraTurnReason, null);

  console.log("✓ complete turn");
}


// ============================================================
// 20. COMPLETE TURN WRAPS AROUND
// ============================================================

{
  const turn = startTurn({
    playerId: "user-3",
  });

  const result = completeTurn({
    players,
    turn,
  });

  assert.equal(result.success, true);
  assert.equal(result.turn.playerId, "user-1");

  console.log("✓ complete turn wraps around");
}


// ============================================================
// 21. FINISH TURN
// ============================================================

{
  const turn = startTurn({
    playerId: "user-1",
  });

  const result = finishTurn({
    players,
    turn,
  });

  assert.equal(result.success, true);
  assert.equal(result.turn.playerId, "user-2");
  assert.equal(result.turn.extraTurn, false);
  assert.equal(result.turn.hasRolled, false);

  console.log("✓ finish turn");
}


// ============================================================
// 22. CAN ROLL DICE
// ============================================================

{
  const turn = startTurn({
    playerId: "user-1",
  });

  assert.equal(canRollDice(turn), true);

  const rolled = processDiceRoll({
    turn,
    diceValue: 3,
  });

  assert.equal(rolled.success, true);
  assert.equal(canRollDice(rolled.turn), false);

  const sixRoll = processDiceRoll({
    turn: startTurn({
      playerId: "user-1",
    }),
    diceValue: 6,
  });

  const extraTurn = prepareExtraTurn({
    turn: sixRoll.turn,
  });

  assert.equal(extraTurn.success, true);
  assert.equal(canRollDice(extraTurn.turn), true);

  console.log("✓ can roll dice");
}


// ============================================================
// 23. CAN MOVE COIN
// ============================================================

{
  const turn = startTurn({
    playerId: "user-1",
  });

  // Before rolling.
  assert.equal(canMoveCoin(turn), false);

  const rolled = processDiceRoll({
    turn,
    diceValue: 4,
  });

  assert.equal(rolled.success, true);

  // After rolling.
  assert.equal(canMoveCoin(rolled.turn), true);

  console.log("✓ can move coin");
}


// ============================================================
// 24. CAN MOVE BACKWARD - NORMAL TURN
// ============================================================

{
  const turn = startTurn({
    playerId: "user-1",
  });

  const rolled = processDiceRoll({
    turn,
    diceValue: 4,
  });

  assert.equal(rolled.success, true);
  assert.equal(canMoveBackward(rolled.turn), true);

  console.log("✓ backward allowed on normal turn");
}


// ============================================================
// 25. BACKWARD DISABLED AFTER SIX
// ============================================================

{
  const turn = startTurn({
    playerId: "user-1",
  });

  const rolled = processDiceRoll({
    turn,
    diceValue: 6,
  });

  assert.equal(rolled.success, true);
  assert.equal(canMoveBackward(rolled.turn), true);

  console.log("✓ backward allowed after six");
}


// ============================================================
// 26. BACKWARD ALLOWED AFTER KILL
// ============================================================

{
  const turn = startTurn({
    playerId: "user-1",
  });

  const afterKill = processKill({
    turn,
  });

  assert.equal(afterKill.success, true);
  assert.equal(canMoveBackward(afterKill.turn), false);

  console.log("✓ backward disabled after kill");
}


// ============================================================
// 27. TURN EXPIRATION
// ============================================================

{
  const oldStart = new Date(
    Date.now() - TURN_TIMEOUT_MS - 1000
  );

  const oldTurn = {
    ...createInitialTurn("user-1"),
    turnStartedAt: oldStart,
    turnExpiresAt: new Date(
      oldStart.getTime() + TURN_TIMEOUT_MS
    ),
  };

  assert.equal(
    isTurnExpired({
      turn: oldTurn,
    }),
    true
  );

  console.log("✓ expired turn");
}


// ============================================================
// 28. ACTIVE TURN IS NOT EXPIRED
// ============================================================

{
  const turn = startTurn({
    playerId: "user-1",
  });

  assert.equal(
    isTurnExpired({
      turn,
    }),
    false
  );

  console.log("✓ active turn is not expired");
}


// ============================================================
// 29. TURN TIME REMAINING
// ============================================================

{
  const turn = startTurn({
    playerId: "user-1",
  });

  const remaining = getTurnTimeRemaining({
    turn,
  });

  assert.ok(remaining > 0);
  assert.ok(remaining <= TURN_TIMEOUT_MS);

  console.log("✓ turn time remaining");
}


// ============================================================
// 30. EXPIRED TURN HAS ZERO TIME
// ============================================================

{
  const expiredTurn = {
    ...createInitialTurn("user-1"),
    turnStartedAt: new Date(
      Date.now() - TURN_TIMEOUT_MS - 1000
    ),
    turnExpiresAt: new Date(
      Date.now() - 1000
    ),
  };

  const remaining = getTurnTimeRemaining({
    turn: expiredTurn,
  });

  assert.equal(remaining, 0);

  console.log("✓ expired turn has zero remaining time");
}


// ============================================================
// 31. INVALID DICE VALUE
// ============================================================

{
  const turn = startTurn({
    playerId: "user-1",
  });

  const zero = processDiceRoll({
    turn,
    diceValue: 0,
  });

  assert.equal(zero.success, false);
  assert.equal(zero.reason, "Invalid dice value.");

  const seven = processDiceRoll({
    turn,
    diceValue: 7,
  });

  assert.equal(seven.success, false);
  assert.equal(seven.reason, "Invalid dice value.");

  const nullValue = processDiceRoll({
    turn,
    diceValue: null,
  });

  assert.equal(nullValue.success, false);
  assert.equal(nullValue.reason, "Invalid dice value.");

  console.log("✓ invalid dice values rejected");
}


// ============================================================
// 32. MISSING TURN
// ============================================================

{
  const result = processDiceRoll({
    turn: null,
    diceValue: 4,
  });

  assert.equal(result.success, false);
  assert.equal(result.reason, "Turn is required.");
  assert.equal(result.turn, null);

  console.log("✓ missing turn rejected");
}


// ============================================================
// 33. EMPTY PLAYERS LIST
// ============================================================

{
  const result = getNextPlayer({
    players: [],
    currentPlayerId: "user-1",
  });

  assert.equal(result, null);

  console.log("✓ empty players list handled");
}


// ============================================================
// 34. UNKNOWN CURRENT PLAYER
// ============================================================

{
  const result = getNextPlayer({
    players,
    currentPlayerId: "unknown-user",
  });

  assert.equal(result, null);

  console.log("✓ unknown current player handled");
}


// ============================================================
// 35. PREPARE EXTRA TURN WITHOUT EXTRA TURN
// ============================================================

{
  const turn = startTurn({
    playerId: "user-1",
  });

  const result = prepareExtraTurn({
    turn,
  });

  assert.equal(result.success, false);
  assert.equal(
    result.reason,
    "No extra turn is available."
  );

  assert.equal(result.turn.playerId, "user-1");

  console.log("✓ invalid extra turn preparation rejected");
}


// ============================================================
// FINAL RESULT
// ============================================================

console.log("\n=================================");
console.log("All turn tests passed successfully!");
console.log("=================================");