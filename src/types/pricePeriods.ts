export type ContractPriceMonth = {
  ym: string;
  price: number | null;
};

export type ContractPricePeriod = {
  id: string;
  start: string; // YYYY-MM
  end: string; // YYYY-MM
  defaultPrice?: number | null;
  months: ContractPriceMonth[];
};

export type ContractPricePeriods = {
  periods: ContractPricePeriod[];
};
