const UPI_MAP = {
  'zomato': 'food', 'swiggy': 'food', 'blinkit': 'food', 'dunzo': 'food',
  'uber': 'travel', 'ola': 'travel', 'rapido': 'travel', 'irctc': 'travel',
  'netflix': 'subscript', 'spotify': 'subscript', 'hotstar': 'subscript', 'prime': 'subscript',
  'amazon': 'shopping', 'flipkart': 'shopping', 'myntra': 'shopping', 'meesho': 'shopping',
  'apollo': 'health', 'pharmeasy': 'health', 'medplus': 'health', 'netmeds': 'health',
  'pvr': 'entertain', 'inox': 'entertain', 'bookmyshow': 'entertain',
  'airtel': 'bills', 'jio': 'bills', 'bsnl': 'bills', 'bescom': 'bills',
}

const KEYWORD_MAP = [
  { re: /zoma|swgy|swiggy|food|restaurant|cafe|dhaba|lunch|dinner|breakfast/i, cat: 'food' },
  { re: /uber|ola|rapido|fuel|petrol|cab|metro|irctc|bus|train|flight/i,       cat: 'travel' },
  { re: /netflix|spotify|prime|hotstar|youtube|subscription/i,                  cat: 'subscript' },
  { re: /amazon|flipkart|myntra|meesho|shop|store|mall/i,                       cat: 'shopping' },
  { re: /apollo|medplus|pharmacy|hospital|clinic|doctor|medical/i,              cat: 'health' },
  { re: /pvr|inox|movie|concert|bookmyshow|theatre/i,                           cat: 'entertain' },
  { re: /airtel|jio|bescom|electricity|recharge|bill|broadband/i,               cat: 'bills' },
  { re: /udemy|coursera|college|school|fees|tuition/i,                          cat: 'education' },
]

function byUPI(merchant) {
  const lower = merchant.toLowerCase()
  for (let key of Object.keys(UPI_MAP)) {
    if (lower.includes(key)) return UPI_MAP[key]
  }
  return null
}

function byKeyword(merchant) {
  for (let { re, cat } of KEYWORD_MAP) {
    if (re.test(merchant)) return cat
  }
  return null
}

function byHeuristics(amount, date) {
  const hour = new Date(date).getHours()
  if (amount < 100 && (hour >= 6 && hour <= 10)) return 'food'
  if (amount < 300 && (hour >= 12 && hour <= 14)) return 'food'
  if (amount < 100 && (hour >= 18 && hour <= 21)) return 'food'
  return null
}

function byMemory(merchant, merchantMap) {
  const lower = merchant.toLowerCase()
  const match = merchantMap.find(m => lower.includes(m.pattern.toLowerCase()))
  return match ? match.category : null
}

export function categorize(merchant, amount, date, merchantMap = []) {
  return (
    byMemory(merchant, merchantMap) ||
    byUPI(merchant) ||
    byKeyword(merchant) ||
    byHeuristics(amount, date) ||
    null
  )
}