import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  getAppearanceRevision,
  subscribeAppearances,
  getResolvedAppearance,
  loadAppearance,
  findShapeAppearance,
  type ResolvedAppearance,
} from "@trackdraw/schema/appearance/registry";
import type { Shape } from "@trackdraw/schema/shape-types";

const AppearanceContext = createContext<readonly ResolvedAppearance[]>([]);
export function AppearanceProvider({
  appearances = [],
  children,
}: {
  appearances?: readonly ResolvedAppearance[];
  children: ReactNode;
}) {
  return (
    <AppearanceContext.Provider value={appearances}>
      {children}
    </AppearanceContext.Provider>
  );
}
export function useShapeAppearance(shape: Shape) {
  const appearances = useContext(AppearanceContext);
  useSyncExternalStore(subscribeAppearances, getAppearanceRevision, () => 0);
  const embedded = findShapeAppearance(shape, appearances);
  const ref = shape.appearance;
  useEffect(() => {
    if (ref && !embedded) void loadAppearance(ref).catch(() => {});
  }, [ref, embedded]);
  return embedded ?? getResolvedAppearance(ref);
}
