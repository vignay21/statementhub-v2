export type SearchMode = "utr" | "date" | "amount" | "party" | "all";

export type PeriodFilter = "all" | "this_month" | "last_30_days" | "fy" | "custom";

export type SortOrder = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

export interface SearchFilterState {
  mode: SearchMode;
  query: string;
  bank: string;
  period: PeriodFilter;
  startDate?: string;
  endDate?: string;
  sort: SortOrder;
  excludeContra: boolean;
  excludeFD: boolean;
}
