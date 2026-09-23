export type SpotlightScope =
  | "STUDENTS"
  | "TEACHERS"
  | "CLASSES"
  | "COURSES"
  | "COMPANIES"
  | "PLACEMENTS"
  | "WEBSITE";

export type SpotlightRole =
  | "SUPERADMIN"
  | "SCHOOL_ADMIN"
  | "TEACHER"
  | "STUDENT"
  | "DUDI_MENTOR";

export function getSpotlightScopes(
  role: SpotlightRole,
  isAdmin = false,
): readonly SpotlightScope[] {
  if (isAdmin || role === "SUPERADMIN" || role === "SCHOOL_ADMIN") {
    return [
      "STUDENTS",
      "TEACHERS",
      "CLASSES",
      "COURSES",
      "COMPANIES",
      "PLACEMENTS",
      "WEBSITE",
    ];
  }

  if (role === "TEACHER") {
    return ["STUDENTS", "CLASSES", "COURSES", "PLACEMENTS"];
  }

  if (role === "STUDENT") {
    return ["COURSES", "PLACEMENTS"];
  }

  if (role === "DUDI_MENTOR") {
    return ["PLACEMENTS"];
  }

  return [];
}

export function normalizeSpotlightQuery(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 80);
}

export function canRunSpotlightDataSearch(value: string): boolean {
  return normalizeSpotlightQuery(value).length >= 2;
}

export type SpotlightMenuCandidate = {
  label: string;
  section: string;
  href: string;
  icon?: string;
};

function fold(value: string): string {
  return value
    .toLocaleLowerCase("id-ID")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function filterSpotlightMenuItems<T extends SpotlightMenuCandidate>(
  items: readonly T[],
  rawQuery: string,
): T[] {
  const query = fold(normalizeSpotlightQuery(rawQuery));
  if (!query) return [...items];

  const tokens = query.split(" ").filter(Boolean);
  return items.filter((item) => {
    const haystack = fold(`${item.label} ${item.section}`);
    return tokens.every((token) => haystack.includes(token));
  });
}
