import { describe, it, expect } from "vitest";
import {
  validateCheckoutForm,
  type CheckoutFormData,
} from "../checkoutValidation";

const validForm: CheckoutFormData = {
  customerName: "Marko Petrovic",
  customerEmail: "marko@example.com",
  customerPhone: "+381601234567",
  shippingStreet: "Knez Mihailova 12",
  shippingApartment: "3/5",
  shippingCity: "Beograd",
  shippingPostalCode: "11000",
  notes: "",
};

describe("validateCheckoutForm", () => {
  it("all fields valid + token → no errors", () => {
    const errors = validateCheckoutForm(validForm, "valid-token");
    expect(Object.keys(errors).length).toBe(0);
  });

  it("empty name → customerName error", () => {
    const errors = validateCheckoutForm(
      { ...validForm, customerName: "" },
      "valid-token",
    );
    expect(errors.customerName).toBe("Ime je obavezno");
  });

  it("whitespace-only name → customerName error", () => {
    const errors = validateCheckoutForm(
      { ...validForm, customerName: "   " },
      "valid-token",
    );
    expect(errors.customerName).toBe("Ime je obavezno");
  });

  it("both email and phone empty → both get error", () => {
    const errors = validateCheckoutForm(
      { ...validForm, customerEmail: "", customerPhone: "" },
      "valid-token",
    );
    expect(errors.customerEmail).toBe("Unesite email ili telefon");
    expect(errors.customerPhone).toBe("Unesite email ili telefon");
  });

  it("email only (no phone) → valid", () => {
    const errors = validateCheckoutForm(
      { ...validForm, customerPhone: "" },
      "valid-token",
    );
    expect(errors.customerEmail).toBeUndefined();
    expect(errors.customerPhone).toBeUndefined();
  });

  it("phone only (no email) → valid", () => {
    const errors = validateCheckoutForm(
      { ...validForm, customerEmail: "" },
      "valid-token",
    );
    expect(errors.customerEmail).toBeUndefined();
    expect(errors.customerPhone).toBeUndefined();
  });

  it("invalid email format → customerEmail error", () => {
    const errors = validateCheckoutForm(
      { ...validForm, customerEmail: "not-an-email" },
      "valid-token",
    );
    expect(errors.customerEmail).toBe("Neispravan email format");
  });

  it("valid email with phone still validates email format", () => {
    const errors = validateCheckoutForm(
      { ...validForm, customerEmail: "bad@@email" },
      "valid-token",
    );
    expect(errors.customerEmail).toBe("Neispravan email format");
  });

  it("missing street → shippingStreet error", () => {
    const errors = validateCheckoutForm(
      { ...validForm, shippingStreet: "" },
      "valid-token",
    );
    expect(errors.shippingStreet).toBe("Ulica je obavezna");
  });

  it("missing city → shippingCity error", () => {
    const errors = validateCheckoutForm(
      { ...validForm, shippingCity: "" },
      "valid-token",
    );
    expect(errors.shippingCity).toBe("Grad je obavezan");
  });

  it("missing postal code → shippingPostalCode error", () => {
    const errors = validateCheckoutForm(
      { ...validForm, shippingPostalCode: "" },
      "valid-token",
    );
    expect(errors.shippingPostalCode).toBe("Poštanski broj je obavezan");
  });

  it("missing turnstile token → turnstile error", () => {
    const errors = validateCheckoutForm(validForm, null);
    expect(errors.turnstile).toBe("Molimo sačekajte verifikaciju");
  });

  it("multiple errors at once → all present", () => {
    const errors = validateCheckoutForm(
      {
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        shippingStreet: "",
        shippingApartment: "",
        shippingCity: "",
        shippingPostalCode: "",
        notes: "",
      },
      null,
    );
    expect(errors.customerName).toBeDefined();
    expect(errors.customerEmail).toBeDefined();
    expect(errors.customerPhone).toBeDefined();
    expect(errors.shippingStreet).toBeDefined();
    expect(errors.shippingCity).toBeDefined();
    expect(errors.shippingPostalCode).toBeDefined();
    expect(errors.turnstile).toBeDefined();
    expect(Object.keys(errors).length).toBe(7);
  });
});
