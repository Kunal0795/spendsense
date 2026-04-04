export function isPaymentSMS(text) {
  const isPayment = /debited|credited|sent|received|paid|payment|UPI|NEFT|IMPS|RTGS|Rs\.|INR|₹/i.test(text)
  const isSpam = /OTP|offer|sale|discount|click here|win|prize|lottery|free/i.test(text)
  return isPayment && !isSpam
}

export function extractAmount(text) {
  const patterns = [
    /(?:Rs\.?|INR|₹)\s?([\d,]+\.?\d*)/i,
    /([\d,]+\.?\d*)\s?(?:Rs\.?|INR|₹)/i,
  ]
  for (let p of patterns) {
    const m = text.match(p)
    if (m) return parseFloat(m[1].replace(/,/g, ''))
  }
  return null
}

export function extractDate(text) {
  const patterns = [
    /(\d{2}[-\/]\d{2}[-\/]\d{4})/,
    /(\d{4}[-\/]\d{2}[-\/]\d{2})/,
    /(\d{2}-\d{2}-\d{4})/,
  ]
  for (let p of patterns) {
    const m = text.match(p)
    if (m) return new Date(m[1])
  }
  return new Date()
}

export function extractMerchant(text) {
  const patterns = [
    /to\s+([a-z0-9._-]+@[a-z]+)/i,
    /to\s+([A-Z][A-Z\s*]{2,25}?)(?:\.|,|\s+on|\s+ref|\s+upi)/i,
    /at\s+([A-Z][A-Za-z\s]{2,25}?)(?:\.|,|\s+on)/i,
  ]
  for (let p of patterns) {
    const m = text.match(p)
    if (m) return m[1].trim()
  }
  return 'Unknown'
}

export function isDebit(text) {
  return /debited|sent|paid|payment of|spent|deducted/i.test(text)
}

export function parseSMS(text) {
  if (!isPaymentSMS(text)) return null
  return {
    amount:   extractAmount(text),
    date:     extractDate(text),
    merchant: extractMerchant(text),
    type:     isDebit(text) ? 'debit' : 'credit',
    raw:      text,
  }
}