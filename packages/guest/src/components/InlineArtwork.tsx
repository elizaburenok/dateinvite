interface InlineArtworkProps {
  markup: string;
  className: string;
}

/** Only bundled SVG artwork: inline masks render at the page's device resolution. */
export function InlineArtwork({ markup, className }: InlineArtworkProps) {
  return (
    <span
      className={className}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
