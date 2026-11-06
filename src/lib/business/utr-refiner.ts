import { extractIdentifier } from "../parsers/utr-extractor";

export function refineUTR(description: string, currentUtr: string): string {
  if (currentUtr && currentUtr.length >= 6 && !/^0+$/.test(currentUtr)) {
    return currentUtr;
  }
  return extractIdentifier(description, currentUtr);
}
