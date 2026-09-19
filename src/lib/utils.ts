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
