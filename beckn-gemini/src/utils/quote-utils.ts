import { IKeyValuePair } from "../constant";

export const createQuote = (quote: any, units: number) => {
  let resultQuote: IKeyValuePair = {};
  let total = 0;

  // If breakup array exists, calculate detailed charges
  if (quote.breakup && Array.isArray(quote.breakup)) {
    quote.breakup.forEach((elem: any) => {
      if (elem.title.includes("CGST") || elem.title.includes("SGST")) {
        total = total + parseInt(quote.price.value) * units * 0.05;
        resultQuote[elem.title] = `₹${
          parseInt(quote.price.value) * units * 0.05
        }`;
      }
      if (elem.title.includes("Convenience charges")) {
        total = total + 1;
        resultQuote[elem.title] = `₹1`;
      }
      if (elem.title.includes("Wheeling charges @")) {
        total = total + units * 0.5;
        resultQuote[elem.title] = `₹${units * 0.5}`;
      }
      if (elem.title.includes("P2P")) {
        total = total + parseInt(quote.price.value) * units;
        resultQuote[elem.title] = `₹${parseInt(quote.price.value) * units}`;
      }
    });
  } else {
    // If no breakup, just use the price value
    total = parseInt(quote.price.value) * units;
    resultQuote["P2P Trading charges"] = `₹${total}`;
  }

  resultQuote["total"] = total;
  return resultQuote;
};
