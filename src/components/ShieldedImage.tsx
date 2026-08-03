import Image, { type ImageProps } from "next/image";

/* Deterrent, not protection: a transparent overlay catches right-click and
   long-press so the browser menu has no "Save image…", and dragging is
   disabled. The file itself is still reachable via DevTools or its URL. */
export function ShieldedImage({
  wrapperClassName = "relative block",
  ...props
}: ImageProps & { wrapperClassName?: string }) {
  return (
    <span className={`img-shield ${wrapperClassName}`}>
      <Image {...props} draggable={false} />
      <span aria-hidden className="absolute inset-0 select-none" />
    </span>
  );
}
