import { CredentialsLoginForm } from "./CredentialsLoginForm";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Masuk untuk admin, guru, dan peran lain yang memakai email. */
export function EmailLoginForm() {
  return (
    <CredentialsLoginForm
      ariaLabel="Masuk dengan email"
      identifierLabel="Email"
      identifierName="email"
      identifierType="email"
      identifierInputMode="email"
      resolveEmail={(value) => {
        const email = value.trim();
        if (/^\d{10}$/.test(email)) return { error: "Siswa masuk lewat tab NISN (siswa)." };
        return EMAIL_PATTERN.test(email) ? { email } : { error: "Masukkan alamat email yang valid." };
      }}
      invalidCredentialsMessage="Email atau kata sandi tidak sesuai."
    />
  );
}
