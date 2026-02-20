"use client";

import dynamic from "next/dynamic";

const NotificationsSettings = dynamic(
  () => import("./NotificationsSettings"),
  { ssr: false },
);

export function NotificationsSettingsPageClient() {
  return <NotificationsSettings />;
}
