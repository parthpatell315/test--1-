/**
 * Normalizes phone numbers to E.164 standard format.
 */
export function formatE164Phone(
  phone: string,
  defaultCountryCode: string = "91",
): string {
  // Normalize by removing spaces, dashes, parentheses and plus signs
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, "");

  // Strip leading zeros
  cleaned = cleaned.replace(/^0+/, "");

  if (cleaned.length === 10) {
    // Treat as 10-digit national number, prepend default country code
    return `+${defaultCountryCode}${cleaned}`;
  }

  if (cleaned.length > 10) {
    // If it looks like it already contains a country code
    return `+${cleaned}`;
  }

  throw new Error("Invalid phone number format");
}
