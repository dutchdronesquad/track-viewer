import { validateViewerDesignSnapshot } from "./schema";
import type { ViewerDesignSnapshot } from "./types";

function camelCase(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(camelCase);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
        camelCase(entry),
      ])
    );
  }
  return value;
}

/** Convert the authenticated REST response's `data` to the canonical public snapshot.
 * Source/project provenance is stripped by the same validator as local imports.
 */
export function viewerSnapshotFromApi(data: unknown): ViewerDesignSnapshot {
  return validateViewerDesignSnapshot(camelCase(data));
}
