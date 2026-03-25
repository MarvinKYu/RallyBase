export interface TournamentFilterParams {
  q?: string;
  org?: string;
  loc?: string;
  after?: string;
  before?: string;
}

export function filterTournaments<T extends {
  name: string;
  organizationId: string;
  location: string | null;
  startDate: Date | string;
}>(tournaments: T[], params: TournamentFilterParams): T[] {
  let result = [...tournaments];
  if (params.q) {
    const lower = params.q.toLowerCase();
    result = result.filter((t) => t.name.toLowerCase().includes(lower));
  }
  if (params.org) {
    result = result.filter((t) => t.organizationId === params.org);
  }
  if (params.loc) {
    const lower = params.loc.toLowerCase();
    result = result.filter((t) => t.location?.toLowerCase().includes(lower));
  }
  if (params.after) {
    const after = new Date(params.after);
    result = result.filter((t) => new Date(t.startDate) >= after);
  }
  if (params.before) {
    const before = new Date(params.before);
    result = result.filter((t) => new Date(t.startDate) <= before);
  }
  result.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  return result;
}

export function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return {
    items: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    total,
    totalPages,
    page: safePage,
  };
}
