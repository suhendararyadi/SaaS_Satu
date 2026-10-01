import { useState, type FormEvent, type HTMLInputTypeAttribute } from "react";
import { login } from "wasp/client/auth";
import { M3Button, M3TextField } from "../client/components/m3";

const NETWORK_ERROR = "Belum dapat masuk. Periksa koneksi internet lalu coba lagi.";

export type CredentialsLoginFormProps = {
  /** Nama formulir untuk pembaca layar. */
  ariaLabel: string;
  identifierLabel: string;
  identifierName: string;
  identifierType?: HTMLInputTypeAttribute;
  identifierInputMode?: "text" | "numeric" | "email";
  identifierMaxLength?: number;
  /** Menyaring isi kolom identitas saat diketik (misalnya hanya angka). */
  filterIdentifier?: (raw: string) => string;
  /** Mengubah isian menjadi email login. Mengembalikan pesan kesalahan bila isian tidak valid. */
  resolveEmail: (identifier: string) => { email: string } | { error: string };
  invalidCredentialsMessage: string;
};

/**
 * Formulir masuk dengan gaya School OS. Memakai alur login email Wasp yang sama untuk semua peran;
 * pengalihan setelah berhasil ditangani useRedirectIfLoggedIn pada LoginPage.
 */
export function CredentialsLoginForm({
  ariaLabel,
  identifierLabel,
  identifierName,
  identifierType = "text",
  identifierInputMode,
  identifierMaxLength,
  filterIdentifier,
  resolveEmail,
  invalidCredentialsMessage,
}: CredentialsLoginFormProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const resolved = resolveEmail(identifier);
    if ("error" in resolved) {
      setError(resolved.error);
      return;
    }
    if (!password) {
      setError("Kata sandi belum diisi.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login({ email: resolved.email, password });
    } catch (err) {
      const status = (err as { statusCode?: number } | null)?.statusCode;
      setError(status === 400 || status === 401 ? invalidCredentialsMessage : NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" aria-label={ariaLabel}>
      {error && (
        <p role="alert" className="rounded-[10px] bg-md-error-container px-3 py-2 text-[13px] leading-5 text-md-on-error-container">
          {error}
        </p>
      )}
      <M3TextField
        label={identifierLabel}
        name={identifierName}
        type={identifierType}
        value={identifier}
        onChange={(event) => setIdentifier(filterIdentifier ? filterIdentifier(event.target.value) : event.target.value)}
        inputMode={identifierInputMode}
        autoComplete="username"
        maxLength={identifierMaxLength}
        autoCapitalize="none"
        spellCheck={false}
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
