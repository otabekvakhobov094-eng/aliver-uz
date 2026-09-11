/**
 * Qayta urinishlar oralig'i: 1, 2, 5, 15, 30, 60, 120, 240 daqiqa.
 *
 * OFD qisqa vaqtga o'chib qolsa birinchi urinishlar tez bo'ladi;
 * uzoq nosozlikda esa har daqiqada bezovta qilmaydi. Jadval tugagach
 * oxirgi oraliqda qolinadi.
 *
 * Ataylab Prisma dan mustaqil fayl — testda baza kerak emas.
 */
const BACKOFF_MINUTES = [1, 2, 5, 15, 30, 60, 120, 240];

export function backoffMs(attempt: number): number {
  const idx = Math.min(Math.max(attempt, 1) - 1, BACKOFF_MINUTES.length - 1);
  return BACKOFF_MINUTES[idx]! * 60_000;
}
