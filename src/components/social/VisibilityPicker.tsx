import { Globe2, UserSquare2, Users } from "lucide-react";
import { useLang } from "@/lib/i18n";

export type PostVisibility = "feed" | "profile_only" | "followers_only";

const OPTIONS: {
  value: PostVisibility;
  icon: typeof Globe2;
  fr: [string, string];
  en: [string, string];
}[] = [
  {
    value: "feed",
    icon: Globe2,
    fr: ["Publier aussi sur le feed général", "Visible sur le mur InDi ReZo et sur ma page."],
    en: ["Also publish on the main feed", "Visible on the InDi ReZo wall and on my page."],
  },
  {
    value: "profile_only",
    icon: UserSquare2,
    fr: ["Garder seulement sur ma page", "Public, mais visible uniquement sur ma page."],
    en: ["Keep on my page only", "Public, but only visible on my page."],
  },
  {
    value: "followers_only",
    icon: Users,
    fr: ["Réservé à mes abonnés", "Seules les personnes qui me suivent peuvent la voir."],
    en: ["Followers only", "Only people who follow me can see it."],
  },
];

export function VisibilityPicker({
  value,
  onChange,
  name = "post-visibility",
}: {
  value: PostVisibility;
  onChange: (v: PostVisibility) => void;
  name?: string;
}) {
  const { lang } = useLang();
  const isEn = lang === "en";
  return (
    <fieldset className="space-y-2 rounded-sm border-2 border-primary/60 bg-primary/5 p-3">
      <legend className="px-1 text-[11px] font-black uppercase tracking-widest">
        {isEn ? "Visibility" : "Diffusion"}
      </legend>
      {OPTIONS.map((opt) => {
        const [label, hint] = isEn ? opt.en : opt.fr;
        const Icon = opt.icon;
        return (
          <label key={opt.value} className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name={name}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="mt-1 size-4 accent-primary"
            />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 font-semibold">
                <Icon className="size-3.5 shrink-0" /> {label}
              </span>
              <span className="block text-[11px] text-muted-foreground">{hint}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

export function visibilityLabel(v: string, isEn = false) {
  if (v === "profile_only") return isEn ? "My page only" : "Ma page uniquement";
  if (v === "followers_only") return isEn ? "Followers only" : "Réservé à mes abonnés";
  return isEn ? "Main feed + my page" : "Feed général + ma page";
}
