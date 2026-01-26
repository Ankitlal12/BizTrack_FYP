// Build query string for API requests
export const buildTransactionsQueryString = (filters: {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  totalMin?: string;
  totalMax?: string;
  sortBy?: string;
  sortOrder?: string;
}): string => {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      params.append(key, value.toString());
    }
  });
  
  return params.toString();
};