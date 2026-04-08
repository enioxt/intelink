export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^55/, '');
}

export function formatPhone(phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
}

export const formatPhoneDisplay = formatPhone;

export function formatPhoneWhatsApp(phone: string): string {
  const digits = normalizePhone(phone);
  return `55${digits}`;
}

export function getWhatsAppLink(phone: string, message = ''): string {
  const wa = formatPhoneWhatsApp(phone);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${wa}${encoded ? `?text=${encoded}` : ''}`;
}

export function isValidPhone(phone: string): boolean {
  const digits = normalizePhone(phone);
  return digits.length >= 10 && digits.length <= 11;
}
