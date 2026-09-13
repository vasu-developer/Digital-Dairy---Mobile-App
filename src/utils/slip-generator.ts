import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { MilkCollection, Transaction } from '@/types';
import { formatCurrency } from './calculator';

export async function printMilkSlip(collection: MilkCollection) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Courier New', Courier, monospace;
            padding: 12px;
            width: 280px;
            margin: 0 auto;
            color: #000;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .header { border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
          .row { display: flex; justify-content: space-between; margin: 4px 0; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .footer { border-top: 2px dashed #000; padding-top: 8px; margin-top: 12px; font-size: 11px; }
          .big-amount { font-size: 18px; font-weight: bold; margin: 8px 0; }
        </style>
      </head>
      <body>
        <div class="center header">
          <div style="font-size: 16px;" class="bold">🥛 DAIRY NOTE</div>
          <div style="font-size: 11px;">Digital Milk Slip</div>
          <div>---------------------------</div>
        </div>

        <div class="row">
          <span>Date: ${collection.date}</span>
          <span class="bold">${collection.session}</span>
        </div>

        <div class="row">
          <span>Customer:</span>
          <span class="bold">${collection.customer_name || 'Customer'}</span>
        </div>

        <div class="divider"></div>

        <div class="row">
          <span>Quantity:</span>
          <span class="bold">${collection.quantity.toFixed(2)} L</span>
        </div>

        <div class="row">
          <span>Fat (%):</span>
          <span>${collection.fat.toFixed(1)} %</span>
        </div>

        <div class="row">
          <span>SNF (%):</span>
          <span>${collection.snf.toFixed(1)} %</span>
        </div>

        <div class="row">
          <span>Rate:</span>
          <span>${formatCurrency(collection.rate)} / L</span>
        </div>

        <div class="divider"></div>

        <div class="row big-amount">
          <span>Total Amount:</span>
          <span>${formatCurrency(collection.amount)}</span>
        </div>

        <div class="center footer">
          <div>Thank you! Keep collecting.</div>
          <div>Powered by Digital Dairy</div>
        </div>
      </body>
    </html>
  `;

  try {
    await Print.printAsync({ html: htmlContent });
  } catch (error) {
    console.error('Error printing milk slip:', error);
  }
}

export async function shareMonthlyStatementPDF(
  customerName: string,
  monthYear: string,
  totalCredit: number,
  totalDebit: number,
  balance: number,
  transactions: Transaction[]
) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Monthly Statement - ${customerName}</title>
        <style>
          body { font-family: sans-serif; padding: 24px; color: #1E293B; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0F766E; padding-bottom: 12px; }
          .title { font-size: 24px; color: #0F766E; font-weight: bold; }
          .summary-card { background: #F8FAFC; border: 1px solid #E2E8F0; padding: 16px; border-radius: 8px; margin: 16px 0; display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { background: #0F766E; color: white; padding: 10px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #E2E8F0; }
          .credit { color: #16A34A; font-weight: bold; }
          .debit { color: #DC2626; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">🥛 DAIRY NOTE</div>
            <div>Monthly Customer Statement</div>
          </div>
          <div style="text-align: right;">
            <strong>${customerName}</strong><br/>
            <span>Period: ${monthYear}</span>
          </div>
        </div>

        <div class="summary-card">
          <div>Total Credit: <strong class="credit">${formatCurrency(totalCredit)}</strong></div>
          <div>Total Deductions: <strong class="debit">${formatCurrency(totalDebit)}</strong></div>
          <div>Net Balance: <strong>${formatCurrency(balance)}</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${transactions
              .map(
                (tx) => `
              <tr>
                <td>${tx.date}</td>
                <td>${tx.category}</td>
                <td>${tx.notes || tx.type}</td>
                <td class="${tx.is_credit ? 'credit' : 'debit'}">
                  ${tx.is_credit ? '+' : '-'}${formatCurrency(tx.amount)}
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    await Sharing.shareAsync(uri);
  } catch (error) {
    console.error('Error sharing PDF statement:', error);
  }
}

/**
 * Validate whether a phone number is a valid 10-digit Indian mobile number
 * (optionally prefixed with +91, 91, or 0)
 */
export function isValidIndianPhone(phone?: string): boolean {
  if (!phone) return false;
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10 && /^[6-9]\d{9}$/.test(clean)) return true;
  if (clean.length === 11 && clean.startsWith('0') && /^[6-9]\d{9}$/.test(clean.slice(1))) return true;
  if (clean.length === 12 && clean.startsWith('91') && /^[6-9]\d{9}$/.test(clean.slice(2))) return true;
  return false;
}

/**
 * Format a phone number into WhatsApp international format for India (91XXXXXXXXXX)
 * Returns null if the phone is not a valid Indian mobile number.
 */
export function formatIndianWhatsAppNumber(phone?: string): string | null {
  if (!phone) return null;
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10 && /^[6-9]\d{9}$/.test(clean)) return `91${clean}`;
  if (clean.length === 11 && clean.startsWith('0') && /^[6-9]\d{9}$/.test(clean.slice(1))) return `91${clean.slice(1)}`;
  if (clean.length === 12 && clean.startsWith('91') && /^[6-9]\d{9}$/.test(clean.slice(2))) return clean;
  return null;
}

/**
 * Send an accurate, professionally formatted single-shift milk slip to customer's WhatsApp
 */
export async function shareWhatsAppMilkSlip(
  collection: MilkCollection,
  phone?: string,
  timeStr?: string
): Promise<{ success: boolean; error?: string }> {
  const formattedPhone = formatIndianWhatsAppNumber(phone);
  if (!formattedPhone) {
    return {
      success: false,
      error: 'INVALID_PHONE',
    };
  }

  const sessText = collection.session === 'MORNING' ? 'Morning ☀️' : 'Evening 🌙';
  const timeDisplay =
    timeStr ||
    (collection.created_at
      ? new Date(collection.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  const msg =
    `🥛 *Digital Dairy - MILK SLIP (दूध पर्ची)* 🥛\n` +
    `--------------------------------\n` +
    `*Farmer / Customer:* ${collection.customer_name || 'Customer'}\n` +
    `📅 *Date:* ${collection.date}\n` +
    `⏰ *Shift & Time:* ${sessText} • ${timeDisplay}\n` +
    `--------------------------------\n` +
    `🥛 *Milk Quantity:* ${collection.quantity.toFixed(2)} Litres\n` +
    `🧪 *Fat:* ${collection.fat.toFixed(1)}%\n` +
    `🧪 *SNF:* ${collection.snf.toFixed(1)}%\n` +
    `🏷️ *Milk Rate:* ${formatCurrency(collection.rate)} / L\n` +
    `💰 *Total Amount:* ${formatCurrency(collection.amount)}\n` +
    `--------------------------------\n` +
    `_Generated by Digital Dairy App_`;

  const encodedMsg = encodeURIComponent(msg);
  const targetUrl = `whatsapp://send?phone=${formattedPhone}&text=${encodedMsg}`;
  const webUrl = `https://wa.me/${formattedPhone}?text=${encodedMsg}`;

  try {
    const { Linking } = require('react-native');
    const canOpen = await Linking.canOpenURL(targetUrl);
    if (canOpen) {
      await Linking.openURL(targetUrl);
      return { success: true };
    }
    const canOpenWeb = await Linking.canOpenURL(webUrl);
    if (canOpenWeb) {
      await Linking.openURL(webUrl);
      return { success: true };
    }
    await Sharing.shareAsync(`data:text/plain;utf8,${encodedMsg}`);
    return { success: true };
  } catch (err: any) {
    console.warn('WhatsApp direct send error:', err);
    try {
      await Sharing.shareAsync(`data:text/plain;utf8,${encodedMsg}`);
      return { success: true };
    } catch (fallbackErr: any) {
      return { success: false, error: fallbackErr?.message || 'Failed to send WhatsApp message.' };
    }
  }
}

/**
 * Send an accurate, formatted Monthly Customer Statement breakdown to customer's WhatsApp
 */
export async function shareWhatsAppMonthlyCustomerStatement(params: {
  customerName: string;
  phone?: string;
  monthYear: string;
  totalLitres: number;
  avgFat: number;
  avgSnf: number;
  totalMilkValue: number;
  totalDeductions: number;
  previousBalance: number;
  netPayable: number;
  isBuyer?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const formattedPhone = formatIndianWhatsAppNumber(params.phone);
  if (!formattedPhone) {
    return {
      success: false,
      error: 'INVALID_PHONE',
    };
  }

  const roleLabel = params.isBuyer ? 'Retail Buyer' : 'Milk Farmer';
  const valueLabel = params.isBuyer ? 'Total Purchase Value' : 'Gross Milk Value';
  const finalLabel = params.isBuyer ? 'NET DUE AMOUNT (देय राशि)' : 'NET PAYABLE AMOUNT (कुल भुगतान)';

  let msg =
    `🥛 *Digital Dairy - MONTHLY STATEMENT* 🥛\n` +
    `--------------------------------\n` +
    `👤 *Customer:* ${params.customerName} (${roleLabel})\n` +
    `📅 *Month & Year:* ${params.monthYear}\n` +
    `--------------------------------\n` +
    `🥛 *Total Milk ${params.isBuyer ? 'Purchased' : 'Supplied'}:* ${params.totalLitres.toFixed(1)} Litres\n`;

  if (!params.isBuyer) {
    msg += `🧪 *Avg Fat:* ${params.avgFat.toFixed(1)}% | *Avg SNF:* ${params.avgSnf.toFixed(1)}%\n`;
  }

  msg +=
    `💰 *${valueLabel}:* ${formatCurrency(params.totalMilkValue)}\n` +
    `--------------------------------\n`;

  if (params.totalDeductions > 0) {
    msg += `📋 *Advance / Feed Deductions:* -${formatCurrency(params.totalDeductions)}\n`;
  }

  if (params.previousBalance !== 0) {
    msg += `⚖️ *Previous Balance / Settlement:* ${params.previousBalance > 0 ? '+' : ''}${formatCurrency(params.previousBalance)}\n`;
  }

  msg +=
    `--------------------------------\n` +
    `💵 *${finalLabel}:*\n` +
    `*${formatCurrency(params.netPayable)}*\n` +
    `--------------------------------\n` +
    `_Generated by Digital Dairy App_`;

  const encodedMsg = encodeURIComponent(msg);
  const targetUrl = `whatsapp://send?phone=${formattedPhone}&text=${encodedMsg}`;
  const webUrl = `https://wa.me/${formattedPhone}?text=${encodedMsg}`;

  try {
    const { Linking } = require('react-native');
    const canOpen = await Linking.canOpenURL(targetUrl);
    if (canOpen) {
      await Linking.openURL(targetUrl);
      return { success: true };
    }
    const canOpenWeb = await Linking.canOpenURL(webUrl);
    if (canOpenWeb) {
      await Linking.openURL(webUrl);
      return { success: true };
    }
    await Sharing.shareAsync(`data:text/plain;utf8,${encodedMsg}`);
    return { success: true };
  } catch (err: any) {
    console.warn('WhatsApp monthly statement share error:', err);
    try {
      await Sharing.shareAsync(`data:text/plain;utf8,${encodedMsg}`);
      return { success: true };
    } catch (fallbackErr: any) {
      return { success: false, error: fallbackErr?.message || 'Failed to send WhatsApp statement.' };
    }
  }
}

export interface MoneyLedgerShareParams {
  customerName: string;
  phone?: string;
  village?: string;
  monthYear: string;
  isBuyer?: boolean;
  isPastMonth?: boolean;
  accumulatedMilkValue: number;
  totalDeductions: number;
  paymentsMade: number;
  customerRepayments: number;
  payableBalance: number;
  transactions: Transaction[];
}

/**
 * Share monthly money ledger / bahi-khata statement directly to customer's WhatsApp
 */
export async function shareWhatsAppMoneyLedgerStatement(
  params: MoneyLedgerShareParams
): Promise<{ success: boolean; error?: string }> {
  const formattedPhone = formatIndianWhatsAppNumber(params.phone);

  const roleLabel = params.isBuyer ? 'Retail Buyer' : 'Milk Farmer';
  const headerTitle = params.isBuyer ? 'BUYER MONEY LEDGER' : 'MONEY LEDGER STATEMENT (बही-खाता)';
  const milkValLabel = params.isBuyer ? 'Milk Purchased Value' : 'Milk Supplied Value';
  const balanceLabel = params.isBuyer
    ? (params.isPastMonth ? 'CLOSED DUE TO DAIRY' : 'TOTAL DUE TO DAIRY')
    : (params.isPastMonth ? 'CLOSED BALANCE (अंतिम शेष)' : 'NET PAYABLE BALANCE');

  let msg =
    `🥛 *Digital Dairy - ${headerTitle}* 🥛\n` +
    `--------------------------------\n` +
    `👤 *Customer:* ${params.customerName} (${roleLabel})\n` +
    (params.village ? `📍 *Village:* ${params.village}\n` : '') +
    `📅 *Period:* ${params.monthYear}\n` +
    `--------------------------------\n` +
    `📊 *MONTHLY FINANCIAL SUMMARY:*\n` +
    `• ${milkValLabel}: ${formatCurrency(params.accumulatedMilkValue)}\n`;

  if (params.totalDeductions > 0) {
    msg += `• Advances / Deductions: -${formatCurrency(params.totalDeductions)}\n`;
  }
  if (params.customerRepayments > 0) {
    msg += `• Repayments Received: +${formatCurrency(params.customerRepayments)}\n`;
  }
  if (params.paymentsMade > 0) {
    msg += `• Cash Hisaab Paid: -${formatCurrency(params.paymentsMade)}\n`;
  }

  // Transactions list for the month
  if (params.transactions && params.transactions.length > 0) {
    msg += `--------------------------------\n` + `📝 *TRANSACTIONS THIS MONTH (${params.transactions.length}):*\n`;
    params.transactions.forEach((tx) => {
      const isCredit = tx.type === 'CUSTOMER_PAYMENT_RECEIVED' || tx.type === 'PAYMENT_MADE' || tx.is_credit === 1;
      const sign = isCredit ? '+' : '-';
      const datePart = tx.date ? tx.date.split('-').slice(1).join('/') : '';
      msg += `• ${datePart} | ${tx.category}: ${sign}${formatCurrency(tx.amount)}${tx.notes ? ` (${tx.notes})` : ''}\n`;
    });
  }

  const signSuffix = params.isBuyer
    ? '(Due to Dairy)'
    : params.payableBalance >= 0
    ? (params.isPastMonth ? '(Closed Payable)' : '(Payable by Dairy)')
    : (params.isPastMonth ? '(Closed Advance)' : '(Advance taken)');

  msg +=
    `--------------------------------\n` +
    `💵 *${balanceLabel}:*\n` +
    `*${formatCurrency(Math.abs(params.payableBalance))}* ${signSuffix}\n` +
    `--------------------------------\n` +
    `_Generated by Digital Dairy App_`;

  const encodedMsg = encodeURIComponent(msg);

  // If a valid phone number is available, open direct WhatsApp chat; otherwise open WhatsApp text picker
  const targetUrl = formattedPhone
    ? `whatsapp://send?phone=${formattedPhone}&text=${encodedMsg}`
    : `whatsapp://send?text=${encodedMsg}`;
  const webUrl = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodedMsg}`
    : `https://wa.me/?text=${encodedMsg}`;

  try {
    const { Linking } = require('react-native');
    const canOpen = await Linking.canOpenURL(targetUrl);
    if (canOpen) {
      await Linking.openURL(targetUrl);
      return { success: true };
    }
    const canOpenWeb = await Linking.canOpenURL(webUrl);
    if (canOpenWeb) {
      await Linking.openURL(webUrl);
      return { success: true };
    }
    await Sharing.shareAsync(`data:text/plain;utf8,${encodedMsg}`);
    return { success: true };
  } catch (err: any) {
    console.warn('WhatsApp money ledger share error:', err);
    try {
      await Sharing.shareAsync(`data:text/plain;utf8,${encodedMsg}`);
      return { success: true };
    } catch (fallbackErr: any) {
      return { success: false, error: fallbackErr?.message || 'Failed to send WhatsApp message.' };
    }
  }
}


