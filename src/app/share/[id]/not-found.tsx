// Unknown, malformed, and revoked IDs all land here, deliberately identical.
export default function ShareNotFound() {
  return (
    <div className="shell py-16 sm:py-24">
      <p className="kicker text-ink-muted">404</p>
      <h1 className="mt-4 text-[2rem] leading-[1.1] sm:text-[2.6rem]">
        Document not found.
      </h1>
      <p className="mt-6 max-w-[48ch] text-ink-soft">
        This link doesn&rsquo;t point at a document that is currently shared.
        It may have been revoked, or the address may be incomplete.
      </p>
    </div>
  );
}
