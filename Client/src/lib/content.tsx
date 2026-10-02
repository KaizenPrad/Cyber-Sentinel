import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import * as fallback from "./fallback";
import type { SiteData } from "./types";

const ContentContext = createContext<SiteData>(fallback as unknown as SiteData);

/**
 * Loads site content from the bundled snapshot. (An older revision fetched
 * it from `/api/content`, which this backend does not serve — the request
 * 404'd on every page load, so the fetch was removed.)
 */
export function ContentProvider({ children }: { children: ReactNode }) {
  const [data] = useState<SiteData>(
    () => fallback as unknown as SiteData,
  );

  return (
    <ContentContext.Provider value={data}>{children}</ContentContext.Provider>
  );
}

export function useContent(): SiteData {
  return useContext(ContentContext);
}
