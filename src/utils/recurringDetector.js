export function detectRecurring(transactions) {
  if (!transactions || transactions.length === 0) return [];

  const now = new Date();
  const ninetyDaysAgo = now.getTime() - 90 * 24 * 60 * 60 * 1000;

  // Filter to debits in the last 90 days
  const recentDebits = transactions.filter(
    (t) => t.isDebit && t.date >= ninetyDaysAgo && t.merchant && t.merchant !== "Unknown"
  );

  // Group by merchant (case-insensitive)
  const grouped = {};
  for (const t of recentDebits) {
    const key = t.merchant.toLowerCase().trim();
    if (!grouped[key]) {
      grouped[key] = {
        name: t.merchant,
        amounts: [],
        months: new Set(),
      };
    }
    grouped[key].amounts.push(t.amount);
    
    const d = new Date(t.date);
    const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
    grouped[key].months.add(monthKey);
  }

  const results = [];

  for (const key in grouped) {
    const group = grouped[key];
    
    // Condition 1: Appears in 2 or more different calendar months
    if (group.months.size >= 2) {
      // Condition 2: Amounts are within 20% variance of each other
      const min = Math.min(...group.amounts);
      const max = Math.max(...group.amounts);
      const avg = group.amounts.reduce((a, b) => a + b, 0) / group.amounts.length;

      // Check if max is within 20% of min, or all amounts are within 20% of avg
      // A simple check: max cannot be more than 1.2x of min
      // Wait, if min is 0 it breaks, but amounts > 0.
      if (min > 0 && max <= min * 1.2) {
        results.push({
          merchant: group.name,
          avgAmount: avg,
          frequency: "Monthly",
          suggestSubscription: true,
        });
      }
    }
  }

  // Sort by avg amount descending
  return results.sort((a, b) => b.avgAmount - a.avgAmount);
}
