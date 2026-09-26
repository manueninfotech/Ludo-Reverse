import { useEffect, useState } from "react";
import AuthPage from "./pages/AuthPage";
import GameApp from "./GameApp";
import {
  getAccessToken,
  getRefreshToken,
  isTokenExpired,
  refreshAccessToken,
} from "./utils/auth";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();

      if (!accessToken && !refreshToken) {
        setIsAuthenticated(false);
        setAuthLoading(false);
        return;
      }

      if (accessToken && !isTokenExpired(accessToken)) {
        setIsAuthenticated(true);
        setAuthLoading(false);
        return;
      }

      const newAccessToken = await refreshAccessToken();

      if (newAccessToken) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }

      setAuthLoading(false);
    };

    restoreSession();
  }, []);

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    const API_URL = import.meta.env.VITE_API_URL;

    try {
      if (refreshToken) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            refreshToken,
          }),
        });
      }
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("reverseLudo_userId");
      localStorage.removeItem("reverseLudo_name");
      localStorage.removeItem("reverseLudo_color");
      localStorage.removeItem("reverseLudo_roomId");

      setIsAuthenticated(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#420D4B] text-white">
        <div className="text-center">
          <div className="text-2xl font-bold">Reverse Ludo</div>
          <div className="mt-2 text-sm opacity-80">
            Restoring your session...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage onAuthenticated={handleAuthenticated} />;
  }

  return <GameApp onLogout={handleLogout} />;
}

export default App;