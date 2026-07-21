<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Security Notes for Agents

### `profiles` update policy — intentional faux positif

**Finding:** `supabase_lov:profiles_update_own_safe_fields_no_column_restriction`  
**Why it is a false positive:** The RLS policy `Users can update own safe fields` allows an authenticated user to update their own `profiles` row. The scanner warns that this policy does not restrict *which columns* can be changed, so a user could theoretically set `role = 'admin'`, `is_certified = true`, `is_team_indi = true`, or overwrite `badges`.

**How the app actually protects these columns:**

Column-level protection is enforced by the **BEFORE UPDATE trigger** `protect_profile_privileged_fields` in the database:

```sql
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $$
BEGIN
  -- Allow updates coming from other triggers (e.g. points/level awards),
  -- and allow admin updates. Only block direct client-side tampering.
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF (NEW.role IS DISTINCT FROM OLD.role
      OR NEW.is_certified IS DISTINCT FROM OLD.is_certified
      OR NEW.is_team_indi IS DISTINCT FROM OLD.is_team_indi
      OR NEW.badges IS DISTINCT FROM OLD.badges
      OR NEW.points IS DISTINCT FROM OLD.points
      OR NEW.level IS DISTINCT FROM OLD.level)
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF current_setting('request.jwt.claims', true) IS NOT NULL THEN
      RAISE EXCEPTION 'Not allowed to modify privileged profile fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
```

Key points:

1. **Privileged columns are enumerated** (`role`, `is_certified`, `is_team_indi`, `badges`, `points`, `level`). Any attempt to change them by a non-admin is rejected with an exception.
2. **`pg_trigger_depth() > 1`** lets internal triggers (e.g. the points/level award system) update `points` and `level` without being blocked.
3. **`current_setting('request.jwt.claims', true) IS NOT NULL`** ensures the restriction applies only to direct client requests, not to server-side maintenance operations that run without a JWT context.
4. **Admin override** is allowed because `has_role(auth.uid(), 'admin')` is checked inside the trigger function.

Therefore, the RLS policy is intentionally broad at the row level, while the trigger enforces the column-level restriction. This is the recommended pattern from the finding itself ("Add a trigger or column-level grants/policy…"). Do not narrow the RLS policy or add column-level grants; the trigger is the intended control.
