import { useEffect, useState, type ComponentType } from "react";

type ToasterProps = Record<string, unknown>;

const Toaster = ({ ...props }: ToasterProps) => {
  const [Sonner, setSonner] = useState<ComponentType<any> | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("sonner")
      .then((mod) => {
        if (!cancelled) setSonner(() => mod.Toaster as ComponentType<any>);
      })
      .catch(() => {
        if (!cancelled) setSonner(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Sonner) return null;

  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
