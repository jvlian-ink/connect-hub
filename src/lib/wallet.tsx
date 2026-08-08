import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { sfx } from "@/lib/sound";
import { supabase } from "@/integrations/supabase/client";
import {
  claimFailsafe,
  ensureAccountPlayer,
  loadPlayer,
  nameAvailable,
  registerGuest,
  registerPlayer,
  savePlayer,
  type PlayerState,
} from "@/lib/players.functions";

const LOCAL_KEY = "flared:player:v2";
const LEGACY_KEYS = ["arena:player:v2", "aurum:wallet:v1"];
const START_BALANCE = 250;

export const FAILSAFE_AMOUNT = 25;
export const FAILSAFE_DAILY_LIMIT = 5;

export type FloatItem = { id: number; amount: number };

type Identity = { id: string; token: string; name: string };

type WalletCtx = {
  ready: boolean;
  name: string | null;
  isGuest: boolean;
  accountEmail: string | null;
  balance: number;
  displayBalance: number;
  floats: FloatItem[];
  failsafeUsed: number;
  failsafeLeft: number;
  failsafeTotal: number;
  failsafeActive: boolean;
  failsafeDenied: boolean;
  biggestWin: number;
  rounds: number;
  totalWagered: number;
  /** Take a stake off the balance. Never triggers Fail Safe by itself. */
  bet: (amount: number) => boolean;
  /** Pay a win mid-round without ending it (Fail Safe stays parked). */
  add: (amount: number) => void;
  /** End a round. Pass the payout (0 for a loss). Fail Safe can fire here. */
  settle: (payout: number) => void;
  canBet: (amount: number) => boolean;
  signUp: (name: string) => Promise<string | null>;
  playAsGuest: () => Promise<string | null>;
  signUpEmail: (name: string, email: string, password: string) => Promise<string | null>;
  signInEmail: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<WalletCtx | null>(null);

function readIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY) ?? localStorage.getItem("arena:player:v2");
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Identity>;
    if (p.id && p.token && p.name) return { id: p.id, token: p.token, name: p.name };
  } catch {
    /* ignore */
  }
  return null;
}

function writeIdentity(next: Identity) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [balance, setBalance] = useState(START_BALANCE);
  const [displayBalance, setDisplayBalance] = useState(START_BALANCE);
  const [floats, setFloats] = useState<FloatItem[]>([]);
  const [failsafeUsed, setFailsafeUsed] = useState(0);
  const [failsafeTotal, setFailsafeTotal] = useState(0);
  const [failsafeActive, setFailsafeActive] = useState(false);
  const [failsafeDenied, setFailsafeDenied] = useState(false);
  const [biggestWin, setBiggestWin] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [totalWagered, setTotalWagered] = useState(0);

  const raf = useRef<number | null>(null);
  const floatId = useRef(0);
  const openStake = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const claiming = useRef(false);
  const dirty = useRef(false);
  const pendingName = useRef<string | null>(null);

  const applyPlayer = useCallback((p: PlayerState) => {
    setBalance(p.balance);
    setDisplayBalance(p.balance);
    setBiggestWin(p.biggestWin);
    setRounds(p.rounds);
    setTotalWagered(p.totalWagered);
    setFailsafeUsed(p.failsafeUsed);
    setFailsafeTotal(p.failsafeTotal);
    setIsGuest(p.isGuest);
  }, []);

  const adopt = useCallback(
    (p: PlayerState) => {
      const next = { id: p.id, token: p.token, name: p.name };
      writeIdentity(next);
      setIdentity(next);
      applyPlayer(p);
    },
    [applyPlayer],
  );

  /** Attach the signed-in email account to a player profile. */
  const syncAccount = useCallback(
    async (email: string | null): Promise<string | null> => {
      setAccountEmail(email);
      const local = readIdentity();
      try {
        const res = await ensureAccountPlayer({
          data: {
            ...(pendingName.current ? { name: pendingName.current } : {}),
            ...(local ? { adoptId: local.id, adoptToken: local.token } : {}),
          },
        });
        if (res.error || !res.player) {
          return res.error ?? "Your account signed in, but its player profile could not be loaded.";
        }
        pendingName.current = null;
        adopt(res.player);
        return null;
      } catch (error) {
        console.error("Account profile sync failed", error);
        return error instanceof Error
          ? `Account sync failed: ${error.message}`
          : "Account sync failed. Check the server's Cloudflare environment bindings.";
      }
    },
    [adopt],
  );

  // Restore the saved player on mount.
  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      for (const k of LEGACY_KEYS.slice(1)) {
        try {
          localStorage.removeItem(k);
        } catch {
          /* ignore */
        }
      }
      const local = readIdentity();
      if (local) {
        setIdentity(local);
        try {
          const p = await loadPlayer({ data: { id: local.id, token: local.token } });
          if (cancelled) return;
          if (p) adopt(p);
          else {
            localStorage.removeItem(LOCAL_KEY);
            setIdentity(null);
          }
        } catch {
          /* offline: keep local identity */
        }
      }

      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user && !cancelled) {
          await syncAccount(data.session.user.email ?? null);
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) setReady(true);
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, [adopt, syncAccount]);

  // React to email sign-in / sign-out.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        // Supabase holds an internal auth lock while this callback runs. Defer
        // server-function work because its bearer middleware calls getSession().
        window.setTimeout(() => {
          void syncAccount(session?.user.email ?? null);
        }, 0);
      } else if (event === "SIGNED_OUT") {
        setAccountEmail(null);
        setIdentity(null);
        setIsGuest(false);
        try {
          localStorage.removeItem(LOCAL_KEY);
        } catch {
          /* ignore */
        }
      }
    });
    return () => data.subscription.unsubscribe();
  }, [syncAccount]);

  // Debounced cloud save.
  const queueSave = useCallback(() => {
    dirty.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const id = identity;
      if (!id || !dirty.current) return;
      dirty.current = false;
      void savePlayer({
        data: {
          id: id.id,
          token: id.token,
          balance: Math.max(0, +balance.toFixed(2)),
          biggestWin: +biggestWin.toFixed(2),
          totalWagered: +totalWagered.toFixed(2),
          rounds,
        },
      }).catch(() => {
        dirty.current = true;
      });
    }, 700);
  }, [identity, balance, biggestWin, totalWagered, rounds]);

  useEffect(() => {
    if (!ready || !identity) return;
    queueSave();
  }, [ready, identity, balance, biggestWin, totalWagered, rounds, queueSave]);

  // Smooth counter towards balance.
  useEffect(() => {
    const start = performance.now();
    const from = displayBalance;
    const to = balance;
    if (Math.abs(to - from) < 0.005) {
      setDisplayBalance(to);
      return;
    }
    const dur = Math.min(900, 260 + Math.abs(to - from) * 3);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      setDisplayBalance(from + (to - from) * e);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balance]);

  const pushFloat = useCallback((amount: number) => {
    const id = ++floatId.current;
    setFloats((f) => [...f, { id, amount }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1400);
  }, []);

  const signUp = useCallback(
    async (name: string) => {
      try {
        const res = await registerPlayer({ data: { name } });
        if (res.error || !res.player) return res.error ?? "Could not create that name.";
        adopt(res.player);
        sfx.jackpot();
        return null;
      } catch {
        return "Network hiccup — try that again.";
      }
    },
    [adopt],
  );

  const playAsGuest = useCallback(async () => {
    try {
      const res = await registerGuest();
      if (res.error || !res.player) return res.error ?? "Could not start a guest session.";
      adopt(res.player);
      sfx.jackpot();
      return null;
    } catch {
      return "Network hiccup — try that again.";
    }
  }, [adopt]);

const signUpEmail = useCallback(
  async (name: string, email: string, password: string) => {
    const clean = name.trim().replace(/\s+/g, " ");

    try {
      const check = await nameAvailable({ data: { name: clean } });
      if (!check.ok) return check.error ?? "Pick another name.";
    } catch {
      return "Network hiccup — try that again.";
    }

const { data, error } = await supabase.auth.signUp({
  email: email.trim(),
  password,
  options: {
    emailRedirectTo: "https://flared.ink",
    data: {
      display_name: clean,
    },
  },
});

console.log("SUPABASE SIGNUP RESULT", { data, error });

if (error) {
  console.error("Signup error:", error);
  return error.message ?? "Signup failed.";
}
    if (error) {
      console.error("Signup error:", error);
      return error.message ?? "Signup failed.";
    }

    pendingName.current = clean;

    if (!data.session) return "verify";

    return null;
  },
  [],
);

  const signInEmail = useCallback(
    async (email: string, password: string) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) return error.message;
        if (!data.user || !data.session)
          return "Sign-in completed without a usable session. Try again.";

        // Do not rely solely on the auth event: the gate needs a player identity
        // before it can render the signed-in app.
        return await syncAccount(data.user.email ?? null);
      } catch (error) {
        console.error("Email sign-in failed", error);
        return error instanceof Error
          ? `Sign-in request failed: ${error.message}`
          : "Sign-in request failed. Check your connection and try again.";
      }
    },
    [syncAccount],
  );

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    setAccountEmail(null);
    setIdentity(null);
    setIsGuest(false);
    try {
      localStorage.removeItem(LOCAL_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  /** Ask the server for a Fail Safe drop. Only ever called at $0.00. */
  const requestFailsafe = useCallback(async () => {
    if (claiming.current) return;
    const id = identity;
    if (!id) return;
    claiming.current = true;
    try {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      await savePlayer({
        data: {
          id: id.id,
          token: id.token,
          balance: 0,
          biggestWin: +biggestWin.toFixed(2),
          totalWagered: +totalWagered.toFixed(2),
          rounds,
        },
      });
      const res = await claimFailsafe({ data: { id: id.id, token: id.token } });
      if (res.ok && res.player) {
        applyPlayer(res.player);
        setFailsafeActive(true);
        sfx.failsafe();
        setTimeout(() => setFailsafeActive(false), 5200);
      } else if (res.reason === "limit") {
        setFailsafeDenied(true);
        sfx.denied();
        setTimeout(() => setFailsafeDenied(false), 5200);
      }
    } catch {
      /* ignore */
    } finally {
      claiming.current = false;
    }
  }, [identity, biggestWin, totalWagered, rounds, applyPlayer]);

  const canBet = useCallback((amount: number) => amount > 0 && balance + 1e-9 >= amount, [balance]);

  const bet = useCallback(
    (amount: number) => {
      if (!canBet(amount)) return false;
      openStake.current += amount;
      pushFloat(-amount);
      sfx.bet();
      setTotalWagered((w) => +(w + amount).toFixed(2));
      // NOTE: deliberately no Fail Safe check here — going to $0.00 by staking
      // (e.g. Max bet) is not "hitting zero", the round is still live.
      setBalance((b) => Math.max(0, +(b - amount).toFixed(2)));
      return true;
    },
    [canBet, pushFloat],
  );

  const add = useCallback(
    (amount: number) => {
      if (!amount) return;
      pushFloat(amount);
      if (amount > 0) setBiggestWin((b) => Math.max(b, amount));
      setBalance((b) => Math.max(0, +(b + amount).toFixed(2)));
    },
    [pushFloat],
  );

  /** Round finished. Pay out, clear the open stake, then check for a real zero. */
  const settle = useCallback(
    (payout: number) => {
      openStake.current = 0;
      setRounds((r) => r + 1);
      if (payout > 0) {
        pushFloat(payout);
        setBiggestWin((b) => Math.max(b, payout));
      }
      setBalance((b) => {
        const next = Math.max(0, +(b + Math.max(0, payout)).toFixed(2));
        if (next <= 0.009) setTimeout(() => void requestFailsafe(), 900);
        return next;
      });
    },
    [pushFloat, requestFailsafe],
  );

  const value = useMemo<WalletCtx>(
    () => ({
      ready,
      name: identity?.name ?? null,
      isGuest,
      accountEmail,
      balance,
      displayBalance,
      floats,
      failsafeUsed,
      failsafeLeft: Math.max(0, FAILSAFE_DAILY_LIMIT - failsafeUsed),
      failsafeTotal,
      failsafeActive,
      failsafeDenied,
      biggestWin,
      rounds,
      totalWagered,
      bet,
      add,
      settle,
      canBet,
      signUp,
      playAsGuest,
      signUpEmail,
      signInEmail,
      signOut,
    }),
    [
      ready,
      identity,
      isGuest,
      accountEmail,
      balance,
      displayBalance,
      floats,
      failsafeUsed,
      failsafeTotal,
      failsafeActive,
      failsafeDenied,
      biggestWin,
      rounds,
      totalWagered,
      bet,
      add,
      settle,
      canBet,
      signUp,
      playAsGuest,
      signUpEmail,
      signInEmail,
      signOut,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWallet must be used inside WalletProvider");
  return c;
}

export const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
