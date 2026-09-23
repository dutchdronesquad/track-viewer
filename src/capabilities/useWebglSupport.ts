"use client";

import { useEffect, useState } from "react";
import { detectWebglSupport, type WebglSupport } from "./webgl";

/**
 * @param forceUnsupported Test-only escape hatch for exercising the
 * WebGL-unsupported fallback path without needing a browser that actually
 * lacks WebGL (used by the spike host page's simulate-fallback toggle).
 */
export function useWebglSupport(forceUnsupported = false): WebglSupport {
  const [detected, setDetected] = useState<WebglSupport>("unsupported");
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      setDetected(detectWebglSupport())
    );
    return () => cancelAnimationFrame(frame);
  }, []);
  return forceUnsupported ? "unsupported" : detected;
}
