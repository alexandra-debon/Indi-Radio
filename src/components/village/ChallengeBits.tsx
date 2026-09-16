import { useQuery } from "@tanstack/react-query";
import { Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useVillageTxt } from "@/components/village/village-i18n";

export interface EditorialChallenge {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
}

export function useChallenges(activeOnly = true) {
  return useQuery<EditorialChallenge[]>({
    queryKey: ["editorial-challenges", activeOnly],
    queryFn: async () => {
      let q = supabase
        .from("editorial_challenges")
        .select("id, title, description, cover_url, starts_at, ends_at, is_active, created_at")
        .order("created_at", { ascending: false });
      if (activeOnly) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as EditorialChallenge[];
    },
  });
}

export function ChallengeBadge({
  challenge,
  className,
}: {
  challenge: { title: string } | null | undefined;
  className?: string;
}) {
  const txt = useVillageTxt();
  if (!challenge) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border-2 border-destructive bg-destructive/10 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-destructive",
        className,
      )}
      title={txt.challengeAnswer}
    >
      <Target className="size-3" /> {challenge.title}
    </span>
  );
}

export function ChallengePicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const txt = useVillageTxt();
  const { data: challenges = [] } = useChallenges(true);
  if (challenges.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <Label htmlFor="village-challenge">{txt.challengePick}</Label>
      <select
        id="village-challenge"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-10 w-full rounded-md border-2 border-border bg-background px-2 text-sm"
      >
        <option value="">{txt.challengeNone}</option>
        {challenges.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>
    </div>
  );
}
