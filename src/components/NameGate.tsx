import { useState } from "react";
import { useWallet } from "@/lib/wallet";
import { primeAudio, sfx } from "@/lib/sound";
import { supabase } from "@/integrations/supabase/client";

type Mode = "home" | "signup" | "login";

/** First-run gate: guest in one tap, or an email account with verification. */
export function NameGate() {
  const { playAsGuest, signUpEmail, signInEmail } = useWallet();

  const [mode, setMode] = useState<Mode>("home");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<string | null>) => {
    primeAudio();
    sfx.click();

    setError(null);
    setNotice(null);
    setBusy(true);

    const err = await fn();

    setBusy(false);

    if (err === "verify") {
      setNotice("Check your inbox — click the verification link, then come back here.");
      return;
    }

    if (err) {
      setError(String(err));
      sfx.denied();
    }
  };

  const google = () =>
    void run(async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) return error.message ?? "Google sign-in failed.";

      return null;
    });

  const guest = () => void run(playAsGuest);

  const submitSignup = () =>
    void run(async () => {
      if (name.trim().length < 2) return "Pick a name with at least 2 characters.";

      if (!email.includes("@")) return "That email doesn't look right.";

      if (password.length < 6) return "Password needs at least 6 characters.";

      return signUpEmail(name, email, password);
    });

  const submitLogin = () =>
    void run(async () => {
      if (!email.includes("@")) return "That email doesn't look right.";

      if (!password) return "Enter your password.";

      return signInEmail(email, password);
    });

  const field =
    "w-full rounded-lg border border-border bg-input px-3 py-3 text-foreground outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-ring/35";

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="panel w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl chip-blood text-2xl font-bold">
            F
          </div>

          <h1 className="font-display text-2xl font-bold text-shine">FLARED</h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Fake credits, real leaderboard. Jump in as a guest or make an account that follows you
            across devices.
          </p>
        </div>

        {mode === "home" && (
          <div className="grid gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={guest}
              className="btn-base btn-play w-full py-3"
            >
              {busy ? "Spinning up…" : "Play as guest"}
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={google}
              className="btn-base btn-ghost-soft flex w-full items-center justify-center gap-2 py-3"
            >
              Continue with Google
            </button>

            <button
              type="button"
              onClick={() => {
                sfx.click();
                setMode("signup");
                setError(null);
              }}
              className="btn-base btn-ghost-soft w-full py-3"
            >
              Sign up with email
            </button>

            <button
              type="button"
              onClick={() => {
                sfx.click();
                setMode("login");
                setError(null);
              }}
              className="text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              I already have an account
            </button>
          </div>
        )}

        {mode === "signup" && (
          <div className="grid gap-3">
            <input
              className={field}
              value={name}
              maxLength={16}
              placeholder="Leaderboard name"
              onChange={(e) => setName(e.target.value)}
            />

            <input
              className={field}
              value={email}
              type="email"
              placeholder="you@email.com"
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className={field}
              value={password}
              type="password"
              placeholder="Password"
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitSignup();
              }}
            />

            <button
              type="button"
              disabled={busy}
              onClick={submitSignup}
              className="btn-base btn-play w-full py-3"
            >
              {busy ? "Creating…" : "Create account"}
            </button>
          </div>
        )}

        {mode === "login" && (
          <div className="grid gap-3">
            <input
              className={field}
              value={email}
              type="email"
              placeholder="you@email.com"
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className={field}
              value={password}
              type="password"
              placeholder="Password"
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitLogin();
              }}
            />

            <button
              type="button"
              disabled={busy}
              onClick={submitLogin}
              className="btn-base btn-play w-full py-3"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-primary">{error}</p>}

        {notice && <p className="mt-3 text-sm text-win">{notice}</p>}

        {mode !== "home" && (
          <button
            type="button"
            onClick={() => {
              sfx.click();
              setMode("home");
              setError(null);
              setNotice(null);
            }}
            className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            ← Back
          </button>
        )}

        <p className="mt-5 text-center text-xs text-muted-foreground">
          You start with 250 fake credits. Nothing here is real money.
        </p>
      </div>
    </div>
  );
}
