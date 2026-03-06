import type { Metadata } from "next";
import { CheckEmailClient } from "./CheckEmailClient";

export const metadata: Metadata = {
  title: "Check your email - Vadem",
};

export default function CheckEmailPage() {
  return <CheckEmailClient />;
}
