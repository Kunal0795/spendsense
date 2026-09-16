import { parseSMS } from "./src/utils/smsParser.js";

const testCases = [
  {
    sms: "Rs 84.43 sent via UPI on 25-04-2026 at 00:37:07 to Kanta Shrawan M.Ref:394908955674.Not you? Call 18004251199/SMS BLOCKUPI to 98950 88888 -Federal Bank",
    expected: { amount: 84.43, isDebit: true, merchant: "Kanta Shrawan" }
  },
  {
    sms: "𝐑𝐬 449.00 𝐬𝐞𝐧𝐭 𝐯𝐢𝐚 𝐔𝐏𝐈 𝐨𝐧 04-04-2026 𝐚𝐭 19:41:04 𝐭𝐨 Mr PRIYESH CH.𝐑𝐞𝐟:847705162919",
    expected: { amount: 449, isDebit: true, merchant: "PRIYESH CH" }
  },
  {
    sms: "ICICI Bank Credit Card XX1001 debited for INR 2.00 on 05-Apr-26 for UPI-609594194798-AWS Indi.",
    expected: { amount: 2, isDebit: true, merchant: "AWS Indi" }
  },
  {
    sms: "ICICI Bank Acct XX888 debited for Rs 2000.00 on 04-Apr-26; HAWA SINGH SHIV credited.",
    expected: { amount: 2000, isDebit: true, merchant: "HAWA SINGH SHIV" }
  },
  {
    sms: "₹500 paid to Zomato via UPI. Fi balance: ₹2,341. -Fi",
    expected: { amount: 500, isDebit: true, merchant: "Zomato" }
  }
];

let failed = false;
for (const [index, tc] of testCases.entries()) {
  const result = parseSMS(tc.sms);
  if (!result) {
    console.error(`Test case ${index + 1} FAILED to parse at all!`);
    failed = true;
    continue;
  }
  const amtMatch = result.amount === tc.expected.amount;
  const debMatch = result.isDebit === tc.expected.isDebit;
  const merMatch = result.merchant === tc.expected.merchant;
  
  if (amtMatch && debMatch && merMatch) {
    console.log(`Test case ${index + 1} PASSED: amount=${result.amount}, isDebit=${result.isDebit}, merchant="${result.merchant}"`);
  } else {
    console.error(`Test case ${index + 1} FAILED:`);
    console.error(`  Expected:`, tc.expected);
    console.error(`  Got:     `, { amount: result.amount, isDebit: result.isDebit, merchant: result.merchant });
    console.error(`  Full result:`, result);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
} else {
  console.log("All SMS parser tests passed successfully!");
}
