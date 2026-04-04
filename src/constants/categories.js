export const CATEGORIES = [
  { id: 'food',      label: 'Food & Dining',    icon: '🍔', color: '#FBBF24' },
  { id: 'travel',    label: 'Travel',            icon: '🚗', color: '#60A5FA' },
  { id: 'shopping',  label: 'Shopping',          icon: '🛍️', color: '#F472B6' },
  { id: 'bills',     label: 'Bills & Utilities', icon: '⚡', color: '#A78BFA' },
  { id: 'health',    label: 'Health',            icon: '💊', color: '#34D399' },
  { id: 'entertain', label: 'Entertainment',     icon: '🎬', color: '#FB923C' },
  { id: 'subscript', label: 'Subscriptions',     icon: '🔄', color: '#818CF8' },
  { id: 'education', label: 'Education',         icon: '📚', color: '#2DD4BF' },
  { id: 'other',     label: 'Other',             icon: '📦', color: '#94A3B8' },
]

export const SOURCES = ['UPI', 'Card', 'Cash', 'Wallet', 'Net Banking']

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'AED', symbol: '﷼', label: 'UAE Dirham' },
]

export const CAT_MAP = Object.fromEntries(
  CATEGORIES.map(c => [c.id, c])
)