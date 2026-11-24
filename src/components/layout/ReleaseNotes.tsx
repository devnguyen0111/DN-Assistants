import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Markdown release notes, styled with the app's type scale. Loaded lazily by UpdateDialog. */
export default function ReleaseNotes({ body }: { body: string }) {
  return (
    <div className="space-y-2 text-body text-text-2 [&_a]:text-accent-foreground [&_a]:underline [&_code]:rounded-xs [&_code]:bg-surface-3 [&_code]:px-1 [&_code]:font-mono [&_code]:text-code [&_h1]:text-section [&_h1]:text-text-1 [&_h2]:pt-1 [&_h2]:text-label [&_h2]:text-text-1 [&_h3]:text-label [&_h3]:text-text-1 [&_li]:ml-4 [&_ol]:list-decimal [&_strong]:text-text-1 [&_ul]:list-disc [&_ul]:space-y-1">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Links open in the system browser, never inside the app webview.
          a: ({ href, children }) => (
            <a
              href={href}
              onClick={(e) => {
                e.preventDefault();
                if (href) {
                  void import("@tauri-apps/plugin-opener")
                    .then(({ openUrl }) => openUrl(href))
                    .catch(() => window.open(href, "_blank", "noopener,noreferrer"));
                }
              }}
            >
              {children}
            </a>
          ),
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
