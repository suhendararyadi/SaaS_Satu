import { useState, type FormEvent } from "react";
import { login } from "wasp/client/auth";
import { M3Button, M3TextField } from "../client/components/m3";
import { studentLoginEmailFromNisn } from "../school/studentLoginPolicy";

const INVALID_CREDENTIALS = "NISN atau kata sandi tidak sesuai.";
const NETWORK_ERROR = "Belum dapat masuk. Periksa koneksi internet lalu coba lagi.";

/**
 * Masuk untuk siswa dengan NISN. Akun siswa memakai email internal `<NISN>@students.schoolos.invalid`;
 * formulir ini hanya menambahkan domain tersebut lalu memakai alur login email yang sama dengan LoginForm.
 */
export function StudentNisnLoginForm() {
  const [nisn, setNisn] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const email = studentLoginEmailFromNisn(nisn);
    if (!email) {
      setError("NISN terdiri dari 10 angka.");
      return;
    }
    if (!password) {
      setError("Kata sandi belum diisi.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login({ email, password });
      // Pengalihan ke /school ditangani useRedirectIfLoggedIn pada LoginPage.
    } catch (err) {
      const status = (err as { statusCode?: number } | null)?.statusCode;
      setError(status === 400 || status === 401 ? INVALID_CREDENTIALS : NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" aria-label="Masuk dengan NISN">
      {error && (
        <p role="alert" className="rounded-[10px] bg-md-error-container px-3 py-2 text-[13px] leading-5 text-md-on-error-container">
          {error}
        </p>
      )}
      <M3TextField
        label="NISN"
        name="nisn"
        value={nisn}
        onChange={(event) => setNisn(event.target.value.replace(/\D/g, "").slice(0, 10))}
        inputMode="numeric"
        autoComplete="username"
        maxLength={10}
        required
      />
      <M3TextField
        label="Kata sandi"
        name="password"
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        required
      />
      <div className="-mt-2 flex justify-end">
        <M3Button type="button" variant="text" size="sm" aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>
          {showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
        </M3Button>
      </div>
      <M3Button type="submit" fullWidth isLoading={busy} disabled={busy}>
        Masuk
      </M3Button>
    </form>
  );
}
