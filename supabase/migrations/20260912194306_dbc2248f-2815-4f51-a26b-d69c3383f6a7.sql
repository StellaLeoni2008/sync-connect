GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_view_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_view_profile(uuid) TO service_role;