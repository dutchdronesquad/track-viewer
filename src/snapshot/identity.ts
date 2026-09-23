import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type { ViewerDesignSnapshot } from "./types";

export function sha256Hex(bytes: Uint8Array): string {
  return bytesToHex(sha256(bytes));
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, entry]) => [key, canonical(entry)])
    );
  }
  return value;
}

/** Hash the validated public content, independently of property insertion order. */
export function getViewerSnapshotId(
  snapshot: Omit<ViewerDesignSnapshot, "snapshotId">
): string {
  const { schema, requiredViewer, design, assets } = snapshot;
  return `sha256:${sha256Hex(
    new TextEncoder().encode(
      JSON.stringify(
        canonical({
          schema,
          requiredViewer: {
            ...requiredViewer,
            capabilities: [...requiredViewer.capabilities].sort(),
          },
          design,
          assets: [...assets].sort((a, b) =>
            a.path < b.path ? -1 : a.path > b.path ? 1 : 0
          ),
        })
      )
    )
  )}`;
}
