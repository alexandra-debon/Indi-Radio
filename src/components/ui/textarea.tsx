import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        // Writing language is decoupled from the UI language on purpose.
        // iOS picks the keyboard layout from the field's declared language;
        // letting it inherit <html lang> made the keyboard flip AZERTY <-> QWERTY
        // whenever the user switched the interface to EN. Override per-field if needed.
        lang="fr"
        autoCapitalize="sentences"
        autoCorrect="on"
        spellCheck
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
