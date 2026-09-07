import { type PageViewSource } from "wasp/entities";

export function SourcesTable({
  sources,
}: {
  sources: PageViewSource[] | undefined;
}) {
  return (
    <div className="border-border bg-card shadow-default sm:px-7.5 rounded-sm border px-5 pb-2.5 pt-6 xl:pb-1">
      <h4 className="text-foreground mb-6 text-xl font-semibold">
        Sumber kunjungan
      </h4>

      <div className="flex flex-col">
        <div className="bg-gray-2 grid grid-cols-2 rounded-sm">
          <div className="p-2.5 xl:p-5">
            <h5 className="xsm:text-base text-sm font-medium uppercase">
              Sumber
            </h5>
          </div>
          <div className="p-2.5 text-center xl:p-5">
            <h5 className="xsm:text-base text-sm font-medium uppercase">
              Pengunjung
            </h5>
          </div>
        </div>

        {sources && sources.length > 0 ? (
          sources.map((source) => (
            <div
              key={source.name}
              className="border-border grid grid-cols-2 border-b"
            >
              <div className="flex items-center gap-3 p-2.5 xl:p-5">
                <p className="text-foreground">{source.name}</p>
              </div>

              <div className="flex items-center justify-center p-2.5 xl:p-5">
                <p className="text-foreground">{source.visitors}</p>
              </div>

            </div>
          ))
        ) : (
          <div className="flex items-center justify-center p-2.5 xl:p-5">
            <p className="text-foreground">Data sumber kunjungan belum tersedia</p>
          </div>
        )}
      </div>
    </div>
  );
}
