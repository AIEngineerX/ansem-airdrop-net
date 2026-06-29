"use client";
import { useEffect, useRef } from "react";

// Minimal typing for the X (Twitter) widgets script we lazy-load.
declare global {
  interface Window {
    twttr?: { widgets?: { load?: (el?: HTMLElement | null) => void } };
  }
}

const WIDGET_SRC = "https://platform.twitter.com/widgets.js";
const SCRIPT_ID = "twitter-wjs";

/**
 * Embeds an X profile timeline via X's official widget. The widget script is
 * loaded once, lazily, on the client. If X is unreachable/blocked the rest of
 * the page is unaffected — this is the only third-party runtime dependency.
 */
export function XTimeline({ handle, height = 460 }: { handle: string; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const render = () => window.twttr?.widgets?.load?.(ref.current);
    if (window.twttr?.widgets) {
      render();
      return;
    }
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", render);
      return () => existing.removeEventListener("load", render);
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = WIDGET_SRC;
    script.async = true;
    script.onload = render;
    document.body.appendChild(script);
  }, [handle]);

  return (
    <div ref={ref} key={handle}>
      <a
        className="twitter-timeline"
        data-theme="dark"
        data-height={height}
        data-chrome="noheader nofooter transparent noborders"
        href={`https://twitter.com/${handle}`}
      >
        @{handle} on X
      </a>
    </div>
  );
}
