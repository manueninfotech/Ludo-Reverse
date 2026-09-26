// ============================================================
// REVERSE LUDO - DICE TESTS
// ============================================================
//
// These tests verify:
// - Dice generation
// - Dice validation
// - Rolling a 6
// - Extra-turn detection
// - Backward movement permission
// - Dice result creation
// - Extra-turn reasons
// - Dice rule generation
//
// ============================================================

import {
  rollDice,
  isValidDiceValue,
  isSix,
  getsExtraTurnFromSix,
  isBackwardAllowed,
  createDiceResult,
  rollDiceResult,
  getExtraTurnReason,
  getDiceRules,
} from "../../services/game/dice.js";


// ============================================================
// TEST HELPERS
// ============================================================

let passed = 0;
let failed = 0;

const test = (name, condition) => {
  if (condition) {
    console.log(`✅ PASS: ${name}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${name}`);
    failed++;
  }
};


// ============================================================
// 1. ROLL DICE TESTS
// ============================================================

console.log("\n========== ROLL DICE TESTS ==========\n");

let allRollsValid = true;

for (let i = 0; i < 1000; i++) {
  const result = rollDice();

  if (
    !Number.isInteger(result) ||
    result < 1 ||
    result > 6
  ) {
    allRollsValid = false;
    break;
  }
}

test(
  "1000 dice rolls always produce values from 1 to 6",
  allRollsValid
);


// ============================================================
// 2. DICE VALUE VALIDATION
// ============================================================

console.log("\n========== DICE VALIDATION TESTS ==========\n");

test(
  "Dice value 1 is valid",
  isValidDiceValue(1) === true
);

test(
  "Dice value 2 is valid",
  isValidDiceValue(2) === true
);

test(
  "Dice value 3 is valid",
  isValidDiceValue(3) === true
);

test(
  "Dice value 4 is valid",
  isValidDiceValue(4) === true
);

test(
  "Dice value 5 is valid",
  isValidDiceValue(5) === true
);

test(
  "Dice value 6 is valid",
  isValidDiceValue(6) === true
);

test(
  "Dice value 0 is invalid",
  isValidDiceValue(0) === false
);

test(
  "Dice value 7 is invalid",
  isValidDiceValue(7) === false
);

test(
  "Negative dice value is invalid",
  isValidDiceValue(-1) === false
);

test(
  "Decimal dice value is invalid",
  isValidDiceValue(3.5) === false
);

test(
  "String dice value is invalid",
  isValidDiceValue("6") === false
);

test(
  "Null dice value is invalid",
  isValidDiceValue(null) === false
);

test(
  "Undefined dice value is invalid",
  isValidDiceValue(undefined) === false
);


// ============================================================
// 3. SIX DETECTION
// ============================================================

console.log("\n========== SIX DETECTION TESTS ==========\n");

test(
  "Dice value 6 is detected as six",
  isSix(6) === true
);

test(
  "Dice value 5 is not six",
  isSix(5) === false
);

test(
  "Dice value 1 is not six",
  isSix(1) === false
);


// ============================================================
// 4. EXTRA TURN FROM SIX
// ============================================================

console.log("\n========== EXTRA TURN TESTS ==========\n");

test(
  "Rolling 6 gives an extra turn",
  getsExtraTurnFromSix(6) === true
);

test(
  "Rolling 5 does not give an extra turn",
  getsExtraTurnFromSix(5) === false
);

test(
  "Rolling 1 does not give an extra turn",
  getsExtraTurnFromSix(1) === false
);


// ============================================================
// 5. BACKWARD MOVEMENT PERMISSION
// ============================================================

console.log("\n========== BACKWARD PERMISSION TESTS ==========\n");

test(
  "Normal turn allows backward movement",
  isBackwardAllowed({
    extraTurn: false,
    extraTurnReason: null,
  }) === true
);

test(
  "Extra turn from six does not allow backward movement",
  isBackwardAllowed({
    extraTurn: true,
    extraTurnReason: "six",
  }) === false
);

test(
  "Extra turn from kill does not allow backward movement",
  isBackwardAllowed({
    extraTurn: true,
    extraTurnReason: "kill",
  }) === false
);

test(
  "Explicit six reason blocks backward movement",
  isBackwardAllowed({
    extraTurn: false,
    extraTurnReason: "six",
  }) === false
);

test(
  "Explicit kill reason blocks backward movement",
  isBackwardAllowed({
    extraTurn: false,
    extraTurnReason: "kill",
  }) === false
);


// ============================================================
// 6. CREATE DICE RESULT
// ============================================================

console.log("\n========== DICE RESULT TESTS ==========\n");

const resultOne = createDiceResult(1);

test(
  "Dice result for 1 is valid",
  resultOne.valid === true
);

test(
  "Dice result contains value 1",
  resultOne.diceValue === 1
);

test(
  "Dice result for 1 is not six",
  resultOne.isSix === false
);

test(
  "Dice result for 1 has no extra turn",
  resultOne.extraTurn === false
);


const resultSix = createDiceResult(6);

test(
  "Dice result for 6 is valid",
  resultSix.valid === true
);

test(
  "Dice result contains value 6",
  resultSix.diceValue === 6
);

test(
  "Dice result for 6 is detected as six",
  resultSix.isSix === true
);

test(
  "Dice result for 6 gives extra turn",
  resultSix.extraTurn === true
);


// ============================================================
// 7. INVALID DICE RESULT
// ============================================================

console.log("\n========== INVALID DICE RESULT TESTS ==========\n");

const invalidResult = createDiceResult(7);

test(
  "Invalid dice result is marked invalid",
  invalidResult.valid === false
);

test(
  "Invalid dice result has null value",
  invalidResult.diceValue === null
);

test(
  "Invalid dice result is not six",
  invalidResult.isSix === false
);

test(
  "Invalid dice result has no extra turn",
  invalidResult.extraTurn === false
);


// ============================================================
// 8. RANDOM DICE RESULT
// ============================================================

console.log("\n========== RANDOM DICE RESULT TESTS ==========\n");

let randomResultsValid = true;

for (let i = 0; i < 1000; i++) {
  const result = rollDiceResult();

  if (
    result.valid !== true ||
    !isValidDiceValue(result.diceValue)
  ) {
    randomResultsValid = false;
    break;
  }

  if (result.isSix !== (result.diceValue === 6)) {
    randomResultsValid = false;
    break;
  }

  if (result.extraTurn !== (result.diceValue === 6)) {
    randomResultsValid = false;
    break;
  }
}

test(
  "1000 random dice results are valid",
  randomResultsValid
);


// ============================================================
// 9. EXTRA TURN REASON
// ============================================================

console.log("\n========== EXTRA TURN REASON TESTS ==========\n");

test(
  "Rolling 6 gives reason six",
  getExtraTurnReason({
    diceValue: 6,
    wasKill: false,
  }) === "six"
);

test(
  "Normal roll gives no extra-turn reason",
  getExtraTurnReason({
    diceValue: 5,
    wasKill: false,
  }) === null
);

test(
  "Kill gives reason kill",
  getExtraTurnReason({
    diceValue: 3,
    wasKill: true,
  }) === "kill"
);


// ============================================================
// 10. KILL HAS PRIORITY
// ============================================================
//
// If a player rolls 6 AND kills an opponent,
// the reason returned here should be "kill".
//
// Turn handling will be decided later.
// ============================================================

test(
  "Kill reason takes priority when dice is also 6",
  getExtraTurnReason({
    diceValue: 6,
    wasKill: true,
  }) === "kill"
);


// ============================================================
// 11. DICE RULES
// ============================================================

console.log("\n========== DICE RULE TESTS ==========\n");

const normalRules = getDiceRules({
  diceValue: 4,
  extraTurn: false,
  extraTurnReason: null,
});

test(
  "Normal dice rules are valid",
  normalRules.valid === true
);

test(
  "Normal dice value is preserved",
  normalRules.diceValue === 4
);

test(
  "Normal turn allows backward movement",
  normalRules.backwardAllowed === true
);

test(
  "Normal turn has no extra turn",
  normalRules.extraTurn === false
);


const sixRules = getDiceRules({
  diceValue: 6,
  extraTurn: true,
  extraTurnReason: "six",
});

test(
  "Six-turn rules are valid",
  sixRules.valid === true
);

test(
  "Six-turn value is preserved",
  sixRules.diceValue === 6
);

test(
  "Six-turn has extra turn",
  sixRules.extraTurn === true
);

test(
  "Six-turn does not allow backward movement",
  sixRules.backwardAllowed === false
);

test(
  "Six-turn reason is six",
  sixRules.extraTurnReason === "six"
);


const killRules = getDiceRules({
  diceValue: 3,
  extraTurn: true,
  extraTurnReason: "kill",
});

test(
  "Kill-turn rules are valid",
  killRules.valid === true
);

test(
  "Kill-turn does not allow backward movement",
  killRules.backwardAllowed === false
);

test(
  "Kill-turn reason is kill",
  killRules.extraTurnReason === "kill"
);


// ============================================================
// 12. INVALID DICE RULES
// ============================================================

console.log("\n========== INVALID DICE RULE TESTS ==========\n");

const invalidRules = getDiceRules({
  diceValue: 9,
  extraTurn: false,
  extraTurnReason: null,
});

test(
  "Invalid dice rules are marked invalid",
  invalidRules.valid === false
);

test(
  "Invalid dice rules have null dice value",
  invalidRules.diceValue === null
);

test(
  "Invalid dice rules do not allow backward movement",
  invalidRules.backwardAllowed === false
);

test(
  "Invalid dice rules have no extra turn",
  invalidRules.extraTurn === false
);


// ============================================================
// FINAL RESULT
// ============================================================

console.log("\n========================================");
console.log(`Tests passed: ${passed}`);
console.log(`Tests failed: ${failed}`);
console.log("========================================\n");

if (failed > 0) {
  process.exit(1);
}

console.log("🎉 All dice tests passed!");