/**
 * merchantColor.js
 *
 * Returns a consistent Tailwind bg-color class for a given merchant name.
 * The same merchant name always maps to the same color (deterministic hash).
 *
 * Algorithm: sum of char codes modulo 12 → index into color palette.
 */

const COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-yellow-500",
  "bg-lime-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-purple-500",
  "bg-pink-500",
];

/**
 * @param {string} merchant - Merchant name string
 * @returns {string} Tailwind bg-color class, e.g. "bg-emerald-500"
 */
export function merchantColor(merchant) {
  if (!merchant || merchant.length === 0) return COLORS[0];
  let sum = 0;
  for (let i = 0; i < merchant.length; i++) {
    sum += merchant.charCodeAt(i);
  }
  return COLORS[sum % COLORS.length];
}
