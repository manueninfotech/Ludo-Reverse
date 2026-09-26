import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import LudoBoard from "./components/LudoBoard";
import Profile from "./components/Profile";


const socket = io("http://localhost:5000", {
  autoConnect: false,
});

function GameApp({ onLogout }) {
  const [screen, setScreen] = useState("home");
  const [gameStats, setGameStats] = useState(null);
  const [coins, setCoins] = useState(0);
  const [dailyReward, setDailyReward] = useState(null);
const [showDailyRewardPopup, setShowDailyRewardPopup] = useState(false);
  const [mode, setMode] = useState("create");

  const [selectedPlayerCount, setSelectedPlayerCount] = useState(2);
  const [localPlayerCount, setLocalPlayerCount] = useState(2);
  const [localPlayers, setLocalPlayers] = useState([]);
const [localGame, setLocalGame] = useState(null);
const [localTurnSeconds, setLocalTurnSeconds] = useState(30);

const localCurrentPlayerId =
  localGame?.game?.currentTurn?.playerId || null;

  const [userId, setUserId] = useState(() => {
  const savedUser = localStorage.getItem("user");

  if (savedUser) {
    try {
      const parsedUser = JSON.parse(savedUser);

      if (parsedUser?.userId) {
        return parsedUser.userId;
      }
    } catch (error) {
      console.error("Could not parse authenticated user:", error);
    }
  }

  return "";
});

const [name, setName] = useState(() => {
  const savedUser = localStorage.getItem("user");

  if (savedUser) {
    try {
      const parsedUser = JSON.parse(savedUser);

      if (parsedUser?.displayName) {
        return parsedUser.displayName;
      }
    } catch (error) {
      console.error("Could not parse authenticated user:", error);
    }
  }

  return localStorage.getItem("reverseLudo_name") || "";
});

const [color, setColor] = useState(
  () => localStorage.getItem("reverseLudo_color") || "red"
);

const [roomIdInput, setRoomIdInput] = useState(
  () => localStorage.getItem("reverseLudo_roomId") || ""
);
  const [room, setRoom] = useState(null);
  const [game, setGame] = useState(null);
  const [winner, setWinner] = useState(null);

  const [message, setMessage] = useState("");
  const [connected, setConnected] = useState(false);

  const [diceValue, setDiceValue] = useState(null);  
const [legalMoves, setLegalMoves] = useState([]);
const [selectedCoinId, setSelectedCoinId] = useState(null);
const [reverseMode, setReverseMode] = useState(false);
const [turnSeconds, setTurnSeconds] = useState(null);

  // --------------------------------------------------------
  // Socket Connection
  // --------------------------------------------------------

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");

if (!accessToken) {
  setMessage("Authentication required.");
  return;
}

socket.auth = {
  token: accessToken,
};

socket.connect();

    const handleConnect = () => {
  console.log("Connected:", socket.id);
  setConnected(true);

  const savedUserId =
    localStorage.getItem("reverseLudo_userId");

  const savedRoomId =
    localStorage.getItem("reverseLudo_roomId");

  if (!savedUserId || !savedRoomId) {
    return;
  }

  socket.emit(
    "resume_room",
    {
      roomId: savedRoomId,
      userId: savedUserId,
    },
    (result) => {
      console.log("Resume room:", result);

      if (!result.success) {
        console.log(
          "Could not resume room:",
          result.reason
        );

        return;
      }

      setRoom(result.room);
      setGame(result.game || result.room?.game);

      setRoomIdInput(result.room.roomId);

      // Restore the game screen.
      if (result.room.game) {
        setScreen("game");
      }

      setMessage(
        "Game resumed successfully."
      );
    }
  );
};

const handleConnectError = (error) => {
  console.error("Socket connection error:", error.message);
  setConnected(false);
  setMessage(error.message);
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

  // Show the game screen
  setScreen("game");

  setMessage("Game started!");
};


    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("room_updated", handleRoomUpdated);
    socket.on("game_started", handleGameStarted);
    socket.on("game_finished", async (data) => {
  console.log("Game finished:", data);

  setGame(data.game);

  setWinner(
    data.winner ||
      data.game?.players?.find(
        (player) =>
          player.userId === data.game?.winnerId
      ) ||
      null
  );

  // Get my temporary game statistics
  const myStats =
    data.stats?.[userId] || null;

  console.log("My game statistics:", myStats);

  setGameStats(myStats);

  // Refresh wallet balance after entry fee/reward
  try {
    const accessToken = localStorage.getItem("accessToken");

    if (accessToken) {
      const response = await fetch(
        "http://localhost:5000/api/users/me",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const profileData = await response.json();

        setCoins(
          profileData.user?.coins ??
            profileData.coins ??
            0
        );
      }
    }
  } catch (error) {
    console.error(
      "Failed to refresh coins after game:",
      error
    );
  }

  setDiceValue(null);
  setLegalMoves([]);
  setSelectedCoinId(null);
  setReverseMode(false);
  setTurnSeconds(null);

  setMessage(
    `${data.winner?.name || "Player"} won the game!`
  );
});

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


// --------------------------------------------------------
// LOCAL GAME SOCKET EVENTS
// --------------------------------------------------------

socket.on("local_game_created", (createdLocalGame) => {
  console.log(
    "Local game created:",
    createdLocalGame
  );

  setLocalGame((current) => {
    // If we are already playing another local game,
    // do not replace it with another game's state.
    if (
      current?.gameId &&
      current.gameId !== createdLocalGame.gameId
    ) {
      return current;
    }

    return createdLocalGame;
  });

  setGame((current) => {
    if (
      localGame?.gameId &&
      localGame.gameId !== createdLocalGame.gameId
    ) {
      return current;
    }

    return createdLocalGame.game;
  });

  setDiceValue(null);
  setLegalMoves([]);
  setReverseMode(false);

  setScreen("localGame");

  setMessage(
    "Local game started!"
  );
});

socket.on("local_turn_timer", (data) => {
  console.log("Local turn timer:", data);

  setLocalTurnSeconds(data.remainingSeconds);
});

socket.on("local_dice_rolled", (data) => {
  console.log(
    "Local dice rolled:",
    data
  );

  setGame(data.game);
  setLocalGame((current) =>
    current
      ? {
          ...current,
          game: data.game,
        }
      : current
  );

  setDiceValue(
    data.diceValue
  );

  setLegalMoves(
    data.legalMoves || []
  );

  setReverseMode(false);

  const currentPlayer =
    data.game.players.find(
      (player) =>
        player.userId ===
        data.game.currentTurn.playerId
    );

  setMessage(
    `${currentPlayer?.name || "Player"} rolled ${data.diceValue}`
  );
});

socket.on("local_coin_moved", (data) => {
  console.log(
    "Local coin moved:",
    data
  );

  setGame(data.game);

  setLocalGame((current) =>
    current
      ? {
          ...current,
          game: data.game,
        }
      : current
  );

  setDiceValue(null);
  setLegalMoves([]);
  setSelectedCoinId(null);
  setReverseMode(false);

  if (data.capture?.killed) {
    setMessage(
      `Captured ${data.capture.killedCoins.length} coin(s)!`
    );
  } else {
    setMessage(
      "Coin moved."
    );
  }
});

socket.on("local_turn_changed", (data) => {
  console.log(
    "Local turn changed:",
    data
  );

  setGame(data.game);

  setLocalGame((current) =>
    current
      ? {
          ...current,
          game: data.game,
        }
      : current
  );

  setDiceValue(null);
  setLegalMoves([]);
  setSelectedCoinId(null);
  setReverseMode(false);

  const currentPlayer =
    data.game.players.find(
      (player) =>
        player.userId ===
        data.game.currentTurn.playerId
    );

  setMessage(
    `Pass the device to ${currentPlayer?.name || "next player"}`
  );
});


socket.on("local_game_finished", (data) => {
  console.log(
    "Local game finished:",
    data
  );

  setGame(data.game);

  setLocalGame((current) =>
    current
      ? {
          ...current,
          game: data.game,
        }
      : current
  );

  setDiceValue(null);
  setLegalMoves([]);
  setSelectedCoinId(null);
  setReverseMode(false);

  const winner =
    data.game.players.find(
      (player) =>
        player.userId ===
        data.game.winnerId
    );

  setWinner(winner || null);

  setMessage(
    `${winner?.name || "Player"} won the game!`
  );
});


    // Socket may already be connected
    if (socket.connected) {
  setConnected(true);

  const savedUserId =
    localStorage.getItem("reverseLudo_userId");

  const savedRoomId =
    localStorage.getItem("reverseLudo_roomId");

  if (savedUserId && savedRoomId) {
    socket.emit(
      "resume_room",
      {
        roomId: savedRoomId,
        userId: savedUserId,
      },
      (result) => {
        console.log(
          "Resume room:",
          result
        );

        if (!result.success) {
          return;
        }

        setRoom(result.room);
        setGame(
          result.game ||
          result.room?.game
        );

        setRoomIdInput(
          result.room.roomId
        );

        if (result.room.game) {
          setScreen("game");
        }

        setMessage(
          "Game resumed successfully."
        );
      }
    );
  }
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
      socket.off("game_finished");
      socket.off("local_game_created");
      socket.off("local_dice_rolled");
      socket.off("local_coin_moved");
      socket.off("local_turn_changed");
      socket.off("local_game_finished");
      socket.off("connect_error", handleConnectError);
    };

  }, []);

  useEffect(() => {
  const fetchCoins = async () => {
    try {
      const accessToken =
        localStorage.getItem("accessToken");

      if (!accessToken) return;

      const response = await fetch(
        "http://localhost:5000/api/users/me",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }

      const data = await response.json();

      setCoins(data.user?.coins ?? data.coins ?? 0);
    } catch (error) {
      console.error(
        "Failed to fetch coins:",
        error
      );
    }
  };

  fetchCoins();
}, []);

useEffect(() => {
  const fetchDailyReward = async () => {
    try {
      const accessToken =
        localStorage.getItem("accessToken");

      if (!accessToken) return;

      const response = await fetch(
        "http://localhost:5000/api/daily-rewards",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch daily reward"
        );
      }

      const data = await response.json();

      if (data.success) {
        setDailyReward(data.reward);

        if (data.reward.canClaim) {
          setShowDailyRewardPopup(true);
        }
      }
    } catch (error) {
      console.error(
        "Failed to fetch daily reward:",
        error
      );
    }
  };

  fetchDailyReward();
}, []);


  // --------------------------------------------------------
  // Create Room
  // --------------------------------------------------------

  const handleCreateRoom = () => {
  if (!name.trim()) {
    setMessage("Enter your player name.");
    return;
  }

localStorage.setItem(
  "reverseLudo_name",
  name.trim()
);

localStorage.setItem(
  "reverseLudo_color",
  color
);

  socket.emit(
    "create_room",
    {
      hostId: userId,
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
            localStorage.setItem(
        "reverseLudo_roomId",
        result.room.roomId
      );
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

localStorage.setItem(
  "reverseLudo_name",
  name.trim()
);

localStorage.setItem(
  "reverseLudo_color",
  color
);

localStorage.setItem(
  "reverseLudo_roomId",
  roomIdInput.trim().toUpperCase()
);

  socket.emit(
    "join_room",
    {
      roomId: roomIdInput.trim().toUpperCase(),
      userId: userId,
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
  if (
    !room ||
    !game ||
    game.status !== "playing"
  ) {
    return;
  }

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

  const handleClaimDailyReward = async () => {
  try {
    const accessToken =
      localStorage.getItem("accessToken");

    if (!accessToken) {
      setMessage("Authentication required.");
      return;
    }

    const response = await fetch(
      "http://localhost:5000/api/daily-rewards/claim",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      setMessage(
        data.message || "Failed to claim daily reward."
      );
      return;
    }

    const claimedAmount =
      data.result?.rewardAmount || 0;

    setCoins((currentCoins) =>
      currentCoins + claimedAmount
    );

    setShowDailyRewardPopup(false);

    setMessage(
      `🎉 You received ${claimedAmount} coins!`
    );

    // Refresh reward status
    const rewardResponse = await fetch(
      "http://localhost:5000/api/daily-rewards",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (rewardResponse.ok) {
      const rewardData =
        await rewardResponse.json();

      if (rewardData.success) {
        setDailyReward(rewardData.reward);
      }
    }
  } catch (error) {
    console.error(
      "Failed to claim daily reward:",
      error
    );

    setMessage(
      "Something went wrong while claiming your reward."
    );
  }
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
// LOCAL GAME - DICE ROLL
// --------------------------------------------------------

const handleLocalRollDice = () => {
  if (
    !localGame?.game ||
    localGame.game.status !== "playing"
  ) {
    return;
  }

  const currentPlayerId =
    localGame.game.currentTurn.playerId;

  socket.emit(
    "local_roll_dice",
    {
      gameId: localGame.gameId,
      playerId: currentPlayerId,
    },
    (response) => {
      console.log(
        "Local roll dice:",
        response
      );

      if (!response.success) {
        setMessage(response.reason);
        return;
      }

      setLocalGame((current) =>
        current
          ? {
              ...current,
              game: response.game,
            }
          : current
      );

      setGame(response.game);

      setDiceValue(
        response.diceValue
      );

      setLegalMoves(
        response.legalMoves || []
      );

      setReverseMode(false);

      const currentPlayer =
        response.game.players.find(
          (player) =>
            player.userId ===
            response.game.currentTurn.playerId
        );

      setMessage(
        `${currentPlayer?.name || "Player"} rolled ${response.diceValue}`
      );
    }
  );
};


// --------------------------------------------------------
// LOCAL GAME - COIN MOVEMENT
// --------------------------------------------------------

const handleLocalMoveCoin = (
  coinId
) => {
  if (
    !localGame?.game ||
    !coinId
  ) {
    return;
  }

  const game =
    localGame.game;

  const playerId =
    game.currentTurn.playerId;

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
    "local_move_coin",
    {
      gameId:
        localGame.gameId,
      playerId,
      coinId,
      direction,
    },
    (response) => {
      console.log(
        "Local move coin:",
        response
      );

      if (!response.success) {
        setMessage(
          response.reason
        );
        return;
      }

      setLocalGame((current) =>
        current
          ? {
              ...current,
              game: response.game,
            }
          : current
      );

      setGame(response.game);

      setDiceValue(null);
      setLegalMoves([]);
      setSelectedCoinId(null);
      setReverseMode(false);

      if (
        response.capture?.killed
      ) {
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

        localStorage.removeItem(
  "reverseLudo_roomId"
);

localStorage.removeItem(
  "reverseLudo_name"
);

localStorage.removeItem(
  "reverseLudo_color"
);

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

 const currentPlayer = room?.players?.find(
  (player) => player.userId === userId
);

const isHost =
  currentPlayer?.isHost === true;


  const isMyTurn =
  game?.currentTurn?.playerId === userId;

const hasRolled =
  game?.currentTurn?.hasRolled === true;

const backwardMoves =
  (legalMoves || []).filter(
    (move) =>
      move.direction === "backward"
  );

const canUseReverse =
  isMyTurn &&
  hasRolled &&
  game?.currentTurn?.backwardAllowed === true &&
  backwardMoves.length > 0;


const rankedPlayers = (game?.finishOrder || [])
  .map((userId) =>
    game?.players?.find(
      (player) => player.userId === userId
    )
  )
  .filter(Boolean);

  // --------------------------------------------------------
  // UI
  // --------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#38452A] text-white">
    {screen === "home" && (
  <div className="min-h-screen bg-[#38452A] px-5 py-8 text-white">

    <div className="mx-auto w-full max-w-md">
      {showDailyRewardPopup && dailyReward?.canClaim && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5">
    <div className="w-full max-w-sm rounded-3xl border border-[#7E8B52] bg-[#38452A] p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.45)]">

      <div className="text-5xl">
        🎁
      </div>

      <p className="mt-4 text-sm font-bold uppercase tracking-widest text-[#A4AE7A]">
        DAILY REWARD
      </p>

      <h2 className="mt-2 text-3xl font-black text-white">
        DAY {dailyReward.currentDay}
      </h2>

      <div className="mt-5 rounded-2xl border border-[#A4AE7A]/30 bg-[#5F6F3A]/60 px-5 py-5">
        <p className="text-sm text-[#D8D8C6]/80">
          Today's reward
        </p>

        <p className="mt-2 text-4xl font-black text-[#A4AE7A]">
          🪙 {dailyReward.rewardAmount}
        </p>
      </div>

      <button
        type="button"
        onClick={handleClaimDailyReward}
        className="mt-6 w-full rounded-2xl bg-[#A4AE7A] px-6 py-4 text-lg font-black text-[#38452A] transition hover:bg-[#D8D8C6]"
      >
        CLAIM REWARD →
      </button>

      <button
        type="button"
        onClick={() => {
          setShowDailyRewardPopup(false);
        }}
        className="mt-3 text-sm font-bold text-[#D8D8C6]/70 transition hover:text-white"
      >
        Maybe later
      </button>

    </div>
  </div>
)}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
  <div>
    <p className="text-sm text-[#D8D8C6]">
      Hi
    </p>

    <h1 className="text-3xl font-black">
      {JSON.parse(localStorage.getItem("user") || "{}")?.displayName ||
        name ||
        "Player"}
    </h1>

    <p className="mt-1 text-sm text-[#D8D8C6]">
      Ready to make your move?
    </p>
  </div>

  <div className="flex items-center gap-2">
    <div className="rounded-2xl border border-[#7E8B52] bg-[#5F6F3A]/80 px-4 py-2">
      🪙 <span className="font-bold">{coins.toLocaleString()}</span>
      <span className="ml-2 text-lg">＋</span>
    </div>

    <button
      type="button"
      onClick={onLogout}
      className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm font-black text-red-300 transition hover:bg-red-500/20"
    >
      LOG OUT
    </button>
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
          onClick={() => {
            setLocalPlayerCount(2);
            setScreen("localMode");
          }}
          className="rounded-3xl border border-[#A4AE7A] bg-[#5F6F3A]/80 p-5 text-left shadow-[0_0_25px_rgba(164,174,122,0.18)] transition hover:bg-[#7E8B52]"
        >
          <div className="text-3xl">🎮</div>

          <p className="mt-4 text-lg font-black">
            LOCAL GAME
          </p>

          <p className="mt-1 text-sm text-[#D8D8C6]">
            Pass & play on this device
          </p>

          <div className="mt-4 text-right text-2xl text-[#A4AE7A]">
            →
          </div>
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

        <button
          type="button"
          onClick={() => setScreen("profile")}
          className="text-center text-[#D8D8C6]/70 transition hover:text-[#A4AE7A]"
        >
          <div className="text-2xl">♙</div>
          <p className="mt-1 text-xs font-black">
            PROFILE
          </p>
        </button>

        <button
          type="button"
          onClick={() => setScreen("rewards")}
          className="text-center text-[#D8D8C6]/70 transition hover:text-[#A4AE7A]"
        >
          <div className="text-2xl">🏆</div>
          <p className="mt-1 text-xs font-black">
            REWARDS
          </p>
        </button>

      </div>

    </div>

  </div>
)}

{screen === "rewards" && (
  <div className="min-h-screen bg-[#38452A] px-5 py-8 text-white">

    <div className="mx-auto w-full max-w-md">

      {/* Header */}
      <div className="flex items-center justify-between">

        <button
          type="button"
          onClick={() => setScreen("home")}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#7E8B52] bg-[#5F6F3A] text-xl"
        >
          ←
        </button>

        <div className="text-xl font-black tracking-wide">
          DAILY REWARDS
        </div>

        <div className="w-11" />

      </div>

      {/* Heading */}
      <div className="mt-10 text-center">

        <div className="text-5xl">
          🎁
        </div>

        <h1 className="mt-4 text-3xl font-black">
          DAILY REWARD
        </h1>

        <p className="mt-2 text-sm text-[#D8D8C6]">
          Claim your reward every 24 hours
        </p>

      </div>

      {/* Current Reward */}
      {dailyReward && (
        <div className="mt-8 rounded-3xl border border-[#7E8B52] bg-[#5F6F3A]/70 p-6 text-center">

          <p className="text-xs font-bold uppercase tracking-widest text-[#D8D8C6]/70">
            NEXT REWARD
          </p>

          <p className="mt-2 text-2xl font-black">
            DAY {dailyReward.currentDay}
          </p>

          <p className="mt-3 text-4xl font-black text-[#A4AE7A]">
            🪙 {dailyReward.rewardAmount}
          </p>

          {dailyReward.canClaim ? (
            <button
              type="button"
              onClick={handleClaimDailyReward}
              className="mt-6 w-full rounded-2xl bg-[#A4AE7A] px-6 py-4 text-lg font-black text-[#38452A] transition hover:bg-[#D8D8C6]"
            >
              CLAIM REWARD →
            </button>
          ) : (
            <div className="mt-6 rounded-2xl border border-[#A4AE7A]/20 bg-black/10 px-4 py-4">

              <p className="text-sm font-bold text-[#D8D8C6]">
                Reward already claimed
              </p>

              {dailyReward.nextClaimAt && (
                <p className="mt-1 text-xs text-[#D8D8C6]/60">
                  Next reward available in 24 hours
                </p>
              )}

            </div>
          )}

        </div>
      )}

      {/* 7 Day Rewards */}
      <div className="mt-8">

        <h2 className="text-lg font-black">
          7 DAY REWARD CYCLE
        </h2>

        <div className="mt-4 space-y-3">

          {[
            { day: 1, coins: 50 },
            { day: 2, coins: 75 },
            { day: 3, coins: 100 },
            { day: 4, coins: 125 },
            { day: 5, coins: 150 },
            { day: 6, coins: 200 },
            { day: 7, coins: 500 },
          ].map((reward) => {

            const isCurrent =
              dailyReward?.currentDay === reward.day;

            return (
              <div
                key={reward.day}
                className={`flex items-center justify-between rounded-2xl border px-5 py-4 ${
                  isCurrent
                    ? "border-[#A4AE7A] bg-[#A4AE7A]/15"
                    : "border-[#7E8B52] bg-[#5F6F3A]/50"
                }`}
              >

                <div className="flex items-center gap-4">

                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black ${
                      isCurrent
                        ? "bg-[#A4AE7A] text-[#38452A]"
                        : "bg-[#38452A] text-[#D8D8C6]"
                    }`}
                  >
                    {reward.day}
                  </div>

                  <div>
                    <p className="font-black">
                      DAY {reward.day}
                    </p>

                    {isCurrent && (
                      <p className="text-xs text-[#A4AE7A]">
                        NEXT REWARD
                      </p>
                    )}
                  </div>

                </div>

                <p className="text-lg font-black text-[#A4AE7A]">
                  🪙 {reward.coins}
                </p>

              </div>
            );
          })}

        </div>

      </div>

    </div>

  </div>
)}

{screen === "profile" && (
  <Profile
    onBack={() => setScreen("home")}
  />
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

{screen === "localMode" && (
  <div className="min-h-screen bg-[#38452A] px-5 py-8 text-white">

    <div className="mx-auto w-full max-w-md">

      {/* Header */}
      <div className="flex items-center justify-between">

        <button
          type="button"
          onClick={() => setScreen("home")}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#7E8B52] bg-[#5F6F3A] text-xl transition hover:border-[#A4AE7A]"
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
          LOCAL
        </h1>

        <h1 className="text-3xl font-black text-[#A4AE7A]">
          PASS & PLAY
        </h1>

        <p className="mt-3 text-sm text-[#D8D8C6]">
          Pass the device after every turn.
        </p>

      </div>

      {/* Player count */}
      <div className="mt-8">

        <p className="mb-4 text-center text-xs font-black uppercase tracking-[0.2em] text-[#D8D8C6]/70">
          NUMBER OF PLAYERS
        </p>

        <div className="grid grid-cols-2 gap-4">

          {[2, 3, 4, 5, 6, 7, 8].map((count) => {

            const selected =
              localPlayerCount === count;

            return (
              <button
                key={count}
                type="button"
                onClick={() =>
                  setLocalPlayerCount(count)
                }
                className={`relative rounded-3xl border p-6 text-center transition ${
                  selected
                    ? "border-[#A4AE7A] bg-[#5F6F3A] shadow-[0_0_25px_rgba(164,174,122,0.25)]"
                    : "border-[#7E8B52] bg-[#5F6F3A]/70 hover:border-[#A4AE7A]"
                } ${
                  count === 7 || count === 8
                    ? "col-span-2"
                    : ""
                }`}
              >

                {selected && (
                  <div className="absolute right-3 top-3 text-[#A4AE7A]">
                    ✓
                  </div>
                )}

                <div className="text-3xl">
                  {"♟️".repeat(count)}
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
                    "Six-player battle"}

                  {count === 7 &&
                    "Seven-player battle"}

                  {count === 8 &&
                    "Ultimate eight-player battle"}

                </p>

              </button>
            );

          })}

        </div>

      </div>

      {/* Continue */}
      <button
        type="button"
        onClick={() => {
          setLocalPlayers(
            Array.from(
              { length: localPlayerCount },
              (_, index) => ({
                id: `local-player-${index + 1}`,
                name: `Player ${index + 1}`,
              })
            )
          );

          setScreen("localPlayers");
        }}
        className="mt-8 w-full rounded-2xl bg-[#A4AE7A] px-6 py-4 text-lg font-black text-[#38452A] shadow-[0_0_25px_rgba(164,174,122,0.28)] transition hover:bg-[#D8D8C6]"
      >
        CONTINUE →
      </button>

    </div>

  </div>
)}

{screen === "localPlayers" && (
  <div className="min-h-screen bg-[#38452A] px-5 py-8 text-white">

    <div className="mx-auto w-full max-w-md">

      {/* Header */}
      <div className="flex items-center justify-between">

        <button
          type="button"
          onClick={() => setScreen("localMode")}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#7E8B52] bg-[#5F6F3A] text-xl transition hover:border-[#A4AE7A]"
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
          SET UP YOUR
        </h1>

        <h1 className="text-3xl font-black text-[#A4AE7A]">
          PLAYERS
        </h1>

        <p className="mt-3 text-sm text-[#D8D8C6]">
          Enter a name for each player.
        </p>

      </div>

      {/* Player Cards */}
      <div className="mt-8 space-y-4">

        {localPlayers.map((player, index) => {

          const playerColors = [
            {
              color: "red",
              icon: "🔴",
              text: "text-red-300",
              border: "border-red-500/60",
            },
            {
              color: "green",
              icon: "🟢",
              text: "text-green-300",
              border: "border-green-500/60",
            },
            {
              color: "yellow",
              icon: "🟡",
              text: "text-yellow-200",
              border: "border-yellow-400/60",
            },
            {
              color: "blue",
              icon: "🔵",
              text: "text-blue-300",
              border: "border-blue-500/60",
            },
            {
              color: "orange",
              icon: "🟠",
              text: "text-orange-300",
              border: "border-orange-500/60",
            },
            {
              color: "purple",
              icon: "🟣",
              text: "text-purple-300",
              border: "border-purple-500/60",
            },
            {
              color: "pink",
              icon: "🩷",
              text: "text-pink-300",
              border: "border-pink-500/60",
            },
            {
              color: "cyan",
              icon: "🩵",
              text: "text-cyan-300",
              border: "border-cyan-500/60",
            },
          ][index];

          return (
            <div
              key={player.id}
              className={`rounded-3xl border ${playerColors.border} bg-[#5F6F3A]/70 p-5`}
            >

              {/* Player heading */}
              <div className="flex items-center gap-3">

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/20 text-2xl">
                  {playerColors.icon}
                </div>

                <div>
                  <p className={`text-xs font-black uppercase tracking-wider ${playerColors.text}`}>
                    {playerColors.color}
                  </p>

                  <p className="text-lg font-black">
                    PLAYER {index + 1}
                  </p>
                </div>

              </div>

              {/* Name input */}
              <input
                type="text"
                value={player.name}
                maxLength={20}
                onChange={(event) => {

                  const value =
                    event.target.value;

                  setLocalPlayers((previous) =>
                    previous.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            name: value,
                          }
                        : item
                    )
                  );

                }}
                placeholder={`Player ${index + 1}`}
                className="mt-4 w-full rounded-2xl border border-[#7E8B52] bg-black/20 px-4 py-3 text-white outline-none placeholder:text-[#D8D8C6]/40 focus:border-[#A4AE7A]"
              />

            </div>
          );

        })}

      </div>

      {/* Start Game */}
      <button
        type="button"
        onClick={() => {
              if (!localPlayers.length) {
                setMessage(
                  "Add at least 2 players."
                );
                return;
              }

              socket.emit(
                "create_local_game",
                {
                  players: localPlayers.map(
                    (player) => ({
                      name:
                        player.name.trim() ||
                        "Player",
                    })
                  ),
                },
                (response) => {
                  console.log(
                    "Create local game:",
                    response
                  );

                  if (!response.success) {
                    setMessage(
                      response.reason
                    );
                    return;
                  }

                  setLocalGame(
                    response.localGame
                  );

                  setGame(
                    response.localGame.game
                  );

                  setDiceValue(null);
                  setLegalMoves([]);
                  setReverseMode(false);
                  setMessage(
                    "Local game started!"
                  );

                  setScreen(
                    "localGame"
                  );
                }
              );
            }}
              className="mt-8 w-full rounded-2xl bg-[#A4AE7A] px-6 py-4 text-lg font-black text-[#38452A] shadow-[0_0_25px_rgba(164,174,122,0.28)] transition hover:bg-[#D8D8C6]"
            >
              START LOCAL GAME →
            </button>

          </div>

        </div>
      )}

      {screen === "localGame" && (
  <div className="min-h-screen bg-[#38452A] px-4 py-6 text-white">

    <div className="mx-auto w-full max-w-4xl">

      {/* HEADER */}
      <div className="flex items-center justify-between gap-3">

        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#A4AE7A]">
            LOCAL / PASS & PLAY
          </p>

          <h1 className="mt-1 text-2xl font-black">
            Reverse Ludo
          </h1>
        </div>

        <button
          type="button"
          onClick={() => {
            setLocalGame(null);
            setGame(null);
            setDiceValue(null);
            setLegalMoves([]);
            setReverseMode(false);
            setScreen("home");
          }}
          className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm font-black text-red-300"
        >
          EXIT
        </button>

      </div>


      {/* CURRENT PLAYER */}
      {/* CURRENT PLAYER + TURN TIMER */}
      {localGame?.game && (
        <div className="mt-5 rounded-2xl border border-[#A4AE7A]/40 bg-[#5F6F3A]/70 p-4">

          <p className="text-xs font-bold uppercase tracking-wider text-[#D8D8C6]/70">
            Current Turn
          </p>

          <div className="mt-2 flex items-center justify-between gap-3">

            <div>
              <p className="text-xl font-black">
                {
                  localGame.game.players.find(
                    (player) =>
                      player.userId ===
                      localGame.game.currentTurn.playerId
                  )?.name ||
                  "Player"
                }
              </p>

              <p className="mt-1 text-xs text-[#D8D8C6]/70">
                Pass the device after this turn
              </p>
            </div>

            {/* TIMER */}
            <div className="flex flex-col items-center">

              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full border-4 ${
                  localTurnSeconds <= 10
                    ? "border-red-400 bg-red-500/20"
                    : "border-[#A4AE7A] bg-[#38452A]"
                }`}
              >
                <span
                  className={`text-2xl font-black ${
                    localTurnSeconds <= 10
                      ? "text-red-300"
                      : "text-[#D8D8C6]"
                  }`}
                >
                  {localTurnSeconds}
                </span>
              </div>

              <span className="mt-1 text-[9px] font-black uppercase tracking-wider text-[#D8D8C6]/60">
                Seconds
              </span>

            </div>

          </div>

        </div>
      )}


      {/* LUDO BOARD */}
      {localGame?.game?.status === "playing" && (
        <div className="mt-5 rounded-2xl border border-[#7E8B52] bg-[#38452A] p-3 sm:p-5">

          <LudoBoard
            game={localGame.game}
            userId={localCurrentPlayerId}
            legalMoves={legalMoves}
            reverseMode={reverseMode}
            onCoinClick={handleLocalMoveCoin}
          />

        </div>
      )}


      {/* DICE CONTROLS */}
      {localGame?.game?.status === "playing" && (
        <div className="mt-5 rounded-2xl border border-[#7E8B52] bg-[#5F6F3A]/70 p-5 text-center">

          <button
            type="button"
            onClick={handleLocalRollDice}
            disabled={
              localGame.game.currentTurn.hasRolled
            }
            className="rounded-2xl border border-[#A4AE7A] bg-[#7E8B52] px-8 py-4 text-lg font-black text-white transition hover:bg-[#A4AE7A] disabled:cursor-not-allowed disabled:opacity-40"
          >
            🎲 ROLL DICE
          </button>


          {diceValue && (
            <div className="mt-4">

              <p className="text-xs font-bold uppercase tracking-wider text-[#D8D8C6]/70">
                Dice
              </p>

              <p className="mt-1 text-5xl font-black text-[#A4AE7A]">
                {diceValue}
              </p>

            </div>
          )}

          {localGame.game.currentTurn.hasRolled && (
  <div className="mt-5 flex justify-center">
    <button
      type="button"
      onClick={() =>
        setReverseMode((previous) => !previous)
      }
      disabled={
        localGame.game.currentTurn.backwardAllowed !== true ||
        !legalMoves.some(
          (move) => move.direction === "backward"
        )
      }
      className={`rounded-2xl border px-5 py-3 font-black transition ${
        reverseMode
          ? "border-[#D8D8C6] bg-[#A4AE7A] text-[#38452A] shadow-[0_0_20px_rgba(164,174,122,0.35)]"
          : "border-[#7E8B52] bg-[#5F6F3A] text-[#D8D8C6]"
      } ${
        localGame.game.currentTurn.backwardAllowed !== true ||
        !legalMoves.some(
          (move) => move.direction === "backward"
        )
          ? "cursor-not-allowed opacity-40"
          : "hover:border-[#A4AE7A]"
      }`}
    >
      ↻
      <span className="ml-2">
        {reverseMode ? "REVERSE ON" : "REVERSE"}
      </span>
    </button>
  </div>
)}
          {message && (
            <p className="mt-4 text-sm font-semibold text-[#D8D8C6]">
              {message}
            </p>
          )}

        </div>
      )}


      {/* PLAYERS */}
      

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
          🪙 <span className="font-bold">{coins.toLocaleString()}</span>
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

        {screen === "game" && game?.status === "playing" && (
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
                  game.status !== "playing" ||
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

        {game && game.status === "finished" && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm">
    <div className="w-full max-w-md overflow-hidden rounded-[32px] border border-[#A4AE7A]/40 bg-[#38452A] shadow-[0_25px_80px_rgba(0,0,0,0.5)]">

      {/* Result Header */}
      <div className="px-6 pb-5 pt-8 text-center">

        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#A4AE7A]/20 text-4xl">
          {gameStats?.result === "won" ? "🏆" : "💔"}
        </div>

        <p className="mt-5 text-sm font-black tracking-[0.25em] text-[#A4AE7A]">
          GAME COMPLETED
        </p>

        <h1 className="mt-2 text-4xl font-black text-white">
          {gameStats?.result === "won"
            ? "YOU WON!"
            : "YOU LOST"}
        </h1>

        <p className="mt-2 text-lg font-bold text-[#D8D8C6]">
          {gameStats?.result === "won"
            ? "Congratulations! 🎉"
            : `${winner?.name || "The winner"} won the game`}
        </p>

      </div>

      {/* My Game Statistics */}
      <div className="grid grid-cols-2 gap-3 px-6 pb-6">

        {/* Kills */}
        <div className="rounded-2xl border border-[#7E8B52] bg-black/10 p-4 text-center">
          <div className="text-2xl">⚔️</div>

          <p className="mt-2 text-2xl font-black text-white">
            {gameStats?.kills || 0}
          </p>

          <p className="text-[10px] font-black uppercase tracking-wider text-[#D8D8C6]/60">
            Kills
          </p>
        </div>

        {/* Tokens Captured */}
        <div className="rounded-2xl border border-[#7E8B52] bg-black/10 p-4 text-center">
          <div className="text-2xl">💥</div>

          <p className="mt-2 text-2xl font-black text-white">
            {gameStats?.tokensCaptured || 0}
          </p>

          <p className="text-[10px] font-black uppercase tracking-wider text-[#D8D8C6]/60">
            Tokens Captured
          </p>
        </div>

        {/* Win Streak */}
        <div className="rounded-2xl border border-[#7E8B52] bg-black/10 p-4 text-center">
          <div className="text-2xl">🔥</div>

          <p className="mt-2 text-2xl font-black text-white">
            {gameStats?.winStreak || 0}
          </p>

          <p className="text-[10px] font-black uppercase tracking-wider text-[#D8D8C6]/60">
            Win Streak
          </p>
        </div>

        {/* Coins */}
        <div className="rounded-2xl border border-[#7E8B52] bg-black/10 p-4 text-center">
          <div className="text-2xl">🪙</div>

          <p className="mt-2 text-2xl font-black text-white">
            {gameStats?.coinsEarned ?? 0}
          </p>

          <p className="text-[10px] font-black uppercase tracking-wider text-[#D8D8C6]/60">
            Coins Earned
          </p>
        </div>

      </div>

      {/* Players */}
      <div className="space-y-3 px-6 pb-6">

        {rankedPlayers.map((player, index) => {
          const isWinner =
            player.userId === game.winnerId;

          const position = index + 1;

          const finishedCoins =
            player.coins?.filter(
              (coin) =>
                coin.area === "finished"
            ).length || 0;

          return (
            <div
              key={player.userId}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                isWinner
                  ? "border-[#A4AE7A] bg-[#A4AE7A]/15"
                  : "border-[#7E8B52] bg-black/10"
              }`}
            >

              <div className="flex items-center gap-3">

                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full ${
                    isWinner
                      ? "bg-[#A4AE7A]/25"
                      : "bg-white/5"
                  }`}
                >
                  {isWinner ? "🏆" : index + 1}
                </div>

                <div>
                <p className="font-black text-white">
                  {player.name}
                </p>

                <p className="text-xs font-bold text-[#A4AE7A]">
                  {position === 1
                    ? "🥇 1ST PLACE"
                    : position === 2
                    ? "🥈 2ND PLACE"
                    : position === 3
                    ? "🥉 3RD PLACE"
                    : `${position}TH PLACE`}
                </p>
              </div>

              </div>

              <div className="text-right">
                <p className="font-black text-[#D8D8C6]">
                  {finishedCoins}/4
                </p>

                <p className="text-[10px] uppercase tracking-wider text-[#A4AE7A]/70">
                  Finished
                </p>
              </div>

            </div>
          );
        })}

      </div>

      {/* Actions */}
      <div className="space-y-3 border-t border-[#7E8B52] px-6 py-5">

        <button
          onClick={() => {
            setGameStats(null);
            setRoom(null);
            setGame(null);
            setWinner(null);
            setScreen("home");

            localStorage.removeItem(
              "reverseLudo_roomId"
            );
          }}
          className="w-full rounded-2xl bg-[#A4AE7A] px-5 py-4 font-black text-[#38452A] transition hover:bg-[#D8D8C6]"
        >
          CONTINUE
        </button>

        <button
          onClick={() => {
            setGameStats(null);
            setRoom(null);
            setGame(null);
            setWinner(null);
            setScreen("home");

            localStorage.removeItem(
              "reverseLudo_roomId"
            );
          }}
          className="w-full rounded-2xl border border-[#7E8B52] bg-transparent px-5 py-4 font-black text-[#D8D8C6]"
        >
          HOME
        </button>

      </div>

    </div>
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
          🪙 <span className="font-bold">{coins.toLocaleString()}</span>
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

          <div className="mt-4 rounded-2xl border border-[#A4AE7A]/40 bg-[#A4AE7A]/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#D8D8C6]/70">
                  ENTRY FEE
                </p>

                <p className="mt-1 text-lg font-black text-white">
                  🪙 100 COINS
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-[#D8D8C6]/70">
                  Your balance
                </p>

                <p className="mt-1 font-black text-[#A4AE7A]">
                  🪙 {coins.toLocaleString()}
                </p>
              </div>
            </div>
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
        room.players.length < room.maxPlayers ||
        coins < 100
      }
      className="w-full rounded-2xl bg-[#A4AE7A] px-6 py-4 text-lg font-black text-[#38452A] shadow-[0_0_25px_rgba(164,174,122,0.25)] transition hover:bg-[#D8D8C6] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {room.players.length < room.maxPlayers
        ? `WAITING FOR ${
            room.maxPlayers -
            room.players.length
          } MORE →`
        : coins < 100
        ? "NOT ENOUGH COINS"
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

        {/*
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
        */}
        

      </div>

    </div>
  );
}

export default GameApp;