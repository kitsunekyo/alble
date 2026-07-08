"use client";

import { useRecentTags } from "@/client/hooks/use-journal";

const MAX_TAGS = 5;

interface RecentTagsProps {
  onSelect: (tag: string) => void;
}

export function RecentTags({ onSelect }: RecentTagsProps) {
  const { data: tags = [] } = useRecentTags();

  if (tags.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground">
      <span className="shrink-0 font-medium">Letzte Tags:</span>
      {tags.slice(0, MAX_TAGS).map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => onSelect(tag)}
          className="inline-flex shrink-0 items-center rounded-full border border-transparent bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 cursor-pointer"
        >
          #{tag}
        </button>
      ))}
    </div>
  );
}
