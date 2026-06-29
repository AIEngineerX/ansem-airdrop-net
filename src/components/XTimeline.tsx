"use client";
import { useEffect, useRef, useState } from "react";

// Minimal typing for the X (Twitter) widgets script + idle scheduling.
declare global {
  interface Window {
    twttr?: { widgets?: { load?: (el?: HTMLElement | null) => void } };
  }
}

const WIDGET_SRC = "https://platform.twitter.com/widgets.js";
const SCRIPT_ID = "twitter-wjs";

/**
 * Embeds an X profile timeline via X's official widget — lazily. The widget is
 * the page's only third-party runtime dependency and its heaviest, so we don't
 * touch it until the rail nears the viewport, then load it at idle. That keeps
 * it off the critical render path (better Lighthouse) while still showing the
 * live timeline. A reserved-height placeholder avoids layout shift. If X is
 * unreachable/blocked the rest of the page is unaffected.
 */
export function XTimeline({ handle, height = 460 }: { handle: string; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  // Reveal when the rail scrolls within ~200px of the viewport.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Once revealed, load X's widgets.js deferred to idle so it never competes
  // with first paint.
  useEffect(() => {
    if (!show) return;
    const run = () => {
      const render = () => window.twttr?.widgets?.load?.(ref.current);
      if (window.twttr?.widgets) {
        render();
        return;
      }
      const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener("load", render);
        return;
      }
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = WIDGET_SRC;
      script.async = true;
      script.onload = render;
      document.body.appendChild(script);
    };
    const idle = window.requestIdleCallback;
    if (idle) idle(run, { timeout: 2000 });
    else window.setTimeout(run, 800);
  }, [show, handle]);

  return (
    <div ref={ref} key={handle} style={{ minHeight: height }}>
      {show ? (
        <a
          className="twitter-timeline"
          data-theme="dark"
          data-height={height}
          data-chrome="noheader nofooter transparent noborders"
          href={`https://twitter.com/${handle}`}
        >
          @{handle} on X
        </a>
      ) : (
        <div className="flex items-center justify-center text-xs text-zinc-600" style={{ height }}>
          Loading @{handle}&rsquo;s posts…
        </div>
      )}
    </div>
  );
}
