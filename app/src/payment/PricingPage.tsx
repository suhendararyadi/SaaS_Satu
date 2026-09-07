import { getPaymentConfigurationStatus, useQuery } from "wasp/client/operations";
import { Card, CardContent, CardTitle } from "../client/components/ui/card";

export function PricingPage() {
  const { data: status, isLoading } = useQuery(getPaymentConfigurationStatus);

  return (
    <main className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
      <h1 className="text-foreground text-3xl font-bold tracking-tight">Paket dan pembayaran</h1>
      <p className="text-muted-foreground mt-3 max-w-2xl">
        Informasi harga hanya ditampilkan setelah paket dan penyedia pembayaran dikonfigurasi oleh administrator platform.
      </p>
      <Card className="mt-8">
        <CardContent className="p-6">
          <CardTitle>
            {isLoading
              ? "Memeriksa konfigurasi pembayaran"
              : status?.enabled
                ? "Penyedia pembayaran sudah terhubung"
                : "Pembayaran online belum diaktifkan"}
          </CardTitle>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            {status?.enabled
              ? "Stripe telah dikonfigurasi. Katalog harga belum dipublikasikan pada halaman ini agar tidak menampilkan nominal yang belum ditetapkan."
              : "Tidak ada transaksi atau harga contoh yang ditampilkan. Hubungkan Stripe dan ID paket yang valid sebelum membuka pembelian untuk pengguna."}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
