import { ArrowDown, ArrowUp, Eye } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "../../../client/components/ui/card";
import { cn } from "../../../client/utils";

type PageViewsStats = {
  totalPageViews: number | null | undefined;
  prevDayViewsChangePercent: string | null | undefined;
};

export function TotalPageViewsCard({
  totalPageViews,
  prevDayViewsChangePercent,
}: PageViewsStats) {
  const prevDayViewsChangePercentValue = parseInt(
    prevDayViewsChangePercent || "",
  );
  const isDeltaPositive = prevDayViewsChangePercentValue > 0;

  return (
    <Card>
      <CardHeader>
        <div className="bg-muted h-11.5 w-11.5 flex items-center justify-center rounded-full">
          <Eye className="size-6" />
        </div>
      </CardHeader>

      <CardContent className="flex justify-between">
        <div>
          <h4 className="text-title-md text-foreground font-bold">
            {totalPageViews == null ? "Belum tersedia" : totalPageViews}
          </h4>
          <span className="text-muted-foreground text-sm font-medium">
            Tayangan halaman
          </span>
        </div>

        <span
          className={cn("flex items-center gap-1 text-sm font-medium", {
            "text-success":
              isDeltaPositive &&
              prevDayViewsChangePercent &&
              prevDayViewsChangePercentValue !== 0,
            "text-destructive":
              !isDeltaPositive &&
              prevDayViewsChangePercent &&
              prevDayViewsChangePercentValue !== 0,
            "text-muted-foreground":
              !prevDayViewsChangePercent ||
              prevDayViewsChangePercentValue === 0,
          })}
        >
          {prevDayViewsChangePercent && prevDayViewsChangePercentValue !== 0
            ? `${prevDayViewsChangePercent}%`
            : "-"}
          {prevDayViewsChangePercent &&
            prevDayViewsChangePercentValue !== 0 &&
            (isDeltaPositive ? <ArrowUp /> : <ArrowDown />)}
        </span>
      </CardContent>
    </Card>
  );
}
