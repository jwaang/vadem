import type { Metadata } from "next";
import { NotificationsSettingsPageClient } from "./NotificationsSettingsPageClient";

export const metadata: Metadata = {
  title: "Notification Preferences | Handoff",
};

export default function NotificationsSettingsPage() {
  return <NotificationsSettingsPageClient />;
}
