import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatQuantity(totalBottles: number, itemsPerCase: number) {
  const fullCases = Math.floor(totalBottles / itemsPerCase);
  const leftoverBottles = Math.round(totalBottles % itemsPerCase);
  
  if (fullCases === 0) return `${leftoverBottles}btls`;
  if (leftoverBottles === 0) return `${fullCases}cs`;
  return `${fullCases}cs ${leftoverBottles}btls`;
}
