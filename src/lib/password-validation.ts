export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePassword(password: string): PasswordValidationResult {
  if (password.length < 8) {
    return { valid: false, error: "Lozinka mora imati minimum 8 karaktera" };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Lozinka mora sadržati malo slovo" };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Lozinka mora sadržati veliko slovo" };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Lozinka mora sadržati broj" };
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    return {
      valid: false,
      error: "Lozinka mora sadržati specijalni karakter (!@#$%^&*)",
    };
  }

  return { valid: true };
}
