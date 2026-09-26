import { useEffect, useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const AuthPage = ({ onAuthenticated }) => {
  const googleButtonRef = useRef(null);

  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    identifier: "",
    username: "",
    email: "",
    displayName: "",
    password: "",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  const handleGoogleResponse = async (response) => {
    try {
      setGoogleLoading(true);
      setError("");

      const result = await fetch(`${API_URL}/api/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken: response.credential,
        }),
      });

      const data = await result.json();

      if (!result.ok) {
        throw new Error(
          data.message || "Google authentication failed."
        );
      }

      localStorage.setItem(
        "accessToken",
        data.accessToken
      );

      localStorage.setItem(
        "refreshToken",
        data.refreshToken
      );

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      console.log("Google authentication successful:", data.user);

      // Temporary for testing.
      // Later we'll redirect to the game/home screen.
      onAuthenticated();
    } catch (error) {
      console.error("Google authentication error:", error);
      setError(error.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
  const initializeGoogle = () => {
    if (!window.google || !googleButtonRef.current) {
      return false;
    }

    googleButtonRef.current.innerHTML = "";

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleGoogleResponse,
    });

    window.google.accounts.id.renderButton(
      googleButtonRef.current,
      {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: 320,
      }
    );

    return true;
  };

  if (initializeGoogle()) {
    return;
  }

  const timer = setInterval(() => {
    if (initializeGoogle()) {
      clearInterval(timer);
    }
  }, 100);

  return () => {
    clearInterval(timer);
  };
}, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");

      if (mode === "login") {
        const response = await fetch(`${API_URL}/api/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            identifier: form.identifier,
            password: form.password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Login failed.");
        }

        localStorage.setItem(
          "accessToken",
          data.accessToken
        );

        localStorage.setItem(
          "refreshToken",
          data.refreshToken
        );

        localStorage.setItem(
          "user",
          JSON.stringify(data.user)
        );

        onAuthenticated();
      } else {
        const response = await fetch(`${API_URL}/api/auth/signup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: form.username,
            email: form.email,
            displayName: form.displayName,
            password: form.password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Signup failed.");
        }

        alert("Account created successfully. Please log in.");

        setMode("login");

        setForm({
          identifier: form.email,
          username: "",
          email: "",
          displayName: "",
          password: "",
        });
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Reverse Ludo
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            {mode === "login"
              ? "Login to continue playing"
              : "Create your Reverse Ludo account"}
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <>
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={form.username}
                onChange={handleChange}
                required
                minLength={3}
                maxLength={30}
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-gray-900"
              />

              <input
                type="text"
                name="displayName"
                placeholder="Display name"
                value={form.displayName}
                onChange={handleChange}
                required
                maxLength={50}
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-gray-900"
              />

              <input
                type="email"
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-gray-900"
              />
            </>
          )}

          {mode === "login" && (
            <input
              type="text"
              name="identifier"
              placeholder="Username or email"
              value={form.identifier}
              onChange={handleChange}
              required
              className="w-full rounded-lg border px-4 py-3 outline-none focus:border-gray-900"
            />
          )}

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            minLength={8}
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-gray-900"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Login"
                : "Create Account"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-sm text-gray-400">OR</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="flex justify-center">
          {googleLoading ? (
            <p className="text-sm text-gray-500">
              Connecting to Google...
            </p>
          ) : (
            <div ref={googleButtonRef} />
          )}
        </div>

        <div className="mt-6 text-center text-sm">
          {mode === "login" ? (
            <p className="text-gray-500">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError("");
                }}
                className="font-semibold text-black"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p className="text-gray-500">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
                className="font-semibold text-black"
              >
                Login
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;