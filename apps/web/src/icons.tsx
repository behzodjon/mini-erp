import type { ReactElement } from "react";

/** Feather-style 24px line icons, drawn with currentColor so they follow the text colour. */
const PATHS: Record<string, string> = {
  logo: "M8 2h8l-1 6a3 3 0 0 1-6 0L8 2z M12 11v8 M8 22h8",
  products: "M21 8l-9-5-9 5v8l9 5 9-5V8z M3 8l9 5 9-5 M12 13v9",
  warehouses: "M3 21V9l9-6 9 6v12 M9 21v-8h6v8",
  purchases: "M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6z M3 6h18 M16 10a4 4 0 0 1-8 0",
  sales: "M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  counts: "M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  cash: "M2 7h20v12H2z M16 13a2 2 0 1 1-4 0 2 2 0 0 1 4 0z M6 11h.01 M18 15h.01",
  reports: "M18 20V10 M12 20V4 M6 20v-6",
};

export function Icon({ name }: { name: keyof typeof PATHS }): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
