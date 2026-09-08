export type BookingsPage = {
  data?: any[];
  pagination?: {
    page?: number;
    limit?: number;
    totalCount?: number;
    hasNextPage?: boolean;
  };
};

/** Load every booking for a departure. Never treat a single capped page as complete. */
export async function fetchAllDepartureBookings(options: {
  getPage: (page: number, limit: number) => Promise<BookingsPage>;
  pageSize?: number;
  maxPages?: number;
}): Promise<{ bookings: any[]; incomplete: boolean; totalCount: number | null }> {
  const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : 100;
  const maxPages = options.maxPages && options.maxPages > 0 ? options.maxPages : 50;
  const bookings: any[] = [];
  let page = 1;
  let totalCount: number | null = null;

  while (page <= maxPages) {
    const body = await options.getPage(page, pageSize);
    const chunk = Array.isArray(body?.data) ? body.data : [];
    bookings.push(...chunk);
    if (typeof body?.pagination?.totalCount === "number") {
      totalCount = body.pagination.totalCount;
    }
    const hasNext =
      body?.pagination?.hasNextPage === true ||
      (totalCount != null && bookings.length < totalCount && chunk.length === pageSize);
    if (!hasNext || chunk.length === 0) {
      const incomplete =
        totalCount != null ? bookings.length < totalCount : false;
      return { bookings, incomplete, totalCount };
    }
    page += 1;
  }

  return {
    bookings,
    incomplete: true,
    totalCount,
  };
}
