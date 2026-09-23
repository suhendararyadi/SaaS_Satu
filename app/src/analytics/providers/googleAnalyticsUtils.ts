import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { env } from "wasp/server";
import { isGoogleAnalyticsServerConfigured } from "../config";

function getAnalyticsClient() {
  if (
    !isGoogleAnalyticsServerConfigured() ||
    !env.GOOGLE_ANALYTICS_PRIVATE_KEY ||
    !env.GOOGLE_ANALYTICS_CLIENT_EMAIL ||
    !env.GOOGLE_ANALYTICS_PROPERTY_ID
  ) {
    throw new Error("Google Analytics belum dikonfigurasi");
  }
  return {
    client: new BetaAnalyticsDataClient({
      credentials: {
        client_email: env.GOOGLE_ANALYTICS_CLIENT_EMAIL,
        private_key: Buffer.from(env.GOOGLE_ANALYTICS_PRIVATE_KEY, "base64").toString("utf-8"),
      },
    }),
    propertyId: env.GOOGLE_ANALYTICS_PROPERTY_ID,
  };
}

export async function getSources() {
  const { client, propertyId } = getAnalyticsClient();
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      {
        startDate: "2020-01-01",
        endDate: "today",
      },
    ],
    // for a list of dimensions and metrics see https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema
    dimensions: [
      {
        name: "source",
      },
    ],
    metrics: [
      {
        name: "activeUsers",
      },
    ],
  });

  if (!response?.rows) {
    throw new Error("No response from Google Analytics");
  }

  const activeUsersPerReferrer = response.rows
    .map((row) => {
      const source = row.dimensionValues?.[0]?.value;
      const visitors = row.metricValues?.[0]?.value;
      if (source && visitors) {
        return { source, visitors };
      }
    })
    .filter(Boolean);

  return activeUsersPerReferrer;
}

export async function getDailyPageViews() {
  const totalViews = await getTotalPageViews();
  const prevDayViewsChangePercent = await getPrevDayViewsChangePercent();

  return {
    totalViews,
    prevDayViewsChangePercent,
  };
}

async function getTotalPageViews() {
  const { client, propertyId } = getAnalyticsClient();
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      {
        startDate: "2020-01-01", // go back to earliest date of your app
        endDate: "today",
      },
    ],
    metrics: [
      {
        name: "screenPageViews",
      },
    ],
  });
  const totalViewsStr = response.rows?.[0]?.metricValues?.[0]?.value;
  if (!totalViewsStr) {
    throw new Error("No response from Google Analytics");
  }
  const totalViews = parseInt(totalViewsStr);
  return totalViews;
}

async function getPrevDayViewsChangePercent() {
  const { client, propertyId } = getAnalyticsClient();
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,

    dateRanges: [
      {
        startDate: "2daysAgo",
        endDate: "yesterday",
      },
    ],
    orderBys: [
      {
        dimension: {
          dimensionName: "date",
        },
        desc: true,
      },
    ],
    dimensions: [
      {
        name: "date",
      },
    ],
    metrics: [
      {
        name: "screenPageViews",
      },
    ],
  });

  const viewsFromYesterdayStr = response.rows?.[0]?.metricValues?.[0]?.value;
  const viewsFromDayBeforeYesterdayStr =
    response.rows?.[1]?.metricValues?.[0]?.value;

  if (!viewsFromYesterdayStr || !viewsFromDayBeforeYesterdayStr) {
    return "0";
  }

  const viewsFromYesterday = parseInt(viewsFromYesterdayStr);
  const viewsFromDayBeforeYesterday = parseInt(viewsFromDayBeforeYesterdayStr);
  if (viewsFromYesterday === 0 || viewsFromDayBeforeYesterday === 0) {
    return "0";
  }
  console.table({ viewsFromYesterday, viewsFromDayBeforeYesterday });

  const change =
    ((viewsFromYesterday - viewsFromDayBeforeYesterday) /
      viewsFromDayBeforeYesterday) *
    100;

  return change.toFixed(0);
}
