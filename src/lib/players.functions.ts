import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// -----------------------------------------------------------------------------
// PLAYER TYPES
// -----------------------------------------------------------------------------

const NAME_RE = /^[A-Za-z0-9 _.\\-]{2,16}$/;

export type PlayerState = {
  id: string;
  token: string;
  name: string;
  balance: number;
  biggestWin: number;
  totalWagered: number;
  rounds: number;
  failsafeUsed: number;
  failsafeTotal: number;
  failsafeResetsAt: number;
  isGuest: boolean;
};

const identity = z.object({
  id: z.string().uuid(),
  token: z.string().uuid(),
});

const num = (value: unknown) => Number(value ?? 0);

type Row = {
  id: string;
  token: string;
  name: string;
  balance: number | string;
  biggest_win: number | string;
  total_wagered: number | string;
  rounds: number;
  failsafe_used: number;
  failsafe_window_start: string;
  failsafe_total: number;
  is_guest?: boolean | null;
};

function windowInfo(row: Row) {
  const started = new Date(row.failsafe_window_start).getTime();

  const expired =
    Number.isNaN(started) ||
    Date.now() - started >= FAILSAFE_WINDOW_MS;

  return {
    expired,
    used: expired ? 0 : row.failsafe_used,
    resetsAt: expired
      ? Date.now() + FAILSAFE_WINDOW_MS
      : started + FAILSAFE_WINDOW_MS,
  };
}

function shape(row: Row): PlayerState {
  const window = windowInfo(row);

  return {
    id: row.id,
    token: row.token,
    name: row.name,
    balance: num(row.balance),
    biggestWin: num(row.biggest_win),
    totalWagered: num(row.total_wagered),
    rounds: row.rounds,
    failsafeUsed: window.used,
    failsafeTotal: row.failsafe_total,
    failsafeResetsAt: window.resetsAt,
    isGuest: Boolean(row.is_guest),
  };
}

const asRow = (row: unknown) => row as Row;

// -----------------------------------------------------------------------------
// FAIL SAFE
// -----------------------------------------------------------------------------

export const FAILSAFE_AMOUNT = 25;
export const FAILSAFE_LIMIT = 5;
export const FAILSAFE_WINDOW_MS = 10 * 60 * 1000;

// Backwards-compatible alias.
export const FAILSAFE_DAILY_LIMIT = FAILSAFE_LIMIT;

// -----------------------------------------------------------------------------
// REGISTER PLAYER
// -----------------------------------------------------------------------------

export const registerPlayer = createServerFn({
  method: "POST",
})
  .inputValidator((input) =>
    z
      .object({
        name: z.string().trim().min(2).max(16),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const name = data.name.trim().replace(/\s+/g, " ");

    if (!NAME_RE.test(name)) {
      return {
        error:
          "Letters, numbers, spaces, _ . - only (2-16 characters).",
        player: null as PlayerState | null,
      };
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: existing } = await supabaseAdmin
      .from("players")
      .select("id")
      .ilike("name", name)
      .maybeSingle();

    if (existing) {
      return {
        error:
          "That name is already on the leaderboard. Pick another.",
        player: null,
      };
    }

    const { data: row, error } = await supabaseAdmin
      .from("players")
      .insert({ name })
      .select("*")
      .single();

    if (error || !row) {
      return {
        error:
          error?.message ??
          "Could not create that name. Try again.",
        player: null,
      };
    }

    return {
      error: null,
      player: shape(asRow(row)),
    };
  });

// -----------------------------------------------------------------------------
// LOAD PLAYER
// -----------------------------------------------------------------------------

export const loadPlayer = createServerFn({
  method: "POST",
})
  .inputValidator((input) => identity.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: row } = await supabaseAdmin
      .from("players")
      .select("*")
      .eq("id", data.id)
      .eq("token", data.token)
      .maybeSingle();

    return row ? shape(asRow(row)) : null;
  });

// -----------------------------------------------------------------------------
// SAVE PLAYER
// -----------------------------------------------------------------------------

export const savePlayer = createServerFn({
  method: "POST",
})
  .inputValidator((input) =>
    identity
      .extend({
        balance: z.number().min(0).max(1e12),
        biggestWin: z.number().min(0).max(1e12),
        totalWagered: z.number().min(0).max(1e14),
        rounds: z.number().int().min(0).max(1e9),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: before } = await supabaseAdmin
      .from("players")
      .select("*")
      .eq("id", data.id)
      .eq("token", data.token)
      .maybeSingle();

    if (!before) {
      return null;
    }

    const previous = shape(asRow(before));

    const { data: row } = await supabaseAdmin
      .from("players")
      .update({
        balance: +data.balance.toFixed(2),
        biggest_win: +data.biggestWin.toFixed(2),
        total_wagered: +data.totalWagered.toFixed(2),
        rounds: data.rounds,
      })
      .eq("id", data.id)
      .eq("token", data.token)
      .select("*")
      .maybeSingle();

    const net = +(data.balance - previous.balance).toFixed(2);

    const win =
      data.biggestWin > previous.biggestWin
        ? +data.biggestWin.toFixed(2)
        : Math.max(0, net);

    if (Math.abs(net) > 0.009 || win > 0.009) {
      await supabaseAdmin.from("player_activity").insert({
        player_id: data.id,
        net,
        win,
      });
    }

    return row ? shape(asRow(row)) : null;
  });

// -----------------------------------------------------------------------------
// FAIL SAFE
// -----------------------------------------------------------------------------

export const claimFailsafe = createServerFn({
  method: "POST",
})
  .inputValidator((input) => identity.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: row } = await supabaseAdmin
      .from("players")
      .select("*")
      .eq("id", data.id)
      .eq("token", data.token)
      .maybeSingle();

    if (!row) {
      return {
        ok: false,
        reason: "unknown",
        player: null,
      } as const;
    }

    const current = shape(asRow(row));

    if (current.balance > 0.009) {
      return {
        ok: false,
        reason: "not-broke",
        player: current,
      } as const;
    }

    const window = windowInfo(asRow(row));

    if (window.used >= FAILSAFE_LIMIT) {
      return {
        ok: false,
        reason: "limit",
        player: current,
      } as const;
    }

    const { data: updated } = await supabaseAdmin
      .from("players")
      .update({
        balance: FAILSAFE_AMOUNT,
        failsafe_used: window.used + 1,
        ...(window.expired
          ? {
              failsafe_window_start: new Date().toISOString(),
            }
          : {}),
        failsafe_total: current.failsafeTotal + 1,
      })
      .eq("id", data.id)
      .eq("token", data.token)
      .select("*")
      .maybeSingle();

    if (!updated) {
      return {
        ok: false,
        reason: "unknown",
        player: current,
      } as const;
    }

    return {
      ok: true,
      reason: null,
      player: shape(asRow(updated)),
    } as const;
  });

// -----------------------------------------------------------------------------
// LEADERBOARD
// -----------------------------------------------------------------------------

export type LeaderRow = {
  rank: number;
  name: string;
  balance: number;
  biggestWin: number;
  rounds: number;
};

export const PERIODS = [
  "all",
  "day",
  "week",
  "month",
  "year",
] as const;

export type Period = (typeof PERIODS)[number];

const SPANS: Record<Exclude<Period, "all">, number> = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
};

export const getLeaderboard = createServerFn({
  method: "POST",
})
  .inputValidator((input) =>
    z
      .object({
        period: z.enum(PERIODS).default("all"),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    if (data.period === "all") {
      const { data: rows } = await supabaseAdmin
        .from("players")
        .select("name, balance, biggest_win, rounds")
        .order("balance", { ascending: false })
        .limit(50);

      return (rows ?? []).map((row, index) => ({
        rank: index + 1,
        name: row.name as string,
        balance: num(row.balance),
        biggestWin: num(row.biggest_win),
        rounds: Number(row.rounds ?? 0),
      })) satisfies LeaderRow[];
    }

    const since = new Date(
      Date.now() - SPANS[data.period],
    ).toISOString();

    const { data: rows } = await supabaseAdmin.rpc(
      "leaderboard_period",
      {
        _since: since,
      },
    );

    return (
      (rows ?? []) as {
        name: string;
        gained: number;
        biggest_win: number;
        rounds: number;
      }[]
    ).map((row, index) => ({
      rank: index + 1,
      name: row.name,
      balance: num(row.gained),
      biggestWin: num(row.biggest_win),
      rounds: Number(row.rounds ?? 0),
    })) satisfies LeaderRow[];
  });

// -----------------------------------------------------------------------------
// BIGGEST WINS
// -----------------------------------------------------------------------------

export const getBiggestWins = createServerFn({
  method: "GET",
}).handler(async () => {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );

  const { data } = await supabaseAdmin
    .from("players")
    .select("name, balance, biggest_win, rounds")
    .gt("biggest_win", 0)
    .order("biggest_win", { ascending: false })
    .limit(50);

  return (data ?? []).map((row, index) => ({
    rank: index + 1,
    name: row.name as string,
    balance: num(row.balance),
    biggestWin: num(row.biggest_win),
    rounds: Number(row.rounds ?? 0),
  })) satisfies LeaderRow[];
});

// -----------------------------------------------------------------------------
// NAME AVAILABLE
// -----------------------------------------------------------------------------

export const nameAvailable = createServerFn({
  method: "POST",
})
  .inputValidator((input) =>
    z
      .object({
        name: z.string().trim().min(2).max(16),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const name = data.name.trim().replace(/\s+/g, " ");

    if (!NAME_RE.test(name)) {
      return {
        ok: false,
        error:
          "Letters, numbers, spaces, _ . - only (2-16 characters).",
      };
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: existing } = await supabaseAdmin
      .from("players")
      .select("id")
      .ilike("name", name)
      .maybeSingle();

    if (existing) {
      return {
        ok: false,
        error: "That name is already taken. Pick another.",
      };
    }

    return {
      ok: true,
      error: null,
    };
  });

// -----------------------------------------------------------------------------
// REGISTER GUEST
// -----------------------------------------------------------------------------

export const registerGuest = createServerFn({
  method: "POST",
}).handler(async () => {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );

  let last = "";

  for (let attempt = 0; attempt < 8; attempt++) {
    const name = `Guest#${Math.floor(
      100000 + Math.random() * 900000,
    )}`;

    const { data: row, error } = await supabaseAdmin
      .from("players")
      .insert({
        name,
        is_guest: true,
      })
      .select("*")
      .single();

    if (!error && row) {
      return {
        error: null as string | null,
        player: shape(asRow(row)),
      };
    }

    last = error?.message ?? "";
  }

  return {
    error:
      last ||
      "Could not start a guest session. Try again.",
    player: null as PlayerState | null,
  };
});

// -----------------------------------------------------------------------------
// ENSURE ACCOUNT PLAYER
// -----------------------------------------------------------------------------

export const ensureAccountPlayer = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        name: z.string().trim().min(2).max(16).optional(),
        adoptId: z.string().uuid().optional(),
        adoptToken: z.string().uuid().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const userId = context.userId;

    const { data: authUser } =
      await supabaseAdmin.auth.admin.getUserById(userId);

    const authName =
      authUser.user?.user_metadata?.display_name ??
      authUser.user?.user_metadata?.name ??
      null;

    const chosenName =
      data.name ??
      authName ??
      `Player#${Math.floor(
        100000 + Math.random() * 900000,
      )}`;

    const cleanName = chosenName
      .trim()
      .replace(/\s+/g, " ");

    const { data: mine } = await supabaseAdmin
      .from("players")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (mine) {
      if (
        authName &&
        mine.name.startsWith("Player#") &&
        cleanName.length >= 2
      ) {
        const { data: updated } =
          await supabaseAdmin
            .from("players")
            .update({
              name: cleanName,
            })
            .eq("id", mine.id)
            .select("*")
            .maybeSingle();

        if (updated) {
          return {
            error: null as string | null,
            player: shape(asRow(updated)),
          };
        }
      }

      return {
        error: null as string | null,
        player: shape(asRow(mine)),
      };
    }

    if (data.adoptId && data.adoptToken) {
      const { data: adopted } =
        await supabaseAdmin
          .from("players")
          .update({
            user_id: userId,
            is_guest: false,
            name: cleanName,
          })
          .eq("id", data.adoptId)
          .eq("token", data.adoptToken)
          .is("user_id", null)
          .select("*")
          .maybeSingle();

      if (adopted) {
        return {
          error: null,
          player: shape(asRow(adopted)),
        };
      }
    }

    const { data: created, error } =
      await supabaseAdmin
        .from("players")
        .insert({
          name: cleanName,
          user_id: userId,
          is_guest: false,
        })
        .select("*")
        .maybeSingle();

    if (error || !created) {
      return {
        error:
          error?.message ??
          "Could not set up your account profile.",
        player: null,
      };
    }

    return {
      error: null,
      player: shape(asRow(created)),
    };
  });

// ============================================================================
// BLACKJACK MULTIPLAYER
// ============================================================================

const BLACKJACK_MATCH_TIMEOUT_MS = 2 * 60 * 1000;
const BLACKJACK_QUEUE_TIMEOUT_MS = 2 * 60 * 1000;

// -----------------------------------------------------------------------------
// Get authenticated Blackjack player
// -----------------------------------------------------------------------------

async function getAuthenticatedBlackjackPlayer(
  supabaseAdmin: any,
  userId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("players")
    .select("id, user_id, is_guest")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error(
      "Blackjack player lookup failed:",
      error,
    );
  }

  return {
    player: data,
    error,
  };
}

// -----------------------------------------------------------------------------
// Clean stale matches
// -----------------------------------------------------------------------------

async function cleanupStaleBlackjackMatches(
  supabaseAdmin: any,
) {
  const cutoff = new Date(
    Date.now() - BLACKJACK_MATCH_TIMEOUT_MS,
  ).toISOString();

  const { error } = await supabaseAdmin
    .from("blackjack_matches")
    .update({
      status: "abandoned",
      updated_at: new Date().toISOString(),
    })
    .in("status", ["waiting", "active"])
    .lt("updated_at", cutoff);

  if (error) {
    console.error(
      "Blackjack stale match cleanup failed:",
      error,
    );
  }
}

// -----------------------------------------------------------------------------
// Clean stale queue entries
// -----------------------------------------------------------------------------

async function cleanupStaleBlackjackQueue(
  supabaseAdmin: any,
) {
  const cutoff = new Date(
    Date.now() - BLACKJACK_QUEUE_TIMEOUT_MS,
  ).toISOString();

  const { error } = await supabaseAdmin
    .from("blackjack_queue")
    .delete()
    .lt("joined_at", cutoff);

  if (error) {
    console.error(
      "Blackjack stale queue cleanup failed:",
      error,
    );
  }
}

// -----------------------------------------------------------------------------
// JOIN BLACKJACK QUEUE
// -----------------------------------------------------------------------------

export const joinBlackjackQueue = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const userId = context.userId;

    // Clean old matches and queue entries first.
    await cleanupStaleBlackjackMatches(
      supabaseAdmin,
    );

    await cleanupStaleBlackjackQueue(
      supabaseAdmin,
    );

    const {
      player,
      error: playerError,
    } = await getAuthenticatedBlackjackPlayer(
      supabaseAdmin,
      userId,
    );

    if (playerError) {
      return {
        ok: false,
        status: "error" as const,
        matchId: null,
        message:
          "Could not verify your player account.",
      };
    }

    if (!player || player.is_guest) {
      return {
        ok: false,
        status: "guest" as const,
        matchId: null,
        message:
          "You need a registered account to play multiplayer Blackjack.",
      };
    }

    const playerId = player.id;

    // Check for an existing CURRENT match.
    const {
      data: existingMatch,
      error: existingMatchError,
    } = await supabaseAdmin
      .from("blackjack_matches")
      .select(
        "id, status, player1_id, player2_id, updated_at",
      )
      .or(
        `player1_id.eq.${playerId},player2_id.eq.${playerId}`,
      )
      .in("status", ["waiting", "active"])
      .order("updated_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (existingMatchError) {
      console.error(
        "Blackjack existing match lookup failed:",
        existingMatchError,
      );
    }

    if (existingMatch) {
      const hasTwoPlayers =
        Boolean(existingMatch.player1_id) &&
        Boolean(existingMatch.player2_id);

      if (hasTwoPlayers) {
        return {
          ok: true,
          status: "matched" as const,
          matchId: existingMatch.id,
          message: "Player found!",
        };
      }

      await supabaseAdmin
        .from("blackjack_matches")
        .update({
          status: "abandoned",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingMatch.id);
    }

    // Remove this user's old queue entry.
    await supabaseAdmin
      .from("blackjack_queue")
      .delete()
      .eq("user_id", userId);

    // Find oldest waiting player.
    const {
      data: waiting,
      error: waitingError,
    } = await supabaseAdmin
      .from("blackjack_queue")
      .select("user_id, joined_at")
      .neq("user_id", userId)
      .order("joined_at", {
        ascending: true,
      })
      .limit(1)
      .maybeSingle();

    if (waitingError) {
      console.error(
        "Blackjack queue lookup failed:",
        waitingError,
      );

      return {
        ok: false,
        status: "error" as const,
        matchId: null,
        message:
          "Could not check the matchmaking queue.",
      };
    }

    // Nobody is waiting.
    if (!waiting) {
      const { error: queueError } =
        await supabaseAdmin
          .from("blackjack_queue")
          .insert({
            user_id: userId,
          });

      if (queueError) {
        console.error(
          "Blackjack queue insert failed:",
          queueError,
        );

        return {
          ok: false,
          status: "error" as const,
          matchId: null,
          message:
            "Could not enter the matchmaking queue.",
        };
      }

      return {
        ok: true,
        status: "waiting" as const,
        matchId: null,
        message:
          "Waiting for another player...",
      };
    }

    // Find the waiting player's profile.
    const {
      data: waitingPlayer,
      error: waitingPlayerError,
    } = await supabaseAdmin
      .from("players")
      .select("id, user_id, is_guest")
      .eq("user_id", waiting.user_id)
      .maybeSingle();

    if (
      waitingPlayerError ||
      !waitingPlayer ||
      waitingPlayer.is_guest
    ) {
      console.error(
        "Matched player profile lookup failed:",
        waitingPlayerError,
      );

      await supabaseAdmin
        .from("blackjack_queue")
        .delete()
        .eq("user_id", waiting.user_id);

      return {
        ok: false,
        status: "error" as const,
        matchId: null,
        message:
          "Could not find the other player's profile.",
      };
    }

    // Make sure waiting player isn't already in a match.
    const {
      data: waitingExistingMatch,
    } = await supabaseAdmin
      .from("blackjack_matches")
      .select(
        "id, status, player1_id, player2_id",
      )
      .or(
        `player1_id.eq.${waitingPlayer.id},player2_id.eq.${waitingPlayer.id}`,
      )
      .in("status", ["waiting", "active"])
      .limit(1)
      .maybeSingle();

    if (waitingExistingMatch) {
      await supabaseAdmin
        .from("blackjack_queue")
        .delete()
        .eq("user_id", waiting.user_id);

      return {
        ok: false,
        status: "error" as const,
        matchId: null,
        message:
          "That player is already in another match. Please try again.",
      };
    }

    // Create the match.
    const {
      data: match,
      error: matchError,
    } = await supabaseAdmin
      .from("blackjack_matches")
      .insert({
        status: "active",
        player1_id: waitingPlayer.id,
        player2_id: playerId,
        turn_player_id: waitingPlayer.id,
        player1_hand: [],
        player2_hand: [],
        dealer_hand: [],
        deck: [],
        player1_stood: false,
        player2_stood: false,
        player1_bet: 0,
        player2_bet: 0,
        winner_id: null,
      })
      .select("id")
      .single();

    if (matchError || !match) {
      console.error(
        "Blackjack match creation failed:",
        matchError,
      );

      return {
        ok: false,
        status: "error" as const,
        matchId: null,
        message:
          "Could not create a Blackjack match.",
      };
    }

    // Remove BOTH users from queue.
    await supabaseAdmin
      .from("blackjack_queue")
      .delete()
      .in("user_id", [
        waiting.user_id,
        userId,
      ]);

    return {
      ok: true,
      status: "matched" as const,
      matchId: match.id,
      message: "Player found!",
    };
  });

// -----------------------------------------------------------------------------
// LEAVE BLACKJACK MATCH
// -----------------------------------------------------------------------------

export const leaveBlackjackMatch = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        matchId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const userId = context.userId;

    const { data: player } = await supabaseAdmin
      .from("players")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    // Always remove this user's queue entry.
    await supabaseAdmin
      .from("blackjack_queue")
      .delete()
      .eq("user_id", userId);

    if (!player) {
      return {
        ok: false,
        message:
          "Could not find your player profile.",
      };
    }

    const {
      data: match,
      error: matchError,
    } = await supabaseAdmin
      .from("blackjack_matches")
      .select(
        "id, status, player1_id, player2_id",
      )
      .eq("id", data.matchId)
      .maybeSingle();

    if (matchError) {
      console.error(
        "Leave Blackjack match lookup failed:",
        matchError,
      );

      return {
        ok: false,
        message:
          "Could not find the Blackjack match.",
      };
    }

    if (!match) {
      return {
        ok: true,
        message: null,
      };
    }

    const belongs =
      match.player1_id === player.id ||
      match.player2_id === player.id;

    if (!belongs) {
      return {
        ok: false,
        message:
          "You are not part of this Blackjack match.",
      };
    }

    // Mark the match abandoned.
    const { error: updateError } =
      await supabaseAdmin
        .from("blackjack_matches")
        .update({
          status: "abandoned",
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", data.matchId)
        .in("status", [
          "waiting",
          "active",
        ]);

    if (updateError) {
      console.error(
        "Leaving Blackjack match failed:",
        updateError,
      );

      return {
        ok: false,
        message:
          "Could not leave the Blackjack match.",
      };
    }

    // Remove BOTH players from queue.
    const playerIds = [
      match.player1_id,
      match.player2_id,
    ].filter(Boolean);

    if (playerIds.length > 0) {
      const { data: otherPlayers } =
        await supabaseAdmin
          .from("players")
          .select("user_id")
          .in("id", playerIds);

      const userIds = (otherPlayers ?? [])
        .map((entry) => entry.user_id)
        .filter(Boolean);

      if (userIds.length > 0) {
        await supabaseAdmin
          .from("blackjack_queue")
          .delete()
          .in("user_id", userIds);
      }
    }

    return {
      ok: true,
      message: null,
    };
  });