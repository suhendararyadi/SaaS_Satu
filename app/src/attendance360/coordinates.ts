/**
 * Koordinat sekolah untuk geofence presensi. Murni (tanpa dependensi) agar dapat diuji
 * dan dipakai oleh halaman pengaturan.
 */

const DECIMAL = /^[+-]?\d+(?:\.\d+)?$/;
const LAT_MESSAGE = "Latitude harus berupa angka antara -90 dan 90.";
const LNG_MESSAGE = "Longitude harus berupa angka antara -180 dan 180.";

function normalize(text: string) {
  return text
    .replace(/[−–—]/g, "-") // minus Unicode → "-"
    .replace(/[()[\]{}]/g, " ")
    .trim();
}

/** Mengubah satu angka desimal bertitik ("-7.2001") menjadi number; null bila bukan angka biasa. */
export function parseCoordinateValue(raw: string): number | null {
  const text = normalize(raw);
  if (!DECIMAL.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

/**
 * Membaca pasangan "lat, lng" seperti hasil salin dari peta: "-7.2001, 107.8887",
 * "-7.2001 107.8887", "(-7.2001; 107.8887)". Harus tepat dua angka desimal bertitik dan
 * berada dalam rentang geografis. Mengembalikan null bila ragu, agar tidak menebak.
 */
export function parseCoordinatePair(text: string): { latitude: number; longitude: number } | null {
  const tokens = normalize(text).split(/[\s,;]+/).filter(Boolean);
  if (tokens.length !== 2) return null;
  const latitude = parseCoordinateValue(tokens[0]);
  const longitude = parseCoordinateValue(tokens[1]);
  if (latitude === null || longitude === null) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

export type CoordinateErrors = { latitude: string | null; longitude: string | null };

/**
 * Memeriksa isian latitude/longitude. Keduanya boleh kosong (geofence belum diatur),
 * tetapi tidak boleh hanya salah satu yang terisi.
 */
export function validateSchoolCoordinates(latitude: string, longitude: string): CoordinateErrors {
  const latText = latitude.trim();
  const lngText = longitude.trim();
  const errors: CoordinateErrors = { latitude: null, longitude: null };
  if (!latText && !lngText) return errors;

  if (!latText) errors.latitude = "Latitude belum diisi.";
  else {
    const value = parseCoordinateValue(latText);
    if (value === null || Math.abs(value) > 90) {
      errors.latitude = value !== null && Math.abs(value) <= 180 && lngText !== "" && Math.abs(parseCoordinateValue(lngText) ?? 999) <= 90
        ? "Latitude di luar -90 sampai 90. Urutannya mungkin tertukar: latitude dahulu, baru longitude."
        : LAT_MESSAGE;
    }
  }
  if (!lngText) errors.longitude = "Longitude belum diisi.";
  else {
    const value = parseCoordinateValue(lngText);
    if (value === null || Math.abs(value) > 180) errors.longitude = LNG_MESSAGE;
  }
  return errors;
}

export function formatCoordinatePair(latitude: number | null | undefined, longitude: number | null | undefined): string {
  if (latitude == null || longitude == null) return "belum diatur";
  return `${latitude}, ${longitude}`;
}

export function mapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}`;
}
