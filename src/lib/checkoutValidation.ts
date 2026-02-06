/**
 * Pure checkout form validation logic.
 * Extracted from CheckoutDialog.tsx to enable unit testing.
 */

export interface CheckoutFormData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingStreet: string;
  shippingApartment: string;
  shippingCity: string;
  shippingPostalCode: string;
  notes: string;
}

export function validateCheckoutForm(
  formData: CheckoutFormData,
  turnstileToken: string | null,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!formData.customerName.trim()) {
    errors.customerName = "Ime je obavezno";
  }

  if (!formData.customerEmail.trim() && !formData.customerPhone.trim()) {
    errors.customerEmail = "Unesite email ili telefon";
    errors.customerPhone = "Unesite email ili telefon";
  }

  if (
    formData.customerEmail.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)
  ) {
    errors.customerEmail = "Neispravan email format";
  }

  if (!formData.shippingStreet.trim()) {
    errors.shippingStreet = "Ulica je obavezna";
  }

  if (!formData.shippingCity.trim()) {
    errors.shippingCity = "Grad je obavezan";
  }

  if (!formData.shippingPostalCode.trim()) {
    errors.shippingPostalCode = "Poštanski broj je obavezan";
  }

  if (!turnstileToken) {
    errors.turnstile = "Molimo sačekajte verifikaciju";
  }

  return errors;
}
