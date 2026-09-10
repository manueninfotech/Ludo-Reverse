import React from "react";

const BOARD_SIZE = 15;

// ============================================================
// MAIN TRACK
// ============================================================
// 52 shared cells for the standard 4-color board.
//
// The logical numbering must remain:
//
// Red    start = 0
// Green  start = 13
// Yellow start = 26
// Blue   start = 39
//
// These coordinates are the visual board coordinates.
// ============================================================

const PATH_COORDINATES = [
  // ----------------------------------------------------------
  // LEFT -> TOP
  // ----------------------------------------------------------

  [6, 1],  // 0
  [6, 2],  // 1
  [6, 3],  // 2
  [6, 4],  // 3
  [6, 5],  // 4

  [5, 6],  // 5
  [4, 6],  // 6
  [3, 6],  // 7
  [2, 6],  // 8
  [1, 6],  // 9
  [0, 6],  // 10

  [0, 7],  // 11
  [0, 8],  // 12

  // ----------------------------------------------------------
  // TOP -> RIGHT
  // ----------------------------------------------------------

  [1, 8],  // 13
  [2, 8],  // 14
  [3, 8],  // 15
  [4, 8],  // 16
  [5, 8],  // 17

  [6, 9],  // 18
  [6, 10], // 19
  [6, 11], // 20
  [6, 12], // 21
  [6, 13], // 22
  [6, 14], // 23

  // ----------------------------------------------------------
  // RIGHT -> BOTTOM
  // ----------------------------------------------------------

  [7, 14], // 24

  [8, 14], // 25
  [8, 13], // 26
  [8, 12], // 27
  [8, 11], // 28
  [8, 10], // 29
  [8, 9],  // 30

  [9, 8],  // 31
  [10, 8], // 32
  [11, 8], // 33
  [12, 8], // 34
  [13, 8], // 35
  [14, 8], // 36

  // ----------------------------------------------------------
  // BOTTOM -> LEFT
  // ----------------------------------------------------------

  [14, 7], // 37
  [14, 6], // 38

  [13, 6], // 39
  [12, 6], // 40
  [11, 6], // 41
  [10, 6], // 42
  [9, 6],  // 43

  [8, 5],  // 44
  [8, 4],  // 45
  [8, 3],  // 46
  [8, 2],  // 47
  [8, 1],  // 48
  [8, 0],  // 49

  [7, 0],  // 50

  // ----------------------------------------------------------
  // LEFT SIDE -> CLOSE TRACK
  // ----------------------------------------------------------

  [6, 0],  // 51
];

// ============================================================
// PLAYER COLORS
// ============================================================

const COLOR_STYLES = {
  red: {
    main: "#C94A4A",
    light: "#E88A8A",
    dark: "#963838",
    soft: "rgba(201,74,74,0.16)",
    border: "#D96B6B",
    text: "#F3B0B0",
  },

  blue: {
    main: "#4D78A8",
    light: "#87A9CF",
    dark: "#355879",
    soft: "rgba(77,120,168,0.16)",
    border: "#7099C7",
    text: "#BDD4EB",
  },

  yellow: {
    main: "#D4AD45",
    light: "#E9D27F",
    dark: "#9B7C27",
    soft: "rgba(212,173,69,0.16)",
    border: "#E0C367",
    text: "#F0DFA5",
  },

  green: {
    main: "#5F8A45",
    light: "#92B97A",
    dark: "#446633",
    soft: "rgba(95,138,69,0.16)",
    border: "#7FAA67",
    text: "#C1D7B2",
  },

  orange: {
    main: "#C47A3A",
    light: "#DDA16C",
    dark: "#8D5628",
    soft: "rgba(196,122,58,0.16)",
    border: "#D08D56",
    text: "#EBC49F",
  },

  purple: {
    main: "#8064A2",
    light: "#AC91C8",
    dark: "#5D4876",
    soft: "rgba(128,100,162,0.16)",
    border: "#9B7FBD",
    text: "#D4C4E4",
  },
};

// ============================================================
// BOARD COLORS
// ============================================================

const BOARD_COLORS = {
  background: "#38452A",
  panel: "#5F6F3A",
  border: "#7E8B52",
  accent: "#A4AE7A",
  cream: "#D8D8C6",
};

const getColorStyle = (color) =>
  COLOR_STYLES[color] || COLOR_STYLES.purple;

// ============================================================
// GET COINS ON MAIN TRACK CELL
// ============================================================

const getCoinsForCell = (game, absoluteCell) => {
  const result = [];

  for (const player of game.players || []) {
    if (player.isConnected === false) {
      continue;
    }

    for (const coin of player.coins || []) {
      if (
        coin.area === "main" &&
        coin.absoluteCell === absoluteCell
      ) {
        result.push({
          coin,
          player,
        });
      }
    }
  }

  return result;
};

// ============================================================
// HOME PATHS
// ============================================================
//
// Progress values:
//
// 52 -> first home cell
// 53 -> second home cell
// 54 -> third home cell
// 55 -> fourth home cell
// 56 -> fifth home cell
// 57 -> finished
//
// ============================================================

const HOME_PATHS = {
  red: [
    [7, 1],
    [7, 2],
    [7, 3],
    [7, 4],
    [7, 5],
  ],

  green: [
    [1, 7],
    [2, 7],
    [3, 7],
    [4, 7],
    [5, 7],
  ],

  yellow: [
  [13, 7],
  [12, 7],
  [11, 7],
  [10, 7],
  [9, 7],
],

blue: [
  [7, 13],
  [7, 12],
  [7, 11],
  [7, 10],
  [7, 9],
],
};

// ============================================================
// GET HOME CELL COORDINATE
// ============================================================

const getHomeCoordinate = (
  playerColor,
  progress
) => {
  const path =
    HOME_PATHS[playerColor];

  if (!path) {
    return null;
  }

  const homeIndex = progress - 51;

  if (
    homeIndex < 0 ||
    homeIndex >= path.length
  ) {
    return null;
  }

  return path[homeIndex];
};

// ============================================================
// PLAYER BASE POSITIONS
// ============================================================

const BASE_CONFIG = {
  red: {
    row: 0,
    col: 0,
  },

  green: {
    row: 0,
    col: 9,
  },

  yellow: {
    row: 9,
    col: 0,
  },

  blue: {
    row: 9,
    col: 9,
  },
};

// ============================================================
// BASE AREA
// ============================================================

const BaseArea = ({
  player,
  onCoinClick,
  clickableCoinIds,
}) => {
  if (!player || player.isConnected === false) {
    return null;
  }

  const config =
    BASE_CONFIG[player.color];

  if (!config) {
    return null;
  }

  const style =
    getColorStyle(player.color);

  return (
    <div
      className="absolute z-20 flex items-center justify-center rounded-2xl p-2"
      style={{
        top:
          `${(config.row / BOARD_SIZE) * 100}%`,
        left:
          `${(config.col / BOARD_SIZE) * 100}%`,
        width:
          `${(6 / BOARD_SIZE) * 100}%`,
        height:
          `${(6 / BOARD_SIZE) * 100}%`,
        backgroundColor:
          style.soft,
        border:
          `2px solid ${style.border}`,
      }}
    >
      <div
        className="flex h-full w-full items-center justify-center rounded-xl"
        style={{
          backgroundColor:
            "rgba(216,216,198,0.08)",
          border:
            `1px solid ${style.border}`,
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          {player.coins
            .slice(0, 4)
            .map((coin) => {

              const isBase =
                coin.area === "base";

              const isFinished =
                coin.area === "finished";

              const isClickable =
                clickableCoinIds.has(
                  coin.coinId
                );

              // ------------------------------------------------
              // FINISHED COIN
              // ------------------------------------------------

              if (isFinished) {
                return (
                  <div
                    key={coin.coinId}
                    className="flex aspect-square w-7 items-center justify-center rounded-full border-2 text-xs font-black sm:w-9"
                    style={{
                      backgroundColor:
                        style.dark,
                      borderColor:
                        style.light,
                      color: "#FFFFFF",
                      boxShadow:
                        `0 0 10px ${style.soft}`,
                    }}
                    title="Finished"
                  >
                    ✓
                  </div>
                );
              }

              // ------------------------------------------------
              // COIN IS OUTSIDE BASE
              // ------------------------------------------------

              if (!isBase) {
                return (
                  <div
                    key={coin.coinId}
                    className="flex aspect-square w-7 items-center justify-center rounded-full border text-xs font-black opacity-30 sm:w-9"
                    style={{
                      backgroundColor:
                        "rgba(216,216,198,0.08)",
                      borderColor:
                        "rgba(216,216,198,0.2)",
                      color:
                        "rgba(216,216,198,0.25)",
                    }}
                  >
                    ●
                  </div>
                );
              }

              // ------------------------------------------------
              // BASE COIN
              // ------------------------------------------------

              return (
                <button
                  key={coin.coinId}
                  type="button"
                  disabled={!isClickable}
                  onClick={() =>
                    isClickable &&
                    onCoinClick(
                      coin.coinId
                    )
                  }
                  className={`flex aspect-square w-7 items-center justify-center rounded-full border text-xs font-black transition-all sm:w-9 ${
                    isClickable
                      ? "cursor-pointer scale-110"
                      : ""
                  }`}
                  style={{
                    backgroundColor:
                      style.main,
                    borderColor:
                      style.light,
                    color: "#FFFFFF",
                    boxShadow:
                      isClickable
                        ? `0 0 16px ${style.light}, 0 4px 12px ${style.soft}`
                        : `0 4px 12px ${style.soft}`,
                  }}
                >
                  ●
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// PLAYER PANEL
// ============================================================

const PlayerPanel = ({
  player,
  isCurrent,
}) => {
  const style =
    getColorStyle(player.color);

  const finishedCoins =
    player.coins?.filter(
      (coin) =>
        coin.area === "finished"
    ).length || 0;

  return (
    <div
      className="rounded-xl border px-3 py-2 transition-all"
      style={{
        borderColor:
          isCurrent
            ? style.border
            : BOARD_COLORS.border,
        backgroundColor:
          isCurrent
            ? style.soft
            : "rgba(95,138,69,0.35)",
      }}
    >
      <div className="flex items-center justify-between gap-2">

        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{
              backgroundColor:
                style.main,
            }}
          />

          <span className="truncate text-xs font-bold text-[#D8D8C6]">
            {player.name}
          </span>
        </div>

        <span
          className="text-xs font-black"
          style={{
            color:
              style.text,
          }}
        >
          {finishedCoins}/4
        </span>

      </div>

      {isCurrent && (
        <div
          className="mt-1 text-[10px] font-black uppercase tracking-wider"
          style={{
            color:
              style.light,
          }}
        >
          YOUR TURN
        </div>
      )}
    </div>
  );
};

// ============================================================
// LUDO BOARD
// ============================================================

function LudoBoard({
  game,
  userId,
  legalMoves,
  reverseMode,
  onCoinClick,
}) {
  if (!game) {
    return null;
  }

  const players =
    game.players || [];

  // ==========================================================
  // CURRENT PLAYER
  // ==========================================================

  const currentPlayer =
    players.find(
      (player) =>
        player.userId === userId
    );

  // ==========================================================
  // MOVEMENT DIRECTION
  // ==========================================================
  //
  // Normal:
  //     touching coin = forward
  //
  // Reverse mode:
  //     touching coin = backward
  //
  // The actual validation remains server-side.
  // ==========================================================

  const selectedDirection =
    reverseMode
      ? "backward"
      : "forward";

  // ==========================================================
  // CLICKABLE COINS
  // ==========================================================

  const clickableCoinIds =
    new Set(
      (legalMoves || [])
        .filter(
          (move) =>
            move.direction ===
            selectedDirection
        )
        .map(
          (move) =>
            move.coinId
        )
    );

  // ==========================================================
  // ACTIVE PLAYERS
  // ==========================================================

  const redPlayer =
    players.find(
      (player) =>
        player.color === "red"
    );

  const greenPlayer =
    players.find(
      (player) =>
        player.color === "green"
    );

  const yellowPlayer =
    players.find(
      (player) =>
        player.color === "yellow"
    );

  const bluePlayer =
    players.find(
      (player) =>
        player.color === "blue"
    );

  return (
    <div className="w-full">

      {/* ================================================== */}
      {/* BOARD */}
      {/* ================================================== */}

      <div
        className="relative mx-auto aspect-square w-full max-w-[620px] overflow-hidden rounded-[24px] border-2 p-1.5 shadow-[0_15px_40px_rgba(20,30,10,0.35)] sm:p-2"
        style={{
          backgroundColor:
            BOARD_COLORS.panel,
          borderColor:
            BOARD_COLORS.accent,
        }}
      >

        {/* ================================================= */}
        {/* BOARD GRID */}
        {/* ================================================= */}

        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns:
              "repeat(15, 1fr)",
            gridTemplateRows:
              "repeat(15, 1fr)",
            padding: "8px",
            gap: "2px",
          }}
        >

          {Array.from({
            length:
              BOARD_SIZE *
              BOARD_SIZE,
          }).map(
            (_, index) => {

              const row =
                Math.floor(
                  index /
                    BOARD_SIZE
                );

              const col =
                index %
                BOARD_SIZE;

              // ---------------------------------------------
              // MAIN TRACK CELL NUMBER
              // ---------------------------------------------

              const cellNumber =
                PATH_COORDINATES.findIndex(
                  ([cellRow, cellCol]) =>
                    cellRow === row &&
                    cellCol === col
                );

              const isTrack =
                cellNumber !== -1;

              // ---------------------------------------------
              // HOME PATHS
              // ---------------------------------------------

              const isRedHome =
                HOME_PATHS.red.some(
                  ([r, c]) =>
                    r === row &&
                    c === col
                );

              const isGreenHome =
                HOME_PATHS.green.some(
                  ([r, c]) =>
                    r === row &&
                    c === col
                );

              const isYellowHome =
                HOME_PATHS.yellow.some(
                  ([r, c]) =>
                    r === row &&
                    c === col
                );

              const isBlueHome =
                HOME_PATHS.blue.some(
                  ([r, c]) =>
                    r === row &&
                    c === col
                );

              // ---------------------------------------------
              // CELL COLORS
              // ---------------------------------------------

              let backgroundColor =
                "rgba(56,69,42,0.55)";

              let borderColor =
                "rgba(216,216,198,0.08)";

              if (isTrack) {
                backgroundColor =
                  BOARD_COLORS.cream;

                borderColor =
                  "rgba(56,69,42,0.18)";
              }

              if (isRedHome) {
                backgroundColor =
                  "rgba(201,74,74,0.55)";
              }

              if (isGreenHome) {
                backgroundColor =
                  "rgba(95,138,69,0.65)";
              }

              if (isYellowHome) {
                backgroundColor =
                  "rgba(212,173,69,0.65)";
              }

              if (isBlueHome) {
                backgroundColor =
                  "rgba(77,120,168,0.65)";
              }

              // ---------------------------------------------
              // MAIN TRACK COINS
              // ---------------------------------------------

              const coins =
                isTrack
                  ? getCoinsForCell(
                      game,
                      cellNumber
                    )
                  : [];

              // ---------------------------------------------
              // HOME PATH COINS
              // ---------------------------------------------

              const homeCoins = [];

              for (const player of players) {
                if (player.isConnected === false) {
                  continue;
                }

                for (const coin of player.coins || []) {

                  if (
                    coin.area !== "home"
                  ) {
                    continue;
                  }

                  const coordinate =
                    getHomeCoordinate(
                      player.color,
                      coin.progress
                    );

                  if (!coordinate) {
                    continue;
                  }

                  if (
                    coordinate[0] ===
                      row &&
                    coordinate[1] ===
                      col
                  ) {
                    homeCoins.push({
                      coin,
                      player,
                    });
                  }
                }
              }

              // ---------------------------------------------
              // START CELLS
              // ---------------------------------------------

              const isStartCell =
                [
                  0,
                  13,
                  26,
                  39,
                ].includes(
                  cellNumber
                );

              return (
                <div
                  key={`${row}-${col}`}
                  className="relative flex items-center justify-center rounded-[3px]"
                  style={{
                    backgroundColor,
                    border:
                      `1px solid ${borderColor}`,
                  }}
                >

                  {/* ========================================= */}
                  {/* CELL NUMBER */}
                  {/* ========================================= */}

                  {isTrack && (
                    <span
                      className="absolute left-0.5 top-0.5 text-[5px] font-bold"
                      style={{
                        color:
                          BOARD_COLORS.background,
                        opacity: 0.45,
                      }}
                    >
                      {cellNumber}
                    </span>
                  )}

                  {/* ========================================= */}
                  {/* START CELL */}
                  {/* ========================================= */}

                  {isStartCell && (
                    <span
                      className="absolute text-[9px] font-black sm:text-[11px]"
                      style={{
                        color:
                          BOARD_COLORS.background,
                      }}
                    >
                      ★
                    </span>
                  )}

                  {/* ========================================= */}
                  {/* MAIN TRACK COINS */}
                  {/* ========================================= */}

                  {coins.length > 0 && (
                    <div className="relative z-30 flex -space-x-1.5">

                      {coins
                        .slice(0, 4)
                        .map(
                          ({
                            coin,
                            player,
                          }) => {

                            const style =
                              getColorStyle(
                                player.color
                              );

                            const isClickable =
                              clickableCoinIds.has(
                                coin.coinId
                              ) &&
                              player.userId ===
                                userId;

                            return (
                              <button
                                key={
                                  coin.coinId
                                }
                                type="button"
                                disabled={
                                  !isClickable
                                }
                                onClick={() =>
                                  isClickable &&
                                  onCoinClick(
                                    coin.coinId
                                  )
                                }
                                title={
                                  isClickable
                                    ? `Move ${player.name}'s coin`
                                    : `${player.name}'s coin`
                                }
                                className={`flex h-6 w-6 items-center justify-center rounded-full border text-[9px] font-black text-white shadow-md transition-all sm:h-8 sm:w-8 sm:text-[10px] ${
                                  isClickable
                                    ? "cursor-pointer scale-110"
                                    : ""
                                }`}
                                style={{
                                  backgroundColor:
                                    style.main,

                                  borderColor:
                                    style.light,

                                  boxShadow:
                                    isClickable
                                      ? `0 0 14px ${style.light}, 0 3px 8px ${style.soft}`
                                      : `0 3px 8px ${style.soft}`,
                                }}
                              >
                                ●
                              </button>
                            );
                          }
                        )}

                    </div>
                  )}

                  {/* ========================================= */}
                  {/* HOME PATH COINS */}
                  {/* ========================================= */}

                  {homeCoins.length > 0 && (
                    <div className="relative z-30 flex -space-x-1.5">

                      {homeCoins.map(
                        ({
                          coin,
                          player,
                        }) => {

                          const style =
                            getColorStyle(
                              player.color
                            );

                          const isClickable =
                            clickableCoinIds.has(
                              coin.coinId
                            ) &&
                            player.userId ===
                              userId;

                          return (
                            <button
                              key={
                                coin.coinId
                              }
                              type="button"
                              disabled={
                                !isClickable
                              }
                              onClick={() =>
                                isClickable &&
                                onCoinClick(
                                  coin.coinId
                                )
                              }
                              title={
                                isClickable
                                  ? `Move ${player.name}'s coin`
                                  : `${player.name}'s coin`
                              }
                              className={`relative z-30 flex h-6 w-6 items-center justify-center rounded-full border text-[9px] font-black text-white transition-all sm:h-8 sm:w-8 sm:text-[10px] ${
                                isClickable
                                  ? "cursor-pointer scale-110"
                                  : ""
                              }`}
                              style={{
                                backgroundColor:
                                  style.main,

                                borderColor:
                                  style.light,

                                boxShadow:
                                  isClickable
                                    ? `0 0 14px ${style.light}`
                                    : `0 3px 8px ${style.soft}`,
                              }}
                            >
                              ●
                            </button>
                          );
                        }
                      )}

                    </div>
                  )}

                </div>
              );
            }
          )}

        </div>

        {/* ================================================= */}
        {/* BASES */}
        {/* ================================================= */}

        <BaseArea
          player={redPlayer}
          onCoinClick={
            onCoinClick
          }
          clickableCoinIds={
            clickableCoinIds
          }
        />

        <BaseArea
          player={greenPlayer}
          onCoinClick={
            onCoinClick
          }
          clickableCoinIds={
            clickableCoinIds
          }
        />

        <BaseArea
          player={yellowPlayer}
          onCoinClick={
            onCoinClick
          }
          clickableCoinIds={
            clickableCoinIds
          }
        />

        <BaseArea
          player={bluePlayer}
          onCoinClick={
            onCoinClick
          }
          clickableCoinIds={
            clickableCoinIds
          }
        />

      </div>

      {/* ================================================== */}
      {/* PLAYER PANELS */}
      {/* ================================================== */}

      <div className="mx-auto mt-4 grid w-full max-w-[620px] grid-cols-2 gap-2">

        {players.map(
          (player) => (
            <PlayerPanel
              key={
                player.userId
              }
              player={player}
              isCurrent={
                game.currentTurn
                  ?.playerId ===
                player.userId
              }
            />
          )
        )}

      </div>

    </div>
  );
}

export default LudoBoard;