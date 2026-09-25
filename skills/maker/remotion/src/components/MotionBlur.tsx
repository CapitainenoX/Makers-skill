import React from "react";
import { MB_LEVELS, MB_STEP } from "../motion";

/** The filter bank behind `blurFilter`: one horizontal and one vertical Gaussian per
 *  level. Rendered once at the root; any element can then point at `url(#mbx12)`.
 *  Filtering along a single axis is what separates motion blur from defocus. */
export const MotionBlurDefs: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
    <defs>
      {Array.from({ length: MB_LEVELS }).map((_, i) => {
        const s = ((i + 1) * MB_STEP).toFixed(2);
        return (
          <React.Fragment key={i}>
            <filter id={`mbx${i + 1}`} x="-30%" y="-5%" width="160%" height="110%"
              colorInterpolationFilters="sRGB">
              <feGaussianBlur stdDeviation={`${s} 0`} />
            </filter>
            <filter id={`mby${i + 1}`} x="-5%" y="-30%" width="110%" height="160%"
              colorInterpolationFilters="sRGB">
              <feGaussianBlur stdDeviation={`0 ${s}`} />
            </filter>
          </React.Fragment>
        );
      })}
    </defs>
  </svg>
);
