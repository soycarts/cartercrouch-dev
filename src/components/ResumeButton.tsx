import { profile } from "@/lib/data";
import { FileIcon } from "./icons";

export function ResumeButton() {
  return (
    <a
      href={profile.resumeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm font-medium text-foreground/80 shadow-lg shadow-black/5 backdrop-blur-md transition hover:text-foreground dark:border-white/10 dark:bg-white/5 dark:shadow-black/40"
    >
      <FileIcon className="h-4 w-4" />
      Resume
    </a>
  );
}
