import { CredentialsLoginForm } from "./CredentialsLoginForm";
import { studentLoginEmailFromNisn } from "../school/studentLoginPolicy";

/**
 * Masuk untuk siswa dengan NISN. Akun siswa memakai email internal `<NISN>@students.schoolos.invalid`;
 * formulir ini hanya menambahkan domain tersebut.
 */
export function StudentNisnLoginForm() {
  return (
    <CredentialsLoginForm
      ariaLabel="Masuk dengan NISN"
      identifierLabel="NISN"
      identifierName="nisn"
      identifierInputMode="numeric"
      identifierMaxLength={10}
      filterIdentifier={(raw) => raw.replace(/\D/g, "").slice(0, 10)}
      resolveEmail={(value) => {
        const email = studentLoginEmailFromNisn(value);
        return email ? { email } : { error: "NISN terdiri dari 10 angka." };
      }}
      invalidCredentialsMessage="NISN atau kata sandi tidak sesuai."
    />
  );
}
