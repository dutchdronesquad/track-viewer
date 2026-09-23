export type WebglSupport = "supported" | "unsupported";

/**
 * Detects whether the current environment can render the 3D viewer.
 * No equivalent check exists elsewhere in the codebase — the editor's 3D
 * preview simply assumes WebGL is available.
 */
export function detectWebglSupport(
  createCanvas: () => HTMLCanvasElement = () => document.createElement("canvas")
): WebglSupport {
  if (typeof document === "undefined") return "unsupported";
  try {
    const canvas = createCanvas();
    // Three.js requires WebGL2. Release the probe context immediately.
    const gl = canvas.getContext("webgl2");
    gl?.getExtension?.("WEBGL_lose_context")?.loseContext();
    return gl ? "supported" : "unsupported";
  } catch {
    return "unsupported";
  }
}
