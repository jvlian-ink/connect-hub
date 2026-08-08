CREATE TABLE public.players (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  balance numeric(14,2) NOT NULL DEFAULT 250,
  biggest_win numeric(14,2) NOT NULL DEFAULT 0,
  total_wagered numeric(14,2) NOT NULL DEFAULT 0,
  rounds integer NOT NULL DEFAULT 0,
  failsafe_used integer NOT NULL DEFAULT 0,
  failsafe_window_start timestamptz NOT NULL DEFAULT now(),
  failsafe_total integer NOT NULL DEFAULT 0,
  user_id uuid,
  is_guest boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX players_name_lower_idx ON public.players (lower(name));
CREATE INDEX players_balance_idx ON public.players (balance DESC);
CREATE INDEX players_biggest_win_idx ON public.players (biggest_win DESC);
CREATE UNIQUE INDEX players_user_id_key ON public.players (user_id) WHERE user_id IS NOT NULL;

GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.player_activity (
  id bigserial PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  net numeric(14,2) NOT NULL DEFAULT 0,
  win numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX player_activity_created_idx ON public.player_activity (created_at DESC);
CREATE INDEX player_activity_player_idx ON public.player_activity (player_id);

GRANT ALL ON public.player_activity TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.player_activity_id_seq TO service_role;
ALTER TABLE public.player_activity ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER players_touch_updated_at
BEFORE UPDATE ON public.players
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.leaderboard_period(_since timestamptz)
RETURNS TABLE (name text, gained numeric, biggest_win numeric, rounds bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.name,
         COALESCE(SUM(a.net), 0)::numeric AS gained,
         COALESCE(MAX(a.win), 0)::numeric AS biggest_win,
         COUNT(*)::bigint AS rounds
  FROM public.players p
  JOIN public.player_activity a ON a.player_id = p.id
  WHERE a.created_at >= _since
  GROUP BY p.name
  ORDER BY gained DESC
  LIMIT 50;
$$;

REVOKE ALL ON FUNCTION public.leaderboard_period(timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leaderboard_period(timestamptz) TO service_role;