export type Row = {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number; // 0-1
  position: number;
  prevClicks?: number;
  prevImpressions?: number;
  prevPosition?: number;
};

export type Dataset = {
  name: string;
  industry: IndustryKey;
  site: string;
  rows: Row[];
};

export type IndustryKey = "ecommerce" | "saas" | "publishing" | "local";
