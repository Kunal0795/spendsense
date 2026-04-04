import Dexie from 'dexie'

export const db = new Dexie('SpendSense')

db.version(1).stores({
  transactions: '++id, date, category, source, amount, currency, type, isImpulse',
  budgets:      '++id, category, month',
  subscriptions:'++id, name, renewalDate, category',
  merchantMap:  '++id, pattern, category',
  settings:     'key'
})