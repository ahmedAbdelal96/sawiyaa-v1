export function compactPhoneInput(value: string) {
  return value.replace(/[^0-9+]/g, "").replace(/(?!^)\+/g, "");
}

export function previewPhoneE164(phone: string, phoneCode: string | null | undefined) {
  const value = compactPhoneInput(phone.trim());
  const code = (phoneCode ?? "").replace(/\D/g, "");
  if (!value || !code) return null;
  if (value.startsWith("+")) return value;
  const digits = value.startsWith("00") ? value.slice(2) : value;
  const national = digits.startsWith("0") ? digits.slice(1) : digits;
  return national ? `+${code}${national}` : null;
}
