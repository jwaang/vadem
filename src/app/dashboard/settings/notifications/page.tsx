import type { Metadata } from "next";
import { NotificationsSettingsPageClient } from "./NotificationsSettingsPageClient";

export const metadata: Metadata = {
  title: "Notification Preferences | Vadem",
};

export default function NotificationsSettingsPage() {
  return <NotificationsSettingsPageClient />;
}
