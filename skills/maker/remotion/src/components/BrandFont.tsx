import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { FONT_STACK } from "../theme";

/** Load a creator-supplied font file (local via staticFile, or a URL) and hold
 *  the render until it is ready — otherwise frame 0 bakes the fallback face and
 *  the rest of the video uses the real one. */
export const useBrandFont = (fontUrl?: string, family?: string): string => {
  const [handle] = useState(() => (fontUrl ? delayRender("loading brand font") : null));
  const [ready, setReady] = useState(!fontUrl);

  useEffect(() => {
    if (!fontUrl || handle === null) return;
    let cancelled = false;
    const face = new FontFace("MakerBrand", `url(${fontUrl})`);
    face
      .load()
      .then((loaded) => {
        if (cancelled) return;
        document.fonts.add(loaded);
        setReady(true);
        continueRender(handle);
      })
      .catch(() => {
        // A missing font must never fail the render — fall back and carry on.
        if (cancelled) return;
        setReady(true);
        continueRender(handle);
      });
    return () => {
      cancelled = true;
    };
  }, [fontUrl, handle]);

  const custom = fontUrl && ready ? `"MakerBrand", ` : "";
  return `${custom}${family ? `${family}, ` : ""}${FONT_STACK}`;
};
