export type VolumeUnit = 'MWH' | 'MW_MEDIO';

export type ContractPriceMonth = {
  ym: string;
  price: number | null;
  volume?: number | null;
  volumeUnit?: VolumeUnit | null;
};

export type ContractPricePeriod = {
  id: string;
  start: string; // YYYY-MM
  end: string; // YYYY-MM
  defaultPrice?: number | null;
  defaultVolume?: number | null;
  defaultVolumeUnit?: VolumeUnit | null;
  months: ContractPriceMonth[];
};

export type ContractPricePeriods = {
  periods: ContractPricePeriod[];
};
