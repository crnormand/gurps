export type SortDirection = "asc" | "desc";

export interface OrderData {
	by: string;
	direction: SortDirection;
	/** The key must be present as an index key in the database */
	options: Record<string, string>;
}

export interface FilterData {
	order: OrderData;
	searchQuery: string;
}
