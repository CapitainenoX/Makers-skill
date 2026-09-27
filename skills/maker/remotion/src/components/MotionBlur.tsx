import React from "react";
import { MB_LEVELS } from "../motion";

/** The directional blur filters `dirBlur()` points at. One hidden SVG per render: a
 *  horizontal and a vertical Gaussian at each quantised strength. The filter region is
 *  widened because the default (10% margin) clips a long smear into a hard edge. */
export const MotionBlurDefs: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
    <defs>
      {Array.from({ length: MB_LEVELS }, (_, i) => i + 1).flatMap((l) => [
        <filter key={`x${l}`} id={`mbx${l}`} x="-40%" y="-10%" width="180%" height="120%"
          colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation={`${l * 2} 0`} />
        </filter>,
        <filter key={`y${l}`} id={`mby${l}`} x="-10%" y="-40%" width="120%" height="180%"
          colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation={`0 ${l * 2}`} />
        </filter>,
      ])}
    </defs>
  </svg>
);
