import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import LudoBoard from "./components/LudoBoard";

const socket = io("http://localhost:5000");

function App() {
  const [screen, setScreen] = useState("home");
  const [mode, setMode] = useState("create");

  const [selectedPlayerCount, setSelectedPlayerCount] = useState(2);

  const [userId, setUserId] = useState("");
  const [name, setName] = useState(""); 

  const [roomIdInput, setRoomIdInput] = useState("");
  const [room, setRoom] = useState(null);
  const [game, setGame] = useState(null);

  const [message, setMessage] = useState("");
  const [connected, setConnected] = useState(false);

  const [diceValue, setDiceValue] = useState(null);  
const [legalMoves, setLegalMoves] = useState([]);
const [reverseMode, setReverseMode] = useState(false);
const [turnSeconds, setTurnSeconds] = useState(null);

  // --------------------------------------------------------
  // Socket Connection
  // --------------------------------------------------------

  useEffect(() => {

    const handleConnect = () => {
      console.log("Connected:", socket.id);
      setConnected(true);
    };

    const handleDisconnect = () => {
      console.log("Disconnected");
      setConnected(false);
    };

    const handleRoomUpdated = (updatedRoom) => {
  console.log("ROOM UPDATED RECEIVED:", updatedRoom);
  console.log(
    "PLAYERS:",
    updatedRoom?.players?.map((player) => player.userId)
  );

  setRoom({
    ...updatedRoom,
    players: [...(updatedRoom.players || [])],
  });
};

    const handleGameStarted = (updatedRoom) => {
      console.log("Game started:", updatedRoom);

      setRoom(updatedRoom);
      setGame(updatedRoom.game);
      setMessage("Game started!");
    };


    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("room_updated", handleRoomUpdated);
    socket.on("game_started", handleGameStarted);

    socket.on("dice_rolled", (data) => {
      console.log("Dice rolled:", data);

      setGame(data.game);
      setDiceValue(data.diceValue);
      setLegalMoves(data.legalMoves);

      if (data.auto) {
        setMessage(
          `Server automatically rolled ${data.diceValue} for ${data.game.currentTurn.playerId}`
        );
      } else if (data.turnPassed) {
        setMessage(data.reason);
      } else {
        setMessage(
          `Player ${data.playerId} rolled ${data.diceValue}`
        );
      }
    });

    socket.on("turn_changed", (data) => {
      console.log("Turn changed:", data);

      setGame(data.game);
      setLegalMoves([]);
      setReverseMode(false);

      setMessage(
        `Turn changed to ${data.game.currentTurn.playerId}`
      );
    });
    socket.on("turn_timer", (data) => {
      console.log("Turn timer:", data);

      setTurnSeconds(data.remainingSeconds);
    });

    socket.on("coin_moved", (data) => {
  console.log("Coin moved:", data);

  // Update the latest game state
  setGame(data.game);

  // The previous dice has been consumed
  setDiceValue(null);

  // Clear old legal moves
  setLegalMoves([]);

  // Clear selected coin
  setReverseMode(false);

  if (data.capture?.killed) {
    setMessage(
      `Coin moved ${data.direction} and captured ${data.capture.killedCoins.length} coin(s)!`
    );
  } else {
    setMessage(
      `Coin moved ${data.direction}.`
    );
  }
});


    // Socket may already be connected
    if (socket.connected) {
      setConnected(true);
    }


    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("room_updated", handleRoomUpdated);
      socket.off("game_started", handleGameStarted);
      socket.off("dice_rolled");
      socket.off("turn_changed");
      socket.off("turn_timer");
      socket.off("coin_moved");
    };

  }, []);


  // --------------------------------------------------------
  // Create Room
  // --------------------------------------------------------

  const handleCreateRoom = () => {
  if (!name.trim()) {
    setMessage("Enter your player name.");
    return;
  }

  const generatedUserId = `user-${crypto.randomUUID()}`;

  setUserId(generatedUserId);

  socket.emit(
    "create_room",
    {
      hostId: generatedUserId,
      hostName: name.trim(),
      maxPlayers: selectedPlayerCount,
    },
    (result) => {
      console.log("Create room:", result);

      if (!result.success) {
        setMessage(result.reason);
        return;
      }

      setRoom(result.room);
      setRoomIdInput(result.room.roomId);
      setMessage("Room created successfully.");
    }
  );
};


  // --------------------------------------------------------
  // Join Room
  // --------------------------------------------------------

  const handleJoinRoom = () => {
  if (!name.trim()) {
    setMessage("Enter your player name.");
    return;
  }

  if (!roomIdInput.trim()) {
    setMessage("Enter the room code.");
    return;
  }

  const generatedUserId = `user-${crypto.randomUUID()}`;

  setUserId(generatedUserId);

  socket.emit(
    "join_room",
    {
      roomId: roomIdInput.trim().toUpperCase(),
      userId: generatedUserId,
      name: name.trim(),
    },
    (result) => {
      console.log("Join room:", result);

      if (!result.success) {
        setMessage(result.reason);
        return;
      }

      setRoom(result.room);
      setMessage("Joined room successfully.");
    }
  );
};


  // --------------------------------------------------------
  // Start Game
  // --------------------------------------------------------

  const handleStartGame = () => {

    if (!room) return;


    socket.emit(
      "start_game",
      {
        roomId: room.roomId,
        userId,
      },
      (result) => {

        console.log("Start game:", result);


        if (!result.success) {
          setMessage(result.reason);
          return;
        }


        setRoom(result.room);
        setGame(result.room.game);

        setMessage(
          "Game started successfully."
        );
      }
    );
  };

  // --------------------------------------------------------
  // dice roll
  // --------------------------------------------------------

  const handleRollDice = () => {
    if (!room) return;

    socket.emit(
      "roll_dice",
      {
        roomId: room.roomId,
        userId: userId,
        diceValue: Math.floor(Math.random() * 6) + 1,
      },
      (response) => {
        if (!response.success) {
          setMessage(response.reason);
          return;
        }

        setGame(response.game);
        setDiceValue(response.diceValue);
        setLegalMoves(response.legalMoves);
        setReverseMode(false);
        setMessage(`You rolled ${response.diceValue}`);
      }
    );
  };
  
  // --------------------------------------------------------
  // Coin Movement
  // --------------------------------------------------------

  const handleMoveCoin = (coinId) => {
  if (!room || !game || !coinId) {
    return;
  }

  const direction =
    reverseMode
      ? "backward"
      : "forward";

  const matchingMove =
    legalMoves.find(
      (move) =>
        move.coinId === coinId &&
        move.direction === direction
    );

  if (!matchingMove) {
    setMessage(
      reverseMode
        ? "This coin cannot move backward."
        : "This coin cannot move forward."
    );

    return;
  }

  socket.emit(
    "move_coin",
    {
      roomId: room.roomId,
      userId,
      coinId,
      direction,
    },
    (response) => {
      console.log("Move coin:", response);

      if (!response.success) {
        setMessage(response.reason);
        return;
      }

      setGame(response.game);
      setDiceValue(null);
      setLegalMoves([]);

      // Reset Reverse after a move.
      setReverseMode(false);

      if (response.capture?.killed) {
        setMessage(
          `Captured ${response.capture.killedCoins.length} opponent coin(s)!`
        );
      } else {
        setMessage(
          `Coin moved ${direction}.`
        );
      }
    }
  );
};


  // --------------------------------------------------------
  // Leave Room
  // --------------------------------------------------------

  const handleLeaveRoom = () => {

    if (!room) return;


    socket.emit(
      "leave_room",
      {
        roomId: room.roomId,
        userId,
      },
      (result) => {

        console.log("Leave room:", result);


        if (!result.success) {
          setMessage(result.reason);
          return;
        }


        setRoom(null);
        setGame(null);

        setMessage(
          "You left the room."
        );
      }
    );
  };

  // --------------------------------------------------------
// Room Actions
// --------------------------------------------------------

const handleCopyRoomCode = async () => {
  if (!room?.roomId) return;

  try {
    await navigator.clipboard.writeText(room.roomId);
    setMessage("Room code copied!");
  } catch (error) {
    setMessage("Could not copy room code.");
  }
};

const handleShareRoom = async () => {
  if (!room?.roomId) return;

  const shareText = `Join my Reverse Ludo game! Room code: ${room.roomId}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Reverse Ludo",
        text: shareText,
      });
      return;
    } catch (error) {
      // User cancelled share.
      return;
    }
  }

  try {
    await navigator.clipboard.writeText(shareText);
    setMessage("Invite copied!");
  } catch (error) {
    setMessage("Could not share the invite.");
  }
};


  // --------------------------------------------------------
  // Current Player
  // --------------------------------------------------------

 const currentPlayer = room?.players.find(
  (player) => player.userId === userId
);

const isHost =
  currentPlayer?.isHost === true;


  const isMyTurn =
  game?.currentTurn?.playerId === userId;

const hasRolled =
  game?.currentTurn?.hasRolled === true;

const backwardMoves =
  legalMoves.filter(
    (move) =>
      move.direction === "backward"
  );

const canUseReverse =
  isMyTurn &&
  hasRolled &&
  game?.currentTurn?.backwardAllowed === true &&
  backwardMoves.length > 0;

  // --------------------------------------------------------
  // UI
  // --------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#38452A] text-white">
    {screen === "home" && (
  <div className="min-h-screen bg-[#38452A] px-5 py-8 text-white">

    <div className="mx-auto w-full max-w-md">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#D8D8C6]">
            Hi
          </p>

          <h1 className="text-3xl font-black">
            Player!
          </h1>

          <p className="mt-1 text-sm text-[#D8D8C6]">
            Ready to make your move?
          </p>
        </div>

        <div className="rounded-2xl border border-[#7E8B52] bg-[#5F6F3A]/80 px-4 py-2">
          🪙 <span className="font-bold">2,450</span>
          <span className="ml-2 text-lg">＋</span>
        </div>
      </div>

      {/* Hero */}
      <div className="mt-10 text-center">

        <div className="mx-auto flex h-56 w-full items-center justify-center rounded-3xl border border-[#7E8B52] bg-gradient-to-br from-[#5F6F3A] via-[#38452A] to-[#7E8B52] shadow-[0_0_40px_rgba(164,174,122,0.20)]">

          <div className="text-center">
            <div className="text-6xl">♟</div>

            <div className="mt-2 text-3xl font-black tracking-tight">
              REVERSE
            </div>

            <div className="text-2xl font-black text-[#A4AE7A]">
              LUDO
            </div>
          </div>

        </div>

        <h2 className="mt-8 text-3xl font-black">
          WHAT'S YOUR
        </h2>

        <h2 className="text-3xl font-black">
          MOVE?
        </h2>

        <p className="mt-3 text-[#D8D8C6]">
          Choose how you want to play.
        </p>
      </div>

      {/* Game Modes */}
      <div className="mt-8 grid grid-cols-2 gap-4">

        {/* Online */}
        <button
          disabled
          className="rounded-3xl border border-[#7E8B52] bg-[#5F6F3A]/60 p-5 text-left opacity-50"
        >
          <div className="text-3xl">🌎</div>

          <p className="mt-4 text-lg font-black">
            PLAY ONLINE
          </p>

          <p className="mt-1 text-sm text-[#D8D8C6]">
            Challenge players worldwide
          </p>
        </button>

        {/* Friends */}
        <button
          onClick={() => setScreen("mode")}
          className="rounded-3xl border border-[#A4AE7A] bg-[#5F6F3A]/80 p-5 text-left shadow-[0_0_25px_rgba(164,174,122,0.18)] transition hover:bg-[#7E8B52]"
        >
          <div className="text-3xl">♟️</div>

          <p className="mt-4 text-lg font-black">
            PLAY WITH
            <br />
            FRIENDS
          </p>

          <p className="mt-1 text-sm text-[#D8D8C6]">
            Create or join a private game
          </p>

          <div className="mt-4 text-right text-2xl text-[#A4AE7A]">
            →
          </div>
        </button>

        {/* Local */}
        <button
          disabled
          className="rounded-3xl border border-[#7E8B52] bg-[#5F6F3A]/60 p-5 text-left opacity-50"
        >
          <div className="text-3xl">🎮</div>

          <p className="mt-4 text-lg font-black">
            LOCAL GAME
          </p>

          <p className="mt-1 text-sm text-[#D8D8C6]">
            Play together on this device
          </p>
        </button>

        {/* AI */}
        <button
          disabled
          className="rounded-3xl border border-[#7E8B52] bg-[#5F6F3A]/60 p-5 text-left opacity-50"
        >
          <div className="text-3xl">🤖</div>

          <p className="mt-4 text-lg font-black">
            PRACTICE / AI
          </p>

          <p className="mt-1 text-sm text-[#D8D8C6]">
            Train against AI
          </p>
        </button>

      </div>

      {/* Bottom Navigation */}
      <div className="mt-10 flex items-center justify-around rounded-3xl border border-[#7E8B52] bg-[#5F6F3A]/70 p-5">

        <div className="text-center text-[#A4AE7A]">
          <div className="text-2xl">⌂</div>
          <p className="mt-1 text-xs font-black">
            HOME
          </p>
        </div>

        <div className="text-center text-[#D8D8C6]/70">
          <div className="text-2xl">♙</div>
          <p className="mt-1 text-xs font-black">
            PROFILE
          </p>
        </div>

        <div className="text-center text-[#D8D8C6]/70">
          <div className="text-2xl">🏆</div>
          <p className="mt-1 text-xs font-black">
            REWARDS
          </p>
        </div>

      </div>

    </div>

  </div>
)}

{screen === "mode" && (
  <div className="min-h-screen bg-[#38452A] px-5 py-8 text-white">

    <div className="mx-auto w-full max-w-md">

      {/* Header */}
      <div className="flex items-center justify-between">

        <button
          onClick={() => setScreen("home")}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#7E8B52] bg-[#5F6F3A] text-xl"
        >
          ←
        </button>

        <div className="text-xl font-black tracking-wide">
          ◉ REVERSE
        </div>

        <div className="w-11" />

      </div>

      {/* Heading */}
      <div className="mt-10 text-center">

        <h1 className="text-3xl font-black">
          CHOOSE YOUR
        </h1>

        <h1 className="text-3xl font-black text-[#A4AE7A]">
          MODE
        </h1>

        <p className="mt-3 text-sm text-[#D8D8C6]">
          How many players are joining the game?
        </p>

      </div>

      {/* Player options */}
      <div className="mt-8 grid grid-cols-2 gap-4">

        {[2, 3, 4, 5, 6].map((count) => {

          const selected =
            selectedPlayerCount === count;

          return (
            <button
              key={count}
              onClick={() =>
                setSelectedPlayerCount(count)
              }
              className={`relative rounded-3xl border p-6 text-center transition ${
                selected
                  ? "border-[#A4AE7A] bg-[#5F6F3A] shadow-[0_0_25px_rgba(164,174,122,0.25)]"
                  : "border-[#7E8B52] bg-[#5F6F3A]/70 hover:border-[#A4AE7A]"
              } ${
                count === 6
                  ? "col-span-2"
                  : ""
              }`}
            >

              {selected && (
                <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#A4AE7A] text-sm font-black text-[#38452A]">
                  ✓
                </div>
              )}

              <div className="text-4xl">
                {count === 2 && "♟️♟️"}
                {count === 3 && "♟️♟️♟️"}
                {count === 4 && "♟️♟️♟️♟️"}
                {count === 5 && "♟️♟️♟️♟️♟️"}
                {count === 6 && "♟️♟️♟️♟️♟️♟️"}
              </div>

              <p className="mt-4 text-xl font-black">
                {count} PLAYERS
              </p>

              <p className="mt-1 text-xs text-[#D8D8C6]">
                {count === 2 &&
                  "Head-to-head battle"}

                {count === 3 &&
                  "Three-way showdown"}

                {count === 4 &&
                  "Full board battle"}

                {count === 5 &&
                  "Five-player battle"}

                {count === 6 &&
                  "Ultimate six-player battle"}
              </p>

            </button>
          );

        })}

      </div>

      {/* Continue */}
      <button
        onClick={() => {
          setMode("create");
          setScreen("room");
        }}
        className="mt-8 w-full rounded-2xl bg-[#A4AE7A] px-6 py-4 text-lg font-black text-[#38452A] shadow-[0_0_25px_rgba(164,174,122,0.28)] transition hover:bg-[#D8D8C6]"
      >
        CONTINUE →
      </button>

    </div>

  </div>
)}

      <div className="mx-auto w-full max-w-2xl">


        {/* ------------------------------------------------ */}
        {/* HEADER */}
        {/* ------------------------------------------------ */}
        {!["home", "mode", "room"].includes(screen) && (
        <div className="mb-8 text-center">

          <h1 className="text-4xl font-bold tracking-tight">
            Reverse Ludo
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Multiplayer Room Testing
          </p>


          {/* Connection */}

          <div className="mt-4 flex items-center justify-center gap-2 text-sm">

            <span
              className={`h-2.5 w-2.5 rounded-full ${
                connected
                  ? "bg-emerald-500"
                  : "bg-slate-400"
              }`}
            />

            <span className="text-slate-600">
              {connected
                ? "Connected to server"
                : "Connecting to server..."}
            </span>

          </div>

        </div>
        )}

        {/* ------------------------------------------------ */}
        {/* MESSAGE */}
        {/* ------------------------------------------------ 
        
        {message && (

          <div className="mb-5 rounded-xl border border-[#7E8B52] bg-[#D8D8C6] px-4 py-3 text-sm text-[#38452A]">

            {message}

          </div>

        )}
          */}


        {/* ------------------------------------------------ */}
        {/* CREATE / JOIN */}
        {/* ------------------------------------------------ */}

        {screen === "room" && !room && (
  <div className="min-h-screen bg-[#38452A] px-5 py-8 text-white">

    <div className="mx-auto w-full max-w-6xl">

      {/* Top bar */}
      <div className="flex items-center justify-between">

        <button
          onClick={() => setScreen("mode")}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#7E8B52] bg-[#5F6F3A] text-xl transition hover:border-[#A4AE7A]"
        >
          ←
        </button>

        <div className="text-2xl font-black tracking-wide">
          ◉ REVERSE
        </div>

        <div className="rounded-xl border border-[#7E8B52] bg-[#5F6F3A] px-4 py-2 text-sm">
          🪙 <span className="font-bold">2,450</span>
        </div>

      </div>

      {/* Heading */}
      <div className="mx-auto mt-10 max-w-3xl text-center">

        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#A4AE7A]">
          {selectedPlayerCount} PLAYERS
        </p>

        <h1 className="mt-3 text-4xl font-black sm:text-5xl">
          CREATE OR JOIN
        </h1>

        <h1 className="text-4xl font-black text-[#A4AE7A] sm:text-5xl">
          A ROOM
        </h1>

        <p className="mt-4 text-base text-[#D8D8C6] sm:text-lg">
          Play with your friends in a private game.
        </p>

      </div>

      {/* Player Name */}
      <div className="mx-auto mt-10 max-w-xl">

        <label className="mb-2 block text-sm font-semibold text-[#D8D8C6]">
          Player Name
        </label>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          maxLength={20}
          className="w-full rounded-2xl border border-[#7E8B52] bg-[#5F6F3A]/80 px-5 py-4 text-white outline-none placeholder:text-[#A4AE7A]/70 focus:border-[#A4AE7A] focus:ring-2 focus:ring-[#A4AE7A]/20"
        />

      </div>

      {/* Create / Join */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">

        {/* CREATE ROOM */}
        <div className="rounded-[28px] border border-[#7E8B52] bg-[#5F6F3A]/70 p-6 shadow-[0_0_35px_rgba(164,174,122,0.10)] sm:p-8">

          <div className="text-6xl">
            ♟️
          </div>

          <h2 className="mt-5 text-2xl font-black">
            CREATE A ROOM
          </h2>

          <p className="mt-2 max-w-md text-[#D8D8C6]">
            Start a private game and invite your friends to join.
          </p>

          <div className="mt-6 rounded-2xl border border-[#7E8B52] bg-black/20 p-4">

            <p className="text-xs font-semibold uppercase tracking-wider text-[#D8D8C6]/70">
              Game Size
            </p>

            <p className="mt-1 text-xl font-black text-[#A4AE7A]">
              {selectedPlayerCount} Players
            </p>

          </div>

          <button
            onClick={handleCreateRoom}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#A4AE7A] px-6 py-4 text-lg font-black text-[#38452A] shadow-[0_0_25px_rgba(164,174,122,0.25)] transition hover:bg-[#D8D8C6] active:scale-[0.99]"
          >
            CREATE ROOM
            <span className="text-xl">＋</span>
          </button>

        </div>

        {/* JOIN ROOM */}
        <div className="rounded-[28px] border border-[#7E8B52] bg-[#5F6F3A]/70 p-6 shadow-[0_0_35px_rgba(164,174,122,0.10)] sm:p-8">

          <div className="text-6xl">
            🚪
          </div>

          <h2 className="mt-5 text-2xl font-black">
            JOIN A ROOM
          </h2>

          <p className="mt-2 max-w-md text-[#D8D8C6]">
            Enter the room code shared by your friend.
          </p>

          <div className="mt-6">

            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#D8D8C6]/70">
              Room Code
            </label>

            <input
              value={roomIdInput}
              onChange={(e) =>
                setRoomIdInput(
                  e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 6)
                )
              }
              placeholder="ABC123"
              maxLength={6}
              className="w-full rounded-2xl border border-[#7E8B52] bg-black/20 px-5 py-4 text-lg font-black tracking-[0.3em] text-white outline-none placeholder:text-[#A4AE7A]/60 focus:border-[#A4AE7A] focus:ring-2 focus:ring-[#A4AE7A]/20"
            />

          </div>

          <button
            onClick={handleJoinRoom}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#A4AE7A] bg-[#5F6F3A] px-6 py-4 text-lg font-black text-[#D8D8C6] transition hover:bg-[#7E8B52] active:scale-[0.99]"
          >
            JOIN ROOM
            <span className="text-xl">→</span>
          </button>

        </div>

      </div>

      {/* Selected game information */}
      <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-[#7E8B52] bg-[#5F6F3A]/60 p-5 text-center">

        <p className="text-xs font-semibold uppercase tracking-wider text-[#D8D8C6]/70">
          Selected Game
        </p>

        <p className="mt-1 text-xl font-black text-white">
          {selectedPlayerCount} Player Reverse Ludo
        </p>

        <p className="mt-1 text-sm text-[#D8D8C6]">
          Your room will support exactly {selectedPlayerCount} players.
        </p>

      </div>

    </div>

  </div>
)}

        {game?.status === "playing" && (
  <div className="mt-8 rounded-2xl border border-[#7E8B52] bg-[#38452A] p-6">
    <div className="mb-6">
  <LudoBoard
  game={game}
  userId={userId}
  legalMoves={legalMoves}
  reverseMode={reverseMode}
  onCoinClick={handleMoveCoin}
/>
</div>

            <h2 className="text-2xl font-bold text-white">
              Game
            </h2>

            <p className="mt-2 text-[#D8D8C6]/70">
              Current Turn:{" "}
              <span className="font-semibold text-white">
                {game.currentTurn.playerId}
              </span>
            </p>
            {turnSeconds !== null && (
              <p className="mt-2 text-[#D8D8C6]/70">
                Time Left:{" "}
                <span className="font-semibold text-[#A4AE7A]">
                  {turnSeconds}s
                </span>
              </p>
            )}

            <div className="mt-6">

              <button
                onClick={handleRollDice}
                disabled={
                  game.currentTurn.playerId !== userId ||
                  game.currentTurn.hasRolled
                }
                className="rounded-xl bg-[#7E8B52] px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                🎲 Roll Dice
              </button>

            </div>

            {diceValue && (
              <div className="mt-6">
                <p className="text-[#D8D8C6]/70">
                  Dice
                </p>

                <p className="text-5xl font-bold text-white">
                  {diceValue}
                </p>
              </div>
            )}

            {isMyTurn && hasRolled && (
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={() =>
                    setReverseMode((previous) => !previous)
                  }
                  disabled={!canUseReverse}
                  className={`rounded-2xl border px-5 py-3 font-black transition ${
                    reverseMode
                      ? "border-[#D8D8C6] bg-[#A4AE7A] text-[#38452A] shadow-[0_0_20px_rgba(164,174,122,0.35)]"
                      : "border-[#7E8B52] bg-[#5F6F3A] text-[#D8D8C6]"
                  } ${
                    !canUseReverse
                      ? "cursor-not-allowed opacity-40"
                      : "hover:border-[#A4AE7A]"
                  }`}
                >
                  ↻
                  <span className="ml-2">
                    {reverseMode
                      ? "REVERSE ON"
                      : "REVERSE"}
                  </span>
                </button>
              </div>
            )}

            {message && (
              <p className="mt-4 text-sm text-[#A4AE7A]">
                {message}
              </p>
            )}

          </div>
        )}


        {/* ------------------------------------------------ */}
        {/* ROOM */}
        {/* ------------------------------------------------ */}

        {screen === "room" && room && !game && (
  <div className="min-h-screen bg-[#38452A] px-5 py-8 text-white">

    <div className="mx-auto w-full max-w-6xl">

      {/* ------------------------------------------------ */}
      {/* TOP BAR */}
      {/* ------------------------------------------------ */}

      <div className="flex items-center justify-between">

        <button
          onClick={() => {
            setRoom(null);
            setRoomIdInput("");
            setScreen("mode");
          }}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#7E8B52] bg-[#5F6F3A] text-xl transition hover:border-[#A4AE7A]"
        >
          ←
        </button>

        <div className="text-xl font-black tracking-wide sm:text-2xl">
          ◉ REVERSE
        </div>

        <div className="rounded-xl border border-[#7E8B52] bg-[#5F6F3A] px-4 py-2 text-sm">
          🪙 <span className="font-bold">2,450</span>
        </div>

      </div>


      {/* ------------------------------------------------ */}
      {/* HEADING */}
      {/* ------------------------------------------------ */}

      <div className="mx-auto mt-10 max-w-3xl text-center">

        <h1 className="text-4xl font-black sm:text-5xl">
          CREATE OR JOIN
        </h1>

        <h1 className="text-4xl font-black text-[#A4AE7A] sm:text-5xl">
          A ROOM
        </h1>

        <p className="mt-4 text-base text-[#D8D8C6] sm:text-lg">
          Play with your friends in a private game.
        </p>

      </div>


      {/* ------------------------------------------------ */}
      {/* ROOM CONTENT */}
      {/* ------------------------------------------------ */}

      <div className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">


        {/* LEFT - ROOM CODE */}
        <div className="rounded-[28px] border border-[#7E8B52] bg-[#5F6F3A]/70 p-6 shadow-[0_0_35px_rgba(164,174,122,0.10)] sm:p-8">

          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D8D8C6]/70">
            ROOM CODE
          </p>

          <div className="mt-4 flex items-center gap-3">

            <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-[#7E8B52] bg-black/20 px-4 py-4 text-center">
              <p className="truncate text-3xl font-black tracking-[0.28em] text-[#D8D8C6] sm:text-4xl">
                {room.roomId}
              </p>
            </div>

            <button
              onClick={handleCopyRoomCode}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#7E8B52] bg-[#5F6F3A] text-xl transition hover:border-[#A4AE7A] hover:bg-[#7E8B52]"
              title="Copy room code"
            >
              📋
            </button>

          </div>


          <button
            onClick={handleShareRoom}
            className="mt-4 w-full rounded-2xl border border-[#A4AE7A] bg-[#5F6F3A] px-5 py-3 font-black text-[#D8D8C6] transition hover:bg-[#7E8B52]"
          >
            ↗ SHARE INVITE
          </button>


          <div className="mt-8 rounded-2xl border border-[#7E8B52] bg-black/20 p-5">

            <p className="text-xs font-bold uppercase tracking-wider text-[#D8D8C6]/70">
              GAME MODE
            </p>

            <p className="mt-2 text-2xl font-black">
              {room.maxPlayers} PLAYERS
            </p>

            <p className="mt-1 text-sm text-[#D8D8C6]">
              Private Reverse Ludo game
            </p>

          </div>


          {/* Connection */}
          <div className="mt-6 flex items-center gap-2 text-sm">

            <span
              className={`h-2.5 w-2.5 rounded-full ${
                connected
                  ? "bg-emerald-400"
                  : "bg-red-400"
              }`}
            />

            <span className="text-[#D8D8C6]">
              {connected
                ? "Connected"
                : "Disconnected"}
            </span>

          </div>

        </div>


        {/* RIGHT - PLAYERS */}
        <div className="rounded-[28px] border border-[#7E8B52] bg-[#5F6F3A]/70 p-6 shadow-[0_0_35px_rgba(164,174,122,0.10)] sm:p-8">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D8D8C6]/70">
                PLAYERS
              </p>

              <h2 className="mt-1 text-3xl font-black">
                {room.players.length}
                <span className="text-[#A4AE7A]/70">
                  /{room.maxPlayers}
                </span>
              </h2>

            </div>

            <div className="rounded-xl border border-[#7E8B52] bg-black/20 px-4 py-2 text-sm font-bold text-[#D8D8C6]">
              {room.players.length === room.maxPlayers
                ? "ROOM FULL"
                : `${room.maxPlayers - room.players.length} SPOTS LEFT`}
            </div>

          </div>


          {/* Player slots */}
          <div className="mt-6 space-y-3">

            {Array.from({
              length: room.maxPlayers
            }).map((_, index) => {

              const player = room.players[index];

              const colorClasses = {
                red: {
                  border: "border-red-500",
                  bg: "bg-red-500/10",
                  text: "text-red-300",
                  dot: "bg-red-500",
                  icon: "🔴",
                },
                blue: {
                  border: "border-blue-500",
                  bg: "bg-blue-500/10",
                  text: "text-blue-300",
                  dot: "bg-blue-500",
                  icon: "🔵",
                },
                green: {
                  border: "border-green-500",
                  bg: "bg-green-500/10",
                  text: "text-green-300",
                  dot: "bg-green-500",
                  icon: "🟢",
                },
                yellow: {
                  border: "border-yellow-400",
                  bg: "bg-yellow-400/10",
                  text: "text-yellow-200",
                  dot: "bg-yellow-400",
                  icon: "🟡",
                },
                orange: {
                  border: "border-orange-500",
                  bg: "bg-orange-500/10",
                  text: "text-orange-300",
                  dot: "bg-orange-500",
                  icon: "🟠",
                },
                purple: {
                  border: "border-[#A4AE7A]",
                  bg: "bg-purple-500/10",
                  text: "text-[#D8D8C6]",
                  dot: "bg-purple-500",
                  icon: "🟣",
                },
              };

              const playerColor =
                colorClasses[player?.color] ||
                colorClasses.purple;

              return (
                <div
                  key={player?.userId || `empty-${index}`}
                  className={`rounded-2xl border p-4 ${
                    player
                      ? `${playerColor.border} ${playerColor.bg}`
                      : "border-[#7E8B52] bg-black/20"
                  }`}
                >

                  {player ? (

                    <div className="flex items-center justify-between gap-4">

                      <div className="flex min-w-0 items-center gap-4">

                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black/20 text-2xl`}
                        >
                          {playerColor.icon}
                        </div>

                        <div className="min-w-0">

                          <div className="flex items-center gap-2">

                            <p className="truncate text-lg font-black">
                              {player.name}
                            </p>

                            {player.userId === userId && (
                              <span className="rounded-md bg-emerald-500/20 px-2 py-1 text-[10px] font-black text-emerald-300">
                                YOU
                              </span>
                            )}

                          </div>

                          <div className="mt-1 flex items-center gap-2">

                            {player.isHost && (
                              <span className="text-xs font-bold text-[#A4AE7A]">
                                HOST
                              </span>
                            )}

                            {player.isConnected === false && (
                              <span className="text-xs font-semibold text-red-300">
                                DISCONNECTED
                              </span>
                            )}

                          </div>

                        </div>

                      </div>


                      <div
                        className={`shrink-0 text-sm font-black ${
                          playerColor.text
                        }`}
                      >
                        {player.isConnected === false
                          ? "OFFLINE"
                          : "READY ✓"}
                      </div>

                    </div>

                  ) : (

                    <div className="flex items-center gap-4">

                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#5F6F3A]/50 text-xl text-[#A4AE7A]/70">
                        +
                      </div>

                      <div>
                        <p className="font-bold text-[#A4AE7A]/70">
                          WAITING FOR PLAYER...
                        </p>

                        <p className="mt-1 text-xs text-[#7E8B52]">
                          Share the room code to invite a friend
                        </p>
                      </div>

                    </div>

                  )}

                </div>
              );

            })}

          </div>


          {/* Start / wait */}
          <div className="mt-7">

            {isHost && (
              <button
                onClick={handleStartGame}
                disabled={
                  room.players.length < room.maxPlayers
                }
                className="w-full rounded-2xl bg-[#A4AE7A] px-6 py-4 text-lg font-black text-[#38452A] shadow-[0_0_25px_rgba(164,174,122,0.25)] transition hover:bg-[#D8D8C6] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {room.players.length < room.maxPlayers
                  ? `WAITING FOR ${
                      room.maxPlayers -
                      room.players.length
                    } MORE →`
                  : "START GAME →"}
              </button>
            )}

            {!isHost && (
              <div className="rounded-2xl border border-[#7E8B52] bg-black/20 px-5 py-4 text-center">
                <p className="font-bold text-[#D8D8C6]">
                  Waiting for the host to start the game...
                </p>
              </div>
            )}

          </div>


          {/* Leave */}
          <button
            onClick={handleLeaveRoom}
            className="mt-3 w-full rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-3 font-bold text-red-300 transition hover:bg-red-500/20"
          >
            LEAVE ROOM
          </button>

        </div>

      </div>


      {/* Message */}
      {message && (
        <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-[#A4AE7A]/30 bg-[#5F6F3A]/80 px-5 py-3 text-center text-sm text-[#D8D8C6]">
          {message}
        </div>
      )}

    </div>

  </div>
)}


        {/* ------------------------------------------------ */}
        {/* GAME STARTED */}
        {/* ------------------------------------------------ */}

        {game && (

          <div className="rounded-2xl bg-white p-6 shadow-sm">


            <div className="text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl font-bold text-emerald-600">
                ✓
              </div>

              <h2 className="mt-4 text-2xl font-bold">
                Game Started!
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                The room successfully created a game engine state.
              </p>

            </div>


            {/* Game Information */}

            <div className="mt-7 grid grid-cols-2 gap-3">


              <div className="rounded-xl bg-slate-50 p-4">

                <p className="text-xs text-slate-400">
                  Status
                </p>

                <p className="mt-1 font-bold">
                  {game.status}
                </p>

              </div>


              <div className="rounded-xl bg-slate-50 p-4">

                <p className="text-xs text-slate-400">
                  Players
                </p>

                <p className="mt-1 font-bold">
                  {game.players.length}
                </p>

              </div>


              <div className="rounded-xl bg-slate-50 p-4">

                <p className="text-xs text-slate-400">
                  Current Turn
                </p>

                <p className="mt-1 break-all font-bold">
                  {game.currentTurn.playerId}
                </p>

              </div>


              <div className="rounded-xl bg-slate-50 p-4">

                <p className="text-xs text-slate-400">
                  Move Count
                </p>

                <p className="mt-1 font-bold">
                  {game.moveCount}
                </p>

              </div>

            </div>


            {/* Players */}

            <div className="mt-7">

              <h3 className="font-bold">
                Game Players
              </h3>


              <div className="mt-3 space-y-2">

                {game.players.map((player) => (

                  <div
                    key={player.userId}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
                  >

                    <span
                      className={`h-3.5 w-3.5 rounded-full ${
                        player.color === "red"
                          ? "bg-red-500"
                          : player.color === "green"
                          ? "bg-green-500"
                          : player.color === "yellow"
                          ? "bg-yellow-400"
                          : player.color === "blue"
                          ? "bg-blue-500"
                          : player.color === "orange"
                          ? "bg-orange-500"
                          : "bg-purple-500"
                      }`}
                    />

                    <div>

                      <p className="font-semibold">
                        {player.name}
                      </p>

                      <p className="text-xs text-slate-400">
                        {player.userId}
                      </p>

                    </div>

                  </div>

                ))}

              </div>

            </div>

          </div>

        )}

      </div>

    </div>
  );
}

export default App;