import { createContext } from "react";

/** Keep tooltip portals inside their viewer's style/theme boundary. */
export const ViewerContainerContext = createContext<HTMLElement | null>(null);
