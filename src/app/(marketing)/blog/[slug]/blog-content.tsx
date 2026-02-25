export function BlogContent({ content }: { content: string }) {
  const paragraphs = content.split("\n\n");

  return (
    <div className="space-y-6 text-foreground/70 leading-relaxed">
      {paragraphs.map((block, i) => {
        const trimmed = block.trim();

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

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground">$1</strong>')
    .replace(
      /\[(.+?)\]\((.+?)\)/g,
      '<a href="$2" class="text-primary hover:underline">$1</a>',
    );
}
