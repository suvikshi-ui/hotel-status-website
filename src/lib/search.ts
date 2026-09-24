import { todayIso, tomorrowIso } from "@/lib/format";

export type HotelSearch = {
  area?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  rooms?: number;
  minPrice?: number;
  maxPrice?: number;
  stars?: number;
  amenity?: string;
  sort?: "status" | "price" | "rating";
};

export type ResolvedSearch = {
  area: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  minPrice?: number;
  maxPrice?: number;
  stars?: number;
  amenity?: string;
  sort: "status" | "price" | "rating";
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function parseSearch(search: Record<string, unknown>): HotelSearch {
  const sortRaw = asString(search.sort);
  const sort =
    sortRaw === "status" || sortRaw === "price" || sortRaw === "rating" ? sortRaw : undefined;
  return {
    area: asString(search.area),
    checkIn: asString(search.checkIn),
    checkOut: asString(search.checkOut),
    guests: asNumber(search.guests),
    rooms: asNumber(search.rooms),
    minPrice: asNumber(search.minPrice),
    maxPrice: asNumber(search.maxPrice),
    stars: asNumber(search.stars),
    amenity: asString(search.amenity),
    sort,
  };
}

export function resolveSearch(search: HotelSearch): ResolvedSearch {
  const checkIn = search.checkIn ?? todayIso();
  let checkOut = search.checkOut ?? tomorrowIso();
  if (checkOut <= checkIn) checkOut = tomorrowIso();
  return {
    area: search.area ?? "",
    checkIn,
    checkOut,
    guests: Math.min(8, Math.max(1, search.guests ?? 2)),
    rooms: Math.min(4, Math.max(1, search.rooms ?? 1)),
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    stars: search.stars,
    amenity: search.amenity,
    sort: search.sort ?? "status",
  };
}

export function searchToQuery(search: ResolvedSearch): HotelSearch {
  return {
    area: search.area || undefined,
    checkIn: search.checkIn,
    checkOut: search.checkOut,
    guests: search.guests,
    rooms: search.rooms,
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    stars: search.stars,
    amenity: search.amenity,
    sort: search.sort === "status" ? undefined : search.sort,
  };
}
