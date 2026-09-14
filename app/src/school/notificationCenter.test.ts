import { describe, expect, it } from "vitest";
import {
  isNotificationUnread,
  notificationKey,
  sortNotifications,
  type NotificationSourceItem,
} from "./notificationCenter";

describe("notification center helpers", () => {
  it("marks a notification unread when no read state exists", () => {
    expect(isNotificationUnread("2026-09-14T10:00:00Z", null)).toBe(true);
  });

  it("marks a notification read when readAt is newer than the source", () => {
    expect(
      isNotificationUnread("2026-09-14T10:00:00Z", "2026-09-14T10:05:00Z"),
    ).toBe(false);
  });

  it("re-opens a notification when the source changes after it was read", () => {
    expect(
      isNotificationUnread("2026-09-14T10:10:00Z", "2026-09-14T10:05:00Z"),
    ).toBe(true);
  });

  it("sorts critical items ahead of newer informational items", () => {
    const items: NotificationSourceItem[] = [
      {
        key: "a",
        category: "FOLLOW_UP",
        severity: "INFO",
        title: "Info",
        message: "Info",
        href: "/school",
        updatedAt: new Date("2026-09-14T12:00:00Z"),
      },
      {
        key: "b",
        category: "SARPRAS",
        severity: "CRITICAL",
        title: "Critical",
        message: "Critical",
        href: "/school",
        updatedAt: new Date("2026-09-14T11:00:00Z"),
      },
    ];
    expect(sortNotifications(items)[0].key).toBe("b");
  });

  it("builds stable source keys", () => {
    expect(notificationKey("ATTENDANCE", "class-1", "2026-09-14")).toBe(
      "ATTENDANCE:class-1:2026-09-14",
    );
  });
});
