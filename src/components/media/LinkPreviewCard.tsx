import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { fetchLinkPreview } from "@/lib/link-preview.functions";

export function LinkPreviewCard({ url }: { url: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["link-preview", url],
    queryFn: () => fetchLinkPreview({ data: { url } }),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    retry: false,
  });

  // Fallback: plain link chip
  if (isLoading) {
    return (
      <div className="my-2 h-16 animate-pulse rounded-md border border-border bg-muted/40" />
    );
  }
  if (!data || (!data.title && !data.image && !data.description)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="my-2 inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
      >
        <span className="truncate">{url}</span>
        <ExternalLink className="size-3 shrink-0" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="my-2 block overflow-hidden rounded-md border border-border bg-background transition hover:bg-muted/40"
    >
      {data.image && (
        <img
          src={data.image}
          alt=""
          loading="lazy"
          className="h-40 w-full object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      )}
      <div className="space-y-1 p-2.5">
        {data.siteName && (
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{data.siteName}</div>
        )}
        {data.title && <div className="text-sm font-semibold leading-snug">{data.title}</div>}
        {data.description && (
          <div className="line-clamp-2 text-xs text-muted-foreground">{data.description}</div>
        )}
      </div>
    </a>
  );
}