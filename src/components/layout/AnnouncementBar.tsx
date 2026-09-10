"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PauseIcon, PlayIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  text: string;
  href?: string;
}

const ROTATE_MS = 5500;

export function AnnouncementBar({ messages }: { messages: readonly Announcement[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (paused || hovered || messages.length < 2) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % messages.length), ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [paused, hovered, messages.length]);

  if (messages.length === 0) return null;

  return (
    <div
      className="on-dark relative bg-onyx text-ivory/85"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <div className="container-luxe relative flex h-9 items-center justify-center">
        <div className="relative h-full w-full max-w-xl overflow-hidden" aria-live="off">
          {messages.map((message, i) => {
            const active = i === index;
            const content = <span className="truncate">{message.text}</span>;
            return (
              <div
                key={message.id}
                aria-hidden={!active}
                className={cn(
                  "absolute inset-0 flex items-center justify-center text-center text-[0.6875rem] uppercase tracking-[0.2em] transition-[opacity,transform] duration-700 ease-luxe",
                  active ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
                )}
              >
                {message.href ? (
                  <Link href={message.href} tabIndex={active ? 0 : -1} className="truncate transition-colors hover:text-champagne-soft">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </div>
            );
          })}
        </div>
        {messages.length > 1 && (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Resume announcements" : "Pause announcements"}
            className="absolute right-[var(--gutter)] hidden h-7 w-7 items-center justify-center text-ivory/50 transition-colors hover:text-ivory md:flex"
          >
            {paused ? <PlayIcon size={12} /> : <PauseIcon size={12} />}
          </button>
        )}
      </div>
    </div>
  );
}
