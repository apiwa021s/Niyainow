/** Tag labels are stored as names; the hash is presentation, not content. */
export function displayTagName(value: string) {
  return value.replace(/^#+\s*/u, "").trim();
}
