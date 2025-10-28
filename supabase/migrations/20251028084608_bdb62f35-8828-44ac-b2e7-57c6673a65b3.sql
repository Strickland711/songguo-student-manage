-- 1) Remove membership column from profiles safely and drop enum type
DO $$
BEGIN
  -- Drop default then column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'membership_tier'
  ) THEN
    EXECUTE 'ALTER TABLE public.profiles ALTER COLUMN membership_tier DROP DEFAULT';
    EXECUTE 'ALTER TABLE public.profiles DROP COLUMN membership_tier';
  END IF;

  -- Drop enum type if exists
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'membership_tier' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'DROP TYPE public.membership_tier';
  END IF;
END $$;

-- 2) Ensure handle_new_user trigger exists to auto-create profiles
DO $$
BEGIN
  -- Create trigger only if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END $$;