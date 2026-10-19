export function getBayCountForRack(rack: number): number {
  if (rack === 101) return 45;
  if (rack >= 102 && rack <= 109) return 49;
  return 84;
}

export function isForkliftPassage(
  rack: number,
  bay: number,
  level: number,
): boolean {
  if (level > 3) return false;
  if (rack >= 101 && rack <= 109) return bay === 12;
  if (rack >= 110 && rack <= 124) return [12, 26, 43, 60].includes(bay);
  return false;
}

export function formatLocationCode(
  rack: number,
  bay: number,
  level: number,
  slots: string[] | string,
): string {
  const bayStr = String(bay).padStart(2, "0");
  const levelStr = String(level).padStart(2, "0");
  const slotStr = Array.isArray(slots) ? slots.join("") : slots;
  return `${rack}-${bayStr}-${levelStr}-${slotStr}`;
}
