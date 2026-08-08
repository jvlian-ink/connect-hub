REVOKE ALL ON FUNCTION public.leaderboard_period(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard_period(timestamptz) TO service_role;