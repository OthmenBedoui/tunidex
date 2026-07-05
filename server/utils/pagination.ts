const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

type PageCursorPayload = {
  page: number;
};

const encodeCursorPayload = (payload: PageCursorPayload) =>
  Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

const decodeCursorPayload = (cursor?: string | null): PageCursorPayload | null => {
  if (!cursor) return null;

  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as Partial<PageCursorPayload>;
    if (!Number.isInteger(parsed.page) || parsed.page < 1) {
      return null;
    }
    return { page: parsed.page };
  } catch {
    return null;
  }
};

export type PaginationQuery = {
  page?: number | string;
  cursor?: string;
  limit?: number | string;
};

export type PaginationState = {
  page: number;
  limit: number;
  skip: number;
};

export const resolvePagination = (query: PaginationQuery): PaginationState => {
  const limitNumber = Number(query.limit);
  const limit = Number.isInteger(limitNumber)
    ? Math.max(1, Math.min(MAX_LIMIT, limitNumber))
    : DEFAULT_LIMIT;

  const cursorPage = decodeCursorPayload(query.cursor)?.page;
  const pageNumber = Number(query.page);
  const page = cursorPage
    ?? (Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1);

  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
};

export const buildNextCursor = (page: number, limit: number, total: number) => (
  page * limit < total
    ? encodeCursorPayload({ page: page + 1 })
    : null
);

export const paginationConfig = {
  defaultLimit: DEFAULT_LIMIT,
  maxLimit: MAX_LIMIT
} as const;
