export function BlogContent({ content }: { content: string }) {
  const paragraphs = content.split("\n\n");

  return (
    <div className="space-y-6 text-foreground/70 leading-relaxed">
      {paragraphs.map((block, i) => {
        const trimmed = block.trim();

        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={i} className="mt-2 text-lg font-semibold text-foreground">
              {trimmed.slice(4)}
            </h3>
          );
        }

        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={i} className="mt-4 text-xl font-semibold text-foreground">
              {trimmed.slice(3)}
            </h2>
          );
        }

        if (trimmed.startsWith("- **")) {
          const items = trimmed.split("\n");
          return (
            <ul key={i} className="list-disc space-y-2 pl-6">
              {items.map((item, j) => {
                const text = item.replace(/^- /, "");
                return (
                  <li
                    key={j}
                    dangerouslySetInnerHTML={{
                      __html: formatInline(text),
                    }}
                  />
                );
              })}
            </ul>
          );
        }

        return (
          <p
            key={i}
            dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }}
          />
        );
      })}
    </div>
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeHref(href: string): string {
  if (
    href.startsWith("/") ||
    href.startsWith("https://") ||
    href.startsWith("http://")
  ) {
    return href;
  }
  return "#";
}

function formatInline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground">$1</strong>')
    .replace(
      /\[(.+?)\]\((.+?)\)/g,
      (_, label, url) =>
        `<a href="${sanitizeHref(url)}" class="text-primary hover:underline">${label}</a>`,
    );
}
