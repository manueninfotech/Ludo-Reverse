import { useEffect, useState } from "react";

const API_URL = "http://localhost:5000";

function Profile({ onBack }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  const [editing, setEditing] = useState(false);
const [displayName, setDisplayName] = useState("");
const [avatar, setAvatar] = useState("");
const [saving, setSaving] = useState(false);
const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const accessToken =
          localStorage.getItem("accessToken");

        if (!accessToken) {
          setError("Authentication required.");
          return;
        }

        const response = await fetch(
          `${API_URL}/api/users/me`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Failed to load profile."
          );
        }

        setProfile(data);

        setDisplayName(
        data.user?.displayName || ""
        );

        setAvatar(
        data.user?.avatar || ""
        );
      } catch (error) {
        console.error(
          "Failed to load profile:",
          error
        );

        setError(
          error.message || "Could not load profile."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSaveProfile = async () => {
  try {
    setSaving(true);
    setSaveMessage("");

    const accessToken =
      localStorage.getItem("accessToken");

    if (!accessToken) {
      setSaveMessage("Authentication required.");
      return;
    }

    const response = await fetch(
      `${API_URL}/api/users/me`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: displayName.trim(),
          avatar: avatar.trim(),
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || "Failed to update profile."
      );
    }

    setProfile((previous) => ({
      ...previous,
      user: data.user,
    }));

    setDisplayName(
      data.user?.displayName || ""
    );

    setAvatar(
      data.user?.avatar || ""
    );

    setEditing(false);
    setSaveMessage("Profile updated successfully.");
  } catch (error) {
    console.error(
      "Failed to update profile:",
      error
    );

    setSaveMessage(
      error.message || "Could not update profile."
    );
  } finally {
    setSaving(false);
  }
};

  if (loading) {
    return (
      <div className="min-h-screen bg-[#38452A] px-5 py-8 text-white">
        <div className="mx-auto flex min-h-[80vh] w-full max-w-md items-center justify-center">
          <p className="text-sm font-black tracking-wider text-[#A4AE7A]">
            LOADING PROFILE...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#38452A] px-5 py-8 text-white">
        <div className="mx-auto w-full max-w-md">
          <button
            type="button"
            onClick={onBack}
            className="mb-8 text-sm font-black text-[#A4AE7A]"
          >
            ← BACK
          </button>

          <div className="rounded-3xl border border-red-400/30 bg-red-500/10 p-6 text-center">
            <p className="font-bold text-red-300">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const user = profile?.user || {};
  const stats = profile?.stats || {};

  return (
    <div className="min-h-screen bg-[#38452A] px-5 py-8 text-white">
      <div className="mx-auto w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-black text-[#A4AE7A] transition hover:text-[#D8D8C6]"
          >
            ← BACK
          </button>

          <p className="text-sm font-black tracking-[0.25em] text-[#D8D8C6]/70">
            PROFILE
          </p>

          <div className="w-12" />
        </div>

        {/* Profile Card */}
        <div className="mt-8 rounded-[32px] border border-[#7E8B52] bg-[#2F3A24] p-6">

          {/* Avatar */}
          <div className="flex flex-col items-center text-center">

            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.displayName || "Profile"}
                className="h-24 w-24 rounded-full border-2 border-[#A4AE7A] object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#A4AE7A] bg-[#5F6F3A] text-4xl">
                ♙
              </div>
            )}

            <h1 className="mt-4 text-2xl font-black">
              {user.displayName || "Player"}
            </h1>

            <p className="mt-1 text-sm text-[#D8D8C6]/60">
              @{user.username || "player"}
            </p>

            {!editing && (
            <button
                type="button"
                onClick={() => {
                setEditing(true);
                setSaveMessage("");
                }}
                className="mt-4 rounded-xl border border-[#A4AE7A] px-5 py-2 text-xs font-black text-[#A4AE7A] transition hover:bg-[#A4AE7A] hover:text-[#38452A]"
            >
                EDIT PROFILE
            </button>
            )}

            {editing && (
            <div className="mt-5 w-full space-y-3">

                <input
                type="text"
                value={displayName}
                onChange={(e) =>
                    setDisplayName(e.target.value)
                }
                placeholder="Display name"
                className="w-full rounded-xl border border-[#7E8B52] bg-black/20 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-[#D8D8C6]/40 focus:border-[#A4AE7A]"
                />

                <input
                type="text"
                value={avatar}
                onChange={(e) =>
                    setAvatar(e.target.value)
                }
                placeholder="Profile image URL"
                className="w-full rounded-xl border border-[#7E8B52] bg-black/20 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-[#D8D8C6]/40 focus:border-[#A4AE7A]"
                />

                <div className="flex gap-2">

                <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex-1 rounded-xl bg-[#A4AE7A] px-4 py-3 text-xs font-black text-[#38452A] disabled:opacity-50"
                >
                    {saving ? "SAVING..." : "SAVE"}
                </button>

                <button
                    type="button"
                    onClick={() => {
                    setEditing(false);
                    setDisplayName(
                        user.displayName || ""
                    );
                    setAvatar(user.avatar || "");
                    setSaveMessage("");
                    }}
                    disabled={saving}
                    className="flex-1 rounded-xl border border-[#7E8B52] px-4 py-3 text-xs font-black text-[#D8D8C6]"
                >
                    CANCEL
                </button>

                </div>

                {saveMessage && (
                <p className="text-center text-xs font-bold text-[#A4AE7A]">
                    {saveMessage}
                </p>
                )}

            </div>
            )}
          </div>

          {/* Divider */}
          <div className="my-6 border-t border-[#7E8B52]" />

          {/* Game Statistics */}
          <p className="mb-4 text-xs font-black tracking-[0.2em] text-[#A4AE7A]">
            GAME STATISTICS
          </p>

          <div className="grid grid-cols-2 gap-3">

            {/* Games Played */}
            <div className="rounded-2xl border border-[#7E8B52] bg-black/10 p-4">
              <div className="text-2xl">🎮</div>

              <p className="mt-2 text-2xl font-black">
                {stats.gamesPlayed || 0}
              </p>

              <p className="text-[10px] font-black uppercase tracking-wider text-[#D8D8C6]/60">
                Games Played
              </p>
            </div>

            {/* Games Won */}
            <div className="rounded-2xl border border-[#7E8B52] bg-black/10 p-4">
              <div className="text-2xl">🏆</div>

              <p className="mt-2 text-2xl font-black">
                {stats.gamesWon || 0}
              </p>

              <p className="text-[10px] font-black uppercase tracking-wider text-[#D8D8C6]/60">
                Games Won
              </p>
            </div>

            {/* Games Lost */}
            <div className="rounded-2xl border border-[#7E8B52] bg-black/10 p-4">
              <div className="text-2xl">💔</div>

              <p className="mt-2 text-2xl font-black">
                {stats.gamesLost || 0}
              </p>

              <p className="text-[10px] font-black uppercase tracking-wider text-[#D8D8C6]/60">
                Games Lost
              </p>
            </div>

            {/* Win Streak */}
            <div className="rounded-2xl border border-[#7E8B52] bg-black/10 p-4">
              <div className="text-2xl">🔥</div>

              <p className="mt-2 text-2xl font-black">
                {stats.currentWinStreak || 0}
              </p>

              <p className="text-[10px] font-black uppercase tracking-wider text-[#D8D8C6]/60">
                Win Streak
              </p>
            </div>

            {/* Total Kills */}
            <div className="rounded-2xl border border-[#7E8B52] bg-black/10 p-4">
              <div className="text-2xl">⚔️</div>

              <p className="mt-2 text-2xl font-black">
                {stats.totalKills || 0}
              </p>

              <p className="text-[10px] font-black uppercase tracking-wider text-[#D8D8C6]/60">
                Total Kills
              </p>
            </div>

            {/* Tokens Captured */}
            <div className="rounded-2xl border border-[#7E8B52] bg-black/10 p-4">
              <div className="text-2xl">💥</div>

              <p className="mt-2 text-2xl font-black">
                {stats.totalTokensCaptured || 0}
              </p>

              <p className="text-[10px] font-black uppercase tracking-wider text-[#D8D8C6]/60">
                Tokens Captured
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

export default Profile;