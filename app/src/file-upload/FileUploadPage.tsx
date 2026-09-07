import { FormEvent, useEffect, useState } from "react";
import {
  addFileToDb,
  createFileUploadUrl,
  deleteFile,
  getAllFilesByUser,
  getDownloadFileSignedURL,
  getFileUploadConfigurationStatus,
  useQuery,
} from "wasp/client/operations";
import type { File } from "wasp/entities";
import { Alert, AlertDescription } from "../client/components/ui/alert";
import { Button } from "../client/components/ui/button";
import { Card, CardContent, CardTitle } from "../client/components/ui/card";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";
import { Progress } from "../client/components/ui/progress";
import { toast } from "../client/hooks/use-toast";
import { uploadFileWithProgress, validateFile } from "./fileUploading";
import { ALLOWED_FILE_TYPES } from "./validation";

export function FileUploadPage() {
  const [fileKeyForS3, setFileKeyForS3] = useState("");
  const [uploadProgressPercent, setUploadProgressPercent] = useState(0);
  const { data: config } = useQuery(getFileUploadConfigurationStatus);
  const allUserFiles = useQuery(getAllFilesByUser);
  const { refetch: refetchDownloadUrl } = useQuery(
    getDownloadFileSignedURL,
    { s3Key: fileKeyForS3 },
    { enabled: false },
  );

  useEffect(() => {
    if (!fileKeyForS3) return;
    refetchDownloadUrl()
      .then((result) => {
        if (result.status === "success" && result.data) window.open(result.data, "_blank");
        if (result.status === "error") throw result.error;
      })
      .catch((error) => {
        toast({
          title: "Tautan unduhan tidak tersedia",
          description: error instanceof Error ? error.message : "Coba lagi nanti.",
          variant: "destructive",
        });
      })
      .finally(() => setFileKeyForS3(""));
  }, [fileKeyForS3, refetchDownloadUrl]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!config?.enabled) return;
    const form = event.currentTarget;
    const selected = new FormData(form).get("file-upload");
    if (!(selected instanceof File) || selected.size === 0) {
      toast({ title: "Pilih berkas terlebih dahulu", variant: "destructive" });
      return;
    }

    try {
      const file = validateFile(selected);
      const { s3UploadUrl, s3UploadFields, s3Key } = await createFileUploadUrl({
        fileType: file.type,
        fileName: file.name,
      });
      await uploadFileWithProgress({
        file,
        s3UploadUrl,
        s3UploadFields,
        setUploadProgressPercent,
      });
      await addFileToDb({ s3Key, fileType: file.type, fileName: file.name });
      form.reset();
      await allUserFiles.refetch();
      toast({ title: "Berkas berhasil diunggah" });
    } catch (error) {
      toast({
        title: "Unggah berkas gagal",
        description: error instanceof Error ? error.message : "Coba lagi nanti.",
        variant: "destructive",
      });
    } finally {
      setUploadProgressPercent(0);
    }
  }

  async function handleDelete(file: Pick<File, "id" | "name">) {
    try {
      await deleteFile({ id: file.id });
      await allUserFiles.refetch();
      toast({ title: "Berkas dihapus", description: file.name });
    } catch (error) {
      toast({
        title: "Berkas tidak dapat dihapus",
        description: error instanceof Error ? error.message : "Coba lagi nanti.",
        variant: "destructive",
      });
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 lg:px-8">
      <h1 className="text-foreground text-3xl font-bold">Penyimpanan berkas</h1>
      <p className="text-muted-foreground mt-2">
        Berkas disimpan melalui penyimpanan objek privat dan hanya dapat diunduh oleh pemilik akun.
      </p>

      {!config?.enabled && (
        <Alert className="mt-6">
          <AlertDescription>
            Penyimpanan berkas belum dikonfigurasi. Fitur unggah dan unduh dinonaktifkan sampai kredensial bucket tersedia.
          </AlertDescription>
        </Alert>
      )}

      <Card className="mt-6">
        <CardContent className="space-y-6 p-6">
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload">Pilih berkas</Label>
              <Input
                id="file-upload"
                name="file-upload"
                type="file"
                accept={ALLOWED_FILE_TYPES.join(",")}
                disabled={!config?.enabled}
              />
            </div>
            <Button type="submit" disabled={!config?.enabled || uploadProgressPercent > 0}>
              {uploadProgressPercent > 0 ? `Mengunggah ${uploadProgressPercent}%` : "Unggah"}
            </Button>
            {uploadProgressPercent > 0 && <Progress value={uploadProgressPercent} />}
          </form>

          <div className="border-border border-t pt-6">
            <CardTitle>Berkas akun</CardTitle>
            {allUserFiles.isLoading && <p className="text-muted-foreground mt-3">Memuat data...</p>}
            {allUserFiles.data?.length === 0 && (
              <p className="text-muted-foreground mt-3">Belum ada berkas tersimpan.</p>
            )}
            <div className="mt-4 space-y-3">
              {allUserFiles.data?.map((file: File) => (
                <div key={file.id} className="border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-muted-foreground text-xs">{file.type}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setFileKeyForS3(file.s3Key)} disabled={!config?.enabled}>
                      Unduh
                    </Button>
                    <Button variant="destructive" onClick={() => handleDelete(file)}>
                      Hapus
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
