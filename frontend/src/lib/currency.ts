"use client";

export type CurrencyCode = "DZD";

export function convertPriceFromEuro(
  amountInEuro: number,
  currency: CurrencyCode,
) {
  if (currency !== "DZD") {
    return amountInEuro;
  }
  return amountInEuro;
}

export function formatPriceFromEuro(
  amountInEuro: number,
  currency: CurrencyCode,
) {
  const amount = convertPriceFromEuro(amountInEuro, currency);

  return new Intl.NumberFormat("fr-DZ", {
    style: "currency",
    currency: "DZD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getStoredCurrency(): CurrencyCode {
  return "DZD";
}

export function setStoredCurrency(currency: CurrencyCode) {
  return currency;
}

export function useCurrency() {
  return {
    currency: "DZD" as CurrencyCode,
    setCurrency: (next: CurrencyCode) => {
      void next;
    },
  };
}
