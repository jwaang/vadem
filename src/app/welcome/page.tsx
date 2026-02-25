import type { Metadata } from "next";
import { WelcomeClient } from "./WelcomeClient";

export const metadata: Metadata = {
  title: "Welcome to Vadem",
  description: "Learn how Vadem helps you create a care manual for your house sitter.",
};

export default function WelcomePage() {
  return <WelcomeClient />;
}
