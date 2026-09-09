// ============================================================
// REVERSE LUDO - DICE LOGIC
// ============================================================
//
// This file is responsible only for dice-related logic.
//
// It does NOT:
// - Change turns
// - Move coins
// - Kill coins
// - Save games to MongoDB
// - Decide winners
//
// Turn and extra-turn logic will be handled separately.
//
// ============================================================


// ============================================================
// ROLL DICE
// ============================================================
//
// Returns a random number between 1 and 6.
//
// Example:
// 1, 2, 3, 4, 5 or 6
// ============================================================

export const rollDice = () => {
  return Math.floor(Math.random() * 6) + 1;
};


// ============================================================
// VALIDATE DICE VALUE
// ============================================================
//
// Checks whether a dice value is valid.
//
// Valid values:
// 1 - 6
// ============================================================

export const isValidDiceValue = (diceValue) => {
  return (
    Number.isInteger(diceValue) &&
    diceValue >= 1 &&
    diceValue <= 6
  );
};


// ============================================================
// CHECK FOR SIX
// ============================================================

export const isSix = (diceValue) => {
  return diceValue === 6;
};


// ============================================================
// CHECK EXTRA TURN FROM DICE
// ============================================================
//
// In Reverse Ludo:
//
// Rolling a 6 gives the player another roll.
//
// IMPORTANT:
// This function only tells us whether a 6 was rolled.
// The actual turn change will be handled by turn.js.
//
// ============================================================

export const getsExtraTurnFromSix = (diceValue) => {
  return isSix(diceValue);
};


// ============================================================
// GET BACKWARD MOVEMENT PERMISSION
// ============================================================
//
// Reverse Ludo rule:
//
// Normal turn:
//     backward movement is allowed.
//
// Extra turn caused by:
//     - rolling 6
//     - killing an opponent
//
// Backward movement is NOT allowed.
//
// ============================================================

export const isBackwardAllowed = ({
  extraTurn = false,
  extraTurnReason = null,
}) => {
  // Extra turns do not allow backward movement.
  if (extraTurn) {
    return false;
  }

  // If there is an explicit extra-turn reason,
  // backward movement should also be disabled.
  if (extraTurnReason === "six") {
    return false;
  }

  if (extraTurnReason === "kill") {
    return false;
  }

  // Normal turn
  return true;
};


// ============================================================
// GET DICE RESULT
// ============================================================
//
// Creates a clean dice result object.
//
// ============================================================

export const createDiceResult = (diceValue) => {
  if (!isValidDiceValue(diceValue)) {
    return {
      valid: false,
      diceValue: null,
      isSix: false,
      extraTurn: false,
    };
  }

  return {
    valid: true,
    diceValue,
    isSix: diceValue === 6,
    extraTurn: diceValue === 6,
  };
};


// ============================================================
// GET RANDOM DICE RESULT
// ============================================================
//
// Rolls the dice and returns the complete result.
//
// ============================================================

export const rollDiceResult = () => {
  const diceValue = rollDice();

  return createDiceResult(diceValue);
};


// ============================================================
// DETERMINE EXTRA TURN REASON
// ============================================================
//
// Possible reasons:
//
// "six"
// "kill"
// null
//
// This does NOT decide whose turn it is.
// It only describes why another roll is available.
// ============================================================

export const getExtraTurnReason = ({
  diceValue = null,
  wasKill = false,
}) => {
  if (wasKill) {
    return "kill";
  }

  if (diceValue === 6) {
    return "six";
  }

  return null;
};


// ============================================================
// GET TURN MOVEMENT RULES
// ============================================================
//
// This gives the turn system the rules associated with
// the current roll.
//
// ============================================================

export const getDiceRules = ({
  diceValue,
  extraTurn = false,
  extraTurnReason = null,
}) => {
  const valid = isValidDiceValue(diceValue);

  if (!valid) {
    return {
      valid: false,
      diceValue: null,
      extraTurn: false,
      extraTurnReason: null,
      backwardAllowed: false,
    };
  }

  return {
    valid: true,
    diceValue,
    extraTurn,
    extraTurnReason,
    backwardAllowed: isBackwardAllowed({
      extraTurn,
      extraTurnReason,
    }),
  };
};