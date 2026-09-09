import React from "react";

const BOARD_SIZE = 15;

const PATH_COORDINATES = [
  [6, 1],
  [6, 2],
  [6, 3],
  [6, 4],
  [6, 5],

  [5, 6],
  [4, 6],
  [3, 6],
  [2, 6],
  [1, 6],
  [0, 6],

  [0, 7],
  [0, 8],

  [1, 8],
  [2, 8],
  [3, 8],
  [4, 8],
  [5, 8],

  [6, 9],
  [6, 10],
  [6, 11],
  [6, 12],
  [6, 13],
  [6, 14],

  [7, 14],

  [8, 14],
  [8, 13],
  [8, 12],
  [8, 11],
  [8, 10],
  [8, 9],

  [9, 8],
  [10, 8],
  [11, 8],
  [12, 8],
  [13, 8],
  [14, 8],

  [14, 7],
  [14, 6],

  [13, 6],
  [12, 6],
  [11, 6],
  [10, 6],
  [9, 6],

  [8, 5],
  [8, 4],
  [8, 3],
  [8, 2],
  [8, 1],
  [8, 0],

  [7, 0],

  [6, 0],
];

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

const BOARD_COLORS = {
  background: "#38452A",
  panel: "#5F6F3A",
  border: "#7E8B52",
  accent: "#A4AE7A",
  cream: "#D8D8C6",
};

const getColorStyle = (color) =>
  COLOR_STYLES[color] || COLOR_STYLES.purple;

const getCoinsForCell = (game, absoluteCell) => {
  const result = [];

  for (const player of game.players || []) {
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

const getFinishedCoins = (player) => {
  return (player?.coins || []).filter(
    (coin) => coin.area === "finished"
  );
};

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
    [7, 9],
    [7, 10],
    [7, 11],
    [7, 12],
    [7, 13],
  ],

  blue: [
    [9, 7],
    [10, 7],
    [11, 7],
    [12, 7],
    [13, 7],
  ],
};

const getHomeCoordinate = (playerColor, progress) => {
  const path = HOME_PATHS[playerColor];

  if (!path) {
    return null;
  }

  const homeIndex = progress - 52;

  if (
    homeIndex < 0 ||
    homeIndex >= path.length
  ) {
    return null;
  }

  return path[homeIndex];
};

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

const BaseArea = ({
  player,
  onCoinClick,
  clickableCoinIds,
}) => {
  if (!player) return null;

  const config = BASE_CONFIG[player.color];

  if (!config) return null;

  const style = getColorStyle(player.color);

  return (
    <div
      className="absolute z-20 flex items-center justify-center rounded-2xl p-2"
      style={{
        top: `${(config.row / BOARD_SIZE) * 100}%`,
        left: `${(config.col / BOARD_SIZE) * 100}%`,
        width: `${(6 / BOARD_SIZE) * 100}%`,
        height: `${(6 / BOARD_SIZE) * 100}%`,
        backgroundColor: style.soft,
        border: `2px solid ${style.border}`,
      }}
    >
      <div
        className="flex h-full w-full items-center justify-center rounded-xl"
        style={{
          backgroundColor: "rgba(216,216,198,0.08)",
          border: `1px solid ${style.border}`,
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          {player.coins.slice(0, 4).map((coin) => {
            const isBase =
              coin.area === "base";

            const isClickable =
              clickableCoinIds.has(coin.coinId);

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

            return (
              <button
                key={coin.coinId}
                type="button"
                disabled={!isClickable}
                onClick={() =>
                  isClickable &&
                  onCoinClick(coin.coinId)
                }
                className={`flex aspect-square w-7 items-center justify-center rounded-full border text-xs font-black transition-all sm:w-9 ${
                  isClickable
                    ? "cursor-pointer scale-110"
                    : ""
                }`}
                style={{
                  backgroundColor: style.main,
                  borderColor: style.light,
                  color: "#FFFFFF",
                  boxShadow: isClickable
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

const PlayerPanel = ({
  player,
  isCurrent,
}) => {
  const style = getColorStyle(player.color);

  const finishedCoins =
    player.coins?.filter(
      (coin) => coin.area === "finished"
    ).length || 0;

  return (
    <div
      className="rounded-xl border px-3 py-2 transition-all"
      style={{
        borderColor: isCurrent
          ? style.border
          : BOARD_COLORS.border,
        backgroundColor: isCurrent
          ? style.soft
          : "rgba(95,138,69,0.35)",
      }}
    >
      <div className="flex items-center justify-between gap-2">

        <div className="flex min-w-0 items-center gap-2">

          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{
              backgroundColor: style.main,
            }}
          />

          <span className="truncate text-xs font-bold text-[#D8D8C6]">
            {player.name}
          </span>

        </div>

        <span
          className="text-xs font-black"
          style={{
            color: style.text,
          }}
        >
          {finishedCoins}/4
        </span>

      </div>

      {isCurrent && (
        <div
          className="mt-1 text-[10px] font-black uppercase tracking-wider"
          style={{
            color: style.light,
          }}
        >
          YOUR TURN
        </div>
      )}

    </div>
  );
};

function LudoBoard({
  game,
  userId,
  legalMoves,
  reverseMode,
  onCoinClick,
}) {
  if (!game) return null;

  const players = game.players || [];

  console.log(
  "PLAYER COINS:",
  players.map((player) => ({
    name: player.name,
    color: player.color,
    coins: player.coins,
  }))
);

  /*
    Only the current player's coins can be clicked.
  */
  const currentPlayer =
    players.find(
      (player) =>
        player.userId === userId
    );

  /*
    Direction depends on the Reverse button.
  */
  const selectedDirection = reverseMode
    ? "backward"
    : "forward";

  /*
    Only highlight coins which are legal
    for the currently selected direction.
  */
  const clickableCoinIds = new Set(
    (legalMoves || [])
      .filter(
        (move) =>
          move.direction ===
          selectedDirection
      )
      .map(
        (move) => move.coinId
      )
  );

  const redPlayer =
    players.find(
      (player) => player.color === "red"
    );

  const greenPlayer =
    players.find(
      (player) => player.color === "green"
    );

  const yellowPlayer =
    players.find(
      (player) => player.color === "yellow"
    );

  const bluePlayer =
    players.find(
      (player) => player.color === "blue"
    );

  return (
    <div className="w-full">

      {/* ========================================= */}
      {/* BOARD */}
      {/* ========================================= */}

      <div
        className="relative mx-auto aspect-square w-full max-w-[620px] overflow-hidden rounded-[24px] border-2 p-1.5 shadow-[0_15px_40px_rgba(20,30,10,0.35)] sm:p-2"
        style={{
          backgroundColor:
            BOARD_COLORS.panel,
          borderColor:
            BOARD_COLORS.accent,
        }}
      >

        {/* ======================================= */}
        {/* BOARD GRID */}
        {/* ======================================= */}

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
              BOARD_SIZE * BOARD_SIZE,
          }).map((_, index) => {

            const row =
              Math.floor(
                index / BOARD_SIZE
              );

            const col =
              index % BOARD_SIZE;

            const cellNumber =
              PATH_COORDINATES.findIndex(
                ([cellRow, cellCol]) =>
                  cellRow === row &&
                  cellCol === col
              );

            const isTrack =
              cellNumber !== -1;

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

            const coins = isTrack
              ? getCoinsForCell(
                  game,
                  cellNumber
                )
              : [];

            const homeCoins = [];

            for (const player of players) {
              for (const coin of player.coins || []) {

                if (coin.area !== "home") {
                  continue;
                }

                const coordinate = getHomeCoordinate(
                  player.color,
                  coin.progress
                );

                if (!coordinate) {
                  continue;
                }

                if (
                  coordinate[0] === row &&
                  coordinate[1] === col
                ) {
                  homeCoins.push({
                    coin,
                    player,
                  });
                }
              }
            }

            const isStartCell = [
              0,
              13,
              26,
              39,
            ].includes(cellNumber);

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

                      {homeCoins.length > 0 && (
                  <div className="relative z-30 flex -space-x-1.5">
                    {homeCoins.map(
                      ({ coin, player }) => {

                        const style =
                          getColorStyle(
                            player.color
                          );

                        const isClickable =
                          clickableCoinIds.has(
                            coin.coinId
                          ) &&
                          player.userId === userId;

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
                            className={`flex h-6 w-6 items-center justify-center rounded-full border text-[9px] font-black text-white transition-all sm:h-8 sm:w-8 sm:text-[10px] ${
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
                )}

              </div>
            );
          })}

        </div>


        {/* ======================================= */}
        {/* BASES */}
        {/* ======================================= */}

        <BaseArea
          player={redPlayer}
          onCoinClick={onCoinClick}
          clickableCoinIds={
            clickableCoinIds
          }
        />

        <BaseArea
          player={greenPlayer}
          onCoinClick={onCoinClick}
          clickableCoinIds={
            clickableCoinIds
          }
        />

        <BaseArea
          player={yellowPlayer}
          onCoinClick={onCoinClick}
          clickableCoinIds={
            clickableCoinIds
          }
        />

        <BaseArea
          player={bluePlayer}
          onCoinClick={onCoinClick}
          clickableCoinIds={
            clickableCoinIds
          }
        />


        {/* ======================================= */}
        {/* CENTER */}
        {/* ======================================= */}


        <div className="absolute inset-0 flex items-center justify-center">

          <div className="grid grid-cols-2 gap-1">

            {players.flatMap((player) =>
              getFinishedCoins(player).map(
                (coin) => {
                  const style =
                    getColorStyle(
                      player.color
                    );

                  return (
                    <div
                      key={coin.coinId}
                      className="flex h-5 w-5 items-center justify-center rounded-full border text-[8px] font-black text-white"
                      style={{
                        backgroundColor:
                          style.main,
                        borderColor:
                          style.light,
                      }}
                      title={`${player.name} - Finished`}
                    >
                      ✓
                    </div>
                  );
                }
              )
            )}

          </div>

        </div>

        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-40 flex h-[19%] w-[19%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2"
          style={{
            backgroundColor:
              BOARD_COLORS.panel,
            borderColor:
              BOARD_COLORS.accent,
            boxShadow:
              "0 0 25px rgba(164,174,122,0.3)",
          }}
        >

          <div className="text-center">

            <div
              className="text-2xl font-black sm:text-3xl"
              style={{
                color:
                  BOARD_COLORS.cream,
              }}
            >
              ↻
            </div>

            <p
              className="text-[7px] font-black tracking-[0.18em] sm:text-[9px]"
              style={{
                color:
                  BOARD_COLORS.accent,
              }}
            >
              REVERSE
            </p>

          </div>

        </div>

      </div>


      {/* ========================================= */}
      {/* PLAYER PANELS */}
      {/* ========================================= */}

      <div className="mx-auto mt-4 grid w-full max-w-[620px] grid-cols-2 gap-2">

        {players.map((player) => (
          <PlayerPanel
            key={player.userId}
            player={player}
            isCurrent={
              game.currentTurn?.playerId ===
              player.userId
            }
          />
        ))}

      </div>

    </div>
  );
}

export default LudoBoard;