import { type DailyStats } from "wasp/entities";
import { type CalculateDailyStatsJob } from "wasp/server/jobs";
import {
  getDailyPageViews,
  getSources,
} from "./providers/plausibleAnalyticsUtils";
// import { getDailyPageViews, getSources } from './providers/googleAnalyticsUtils';
import { paymentProcessor } from "../payment/paymentProcessor";
import { SubscriptionStatus } from "../payment/plans";
import { isPaymentsConfigured } from "../payment/config";
import { isPlausibleConfigured } from "./config";

export type DailyStatsProps = {
  dailyStats?: DailyStats;
  weeklyStats?: DailyStats[];
  isLoading?: boolean;
};

export const calculateDailyStatsJob: CalculateDailyStatsJob<
  never,
  void
> = async (_args, context) => {
  const nowUTC = new Date(Date.now());
  nowUTC.setUTCHours(0, 0, 0, 0);

  const yesterdayUTC = new Date(nowUTC);
  yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);

  try {
    const yesterdaysStats = await context.entities.DailyStats.findFirst({
      where: {
        date: {
          equals: yesterdayUTC,
        },
      },
    });

    const userCount = await context.entities.User.count({});
    // users can have paid but canceled subscriptions which terminate at the end of the period
    // we don't want to count those users as current paying users
    const paidUserCount = await context.entities.User.count({
      where: {
        subscriptionStatus: SubscriptionStatus.Active,
      },
    });

    let userDelta = userCount;
    let paidUserDelta = paidUserCount;
    if (yesterdaysStats) {
      userDelta -= yesterdaysStats.userCount;
      paidUserDelta -= yesterdaysStats.paidUserCount;
    }

    let totalRevenue: number | null = null;
    try {
      if (isPaymentsConfigured()) totalRevenue = await paymentProcessor.fetchTotalRevenue();
    } catch (e) {
      console.warn(
        "Could not fetch total revenue from payment processor; metric remains unavailable:",
        e instanceof Error ? e.message : e,
      );
    }

    let totalViews: number | null = null;
    let prevDayViewsChangePercent: string | null = null;
    try {
      if (isPlausibleConfigured()) {
        const pageViewsResult = await getDailyPageViews();
        totalViews = pageViewsResult.totalViews;
        prevDayViewsChangePercent = pageViewsResult.prevDayViewsChangePercent;
      }
    } catch (e) {
      console.warn(
        "Could not fetch page views from analytics provider; metric remains unavailable:",
        e instanceof Error ? e.message : e,
      );
    }

    let dailyStats = await context.entities.DailyStats.findUnique({
      where: {
        date: nowUTC,
      },
    });

    if (!dailyStats) {
      console.log("No daily stat found for today, creating one...");
      dailyStats = await context.entities.DailyStats.create({
        data: {
          date: nowUTC,
          totalViews,
          prevDayViewsChangePercent,
          userCount,
          paidUserCount,
          userDelta,
          paidUserDelta,
          totalRevenue,
        },
      });
    } else {
      console.log("Daily stat found for today, updating it...");
      dailyStats = await context.entities.DailyStats.update({
        where: {
          id: dailyStats.id,
        },
        data: {
          totalViews,
          prevDayViewsChangePercent,
          userCount,
          paidUserCount,
          userDelta,
          paidUserDelta,
          totalRevenue,
        },
      });
    }
    let sources: { source: string; visitors: number | string }[] = [];
    try {
      if (isPlausibleConfigured()) sources = await getSources();
    } catch (e) {
      console.warn(
        "Could not fetch sources from analytics provider (using empty):",
        e instanceof Error ? e.message : e,
      );
    }

    for (const source of sources) {
      const visitors: number =
        typeof source.visitors === "number"
          ? source.visitors
          : parseInt(source.visitors as string) || 0;
      await context.entities.PageViewSource.upsert({
        where: {
          date_name: {
            date: nowUTC,
            name: source.source,
          },
        },
        create: {
          date: nowUTC,
          name: source.source,
          visitors,
          dailyStatsId: dailyStats.id,
        },
        update: {
          visitors,
        },
      });
    }

    console.table({ dailyStats });
  } catch (error) {
    console.error("Error calculating daily stats: ", error);
    await context.entities.Logs.create({
      data: {
        message: `Error calculating daily stats: ${error instanceof Error ? error.message : String(error)}`,
        level: "job-error",
      },
    });
  }
};
