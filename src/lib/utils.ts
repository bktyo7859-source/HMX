import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency: "INR" | "USD" | "EUR" = "INR"
): string {
  if (currency === "INR") {
    if (amount >= 10000000) {
      const cr = amount / 10000000;
      return `₹${cr.toFixed(2).replace(/\.?0+$/, "")} Cr`;
    } else if (amount >= 100000) {
      const lakhs = amount / 100000;
      return `₹${lakhs.toFixed(2).replace(/\.?0+$/, "")} Lakhs`;
    } else {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(amount);
    }
  }

  if (currency === "USD") {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2).replace(/\.?0+$/, "")}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  }

  if (currency === "EUR") {
    if (amount >= 1000000) {
      return `€${(amount / 1000000).toFixed(2).replace(/\.?0+$/, "")}M`;
    }
    return `€${amount.toLocaleString()}`;
  }

  return `${amount.toLocaleString()}`;
}

export function formatCompactPrice(amount: number, currency: "INR" | "USD" | "EUR" = "INR"): string {
  if (currency === "INR") {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    return `₹${(amount / 1000).toFixed(0)}k`;
  }
  if (currency === "USD") {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`;
    return `$${(amount / 1000).toFixed(0)}k`;
  }
  if (currency === "EUR") {
    if (amount >= 1000000) return `€${(amount / 1000000).toFixed(2)}M`;
    return `€${(amount / 1000).toFixed(0)}k`;
  }
  return `${amount}`;
}

export const STATIC_USD_RATE = 83.5; // Fixed benchmark rate: 1 USD = 83.50 INR

export function convertCurrency(
  amountInInr: number,
  targetCurrency: "INR" | "USD"
): number {
  if (targetCurrency === "USD") {
    return Math.round(amountInInr / STATIC_USD_RATE);
  }
  return amountInInr;
}


export function downloadJsonFile(data: any, filename: string = "hmx_ml_analytics.json") {
  if (typeof window === "undefined") return;
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCsvFile(headers: string[], rows: (string | number)[][], filename: string = "hmx_ml_data.csv") {
  if (typeof window === "undefined") return;
  const csvContent = [
    headers.join(","),
    ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

