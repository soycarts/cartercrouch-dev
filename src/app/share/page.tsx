// Bare landing for share.carter.md/. Nothing is listed here on purpose.
export default function ShareHome() {
  return (
    <div className="shell py-16 sm:py-24">
      <p className="kicker text-ink-muted">Unlisted documents</p>
      <h1 className="mt-4 max-w-[22ch] text-[2rem] leading-[1.1] sm:text-[2.6rem]">
        Markdown shared by Carter Crouch, one link per document.
      </h1>
      <p className="mt-6 max-w-[52ch] text-ink-soft">
        If you were sent a link, open it directly. Every document is also
        available as exact Markdown by adding{" "}
        <code className="font-mono text-[0.85em]">.md</code> to its URL.
      </p>
      <a href="https://cartercrouch.dev" className="link-mono mt-10 text-ink">
        cartercrouch.dev
      </a>
    </div>
  );
}
