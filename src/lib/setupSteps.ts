export const SETUP_STEPS = [
  { label: "Home", slug: "home" },
  { label: "Pets", slug: "pets" },
  { label: "Access", slug: "access" },
  { label: "Contacts", slug: "contacts" },
  { label: "Instructions", slug: "instructions" },
  { label: "Review", slug: "review" },
] as const;

export type SetupSlug = (typeof SETUP_STEPS)[number]["slug"];
