export type Listing = {
  source: string;
  title: string;
  price: number;
  url: string | null;
};

export type MatchType = "SAME_PRODUCT" | "SIMILAR" | "SAME_SPEC" | "ALTERNATIVE";

export type ClassifiedListing = Listing & {
  matchType: MatchType;
  matchScore: number;
};

export type ProductInput = {
  productName: string;
  category: string;
  brand: string;
  model: string;
  specs: string;
  /** Optional local vendor price. null when the requester quoted no price. */
  unitPrice: number | null;
  quantity: number;
};
