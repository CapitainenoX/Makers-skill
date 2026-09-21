import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import "@fontsource-variable/inter";
import { FONT_STACK } from "../theme";

/** The display face is bundled, not fetched.
 *
 *  Loading a font from a CDN at render time fails on an offline machine, behind a
 *  corporate proxy, or on any host whose CA the renderer does not trust — and a failed
 *  fetch took the whole render down. `@fontsource-variable/inter` ships the woff2 with
 *  the project, so every render uses the same face with no network at all.
 */
const FAMILY = '"Inter Variable"';

export const useDisplayFont = (override?: string, timeoutMs = 6000): string => {
  const [handle] = useState(() => delayRender("display font"));

  useEffect(() => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      continueRender(handle);
    };
    // Wait for the face to be usable, but never let a font stall a render.
    const ready =
      typeof document !== "undefined" && document.fonts
        ? document.fonts.load(`700 64px ${FAMILY}`).then(() => document.fonts.ready)
        : Promise.resolve();
    ready.then(finish).catch(finish);
    const timer = setTimeout(finish, timeoutMs);
    return () => clearTimeout(timer);
  }, [handle, timeoutMs]);

  return `${override ? `${override}, ` : ""}${FAMILY}, ${FONT_STACK}`;
};
