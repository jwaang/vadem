import { notFound } from "next/navigation";
import { TodayViewHeader } from "@/components/ui/TodayViewHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  EmergencyContactBar,
  type EmergencyContact,
} from "@/components/ui/EmergencyContactBar";
import { Input } from "@/components/ui/Input";
import { LocationCard } from "@/components/ui/LocationCard";
import {
  PetProfileCard,
  type PetDetail,
} from "@/components/ui/PetProfileCard";
import { Textarea } from "@/components/ui/Textarea";
import { SearchBar } from "@/components/ui/SearchBar";
import { TaskItem } from "@/components/ui/TaskItem";
import { VaultItem, LockIcon } from "@/components/ui/VaultItem";
import { SectionNav } from "@/components/ui/SectionNav";
import { WizardProgress } from "@/components/ui/WizardProgress";
import { NotificationToast } from "@/components/ui/NotificationToast";
import { BottomNav } from "@/components/ui/BottomNav";
import { TimeSlotDivider } from "@/components/ui/TimeSlotDivider";
import { ActivityFeedItem } from "@/components/ui/ActivityFeedItem";
import { CreatorLayout } from "@/components/layouts/CreatorLayout";
import { SitterLayout } from "@/components/layouts/SitterLayout";

function PlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="8" y1="3" x2="8" y2="13" />
      <line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  );
}

const samplePetDetails: PetDetail[] = [
  { emoji: "🍗", label: "Feeding", value: "2× daily, 1 cup kibble" },
  { emoji: "💊", label: "Medications", value: "Apoquel, 1 tab AM" },
  { emoji: "🦮", label: "Walking", value: "30 min, morning & evening" },
  {
    emoji: "🏥",
    label: "Vet",
    value: "Dr. Rivera · (555) 987-6543",
    phone: "+15559876543",
  },
];

const sampleContacts: EmergencyContact[] = [
  { name: "Sarah M.", role: "owner", phone: "+15551234567" },
  { name: "Dr. Rivera", role: "vet", phone: "+15559876543" },
  { name: "Tom K.", role: "neighbor", phone: "+15554567890" },
  { name: "Animal Control", role: "emergency", phone: "+15550001111" },
  { name: "Pet Poison Help", role: "emergency", phone: "+18882324435" },
];

export default function DesignSystemPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <div className="max-w-[1232px] mx-auto py-8 px-4 pb-[calc(var(--spacing-8)+80px)]">
      <h1 className="font-display text-5xl leading-tight tracking-tight text-text-primary mb-2">
        Vadem
      </h1>
      <p className="font-body text-lg leading-normal text-text-secondary mb-8">
        Component showcase
      </p>

      {/* ── OG Image Preview (1200×630) ── */}
      <section className="mb-12">
        <h2 className="font-display text-2xl mb-2">OG Image Preview</h2>
        <p className="text-sm text-text-muted mb-4">
          1200&times;630px — screenshot this for og-image.png
        </p>
        <div className="overflow-auto border border-border-default rounded-lg">
          <div
            style={{
              width: 1200,
              height: 630,
              background: "linear-gradient(145deg, #3D2418 0%, #8B4A2B 35%, #C2704A 65%, #D4943A 100%)",
            }}
            className="relative overflow-hidden shrink-0"
          >
            {/* Large soft glow — top center */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: -120,
                left: "50%",
                transform: "translateX(-50%)",
                width: 800,
                height: 500,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 65%)",
              }}
            />

            {/* Warm bloom — bottom-left */}
            <div
              className="absolute pointer-events-none"
              style={{
                bottom: -100,
                left: -80,
                width: 500,
                height: 400,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(212,148,58,0.15) 0%, transparent 60%)",
              }}
            />

            {/* Cool accent — top-right corner */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: -60,
                right: -60,
                width: 350,
                height: 350,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(94,139,106,0.12) 0%, transparent 60%)",
              }}
            />

            {/* Subtle grain overlay — very light */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`,
              }}
            />

            {/* Geometric accent — thin diagonal line */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: 0,
                right: 200,
                width: 1,
                height: "140%",
                background: "rgba(255,255,255,0.04)",
                transform: "rotate(25deg)",
                transformOrigin: "top center",
              }}
            />

            {/* Second diagonal */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: 0,
                right: 220,
                width: 1,
                height: "140%",
                background: "rgba(255,255,255,0.03)",
                transform: "rotate(25deg)",
                transformOrigin: "top center",
              }}
            />

            {/* Main content — centered */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-20">
              {/* Wordmark */}
              <span
                className="font-display leading-none tracking-tight text-white"
                style={{ fontSize: 104 }}
              >
                Vadem
              </span>

              {/* Divider rule */}
              <div
                className="rounded-full mt-6 mb-6"
                style={{
                  width: 56,
                  height: 2,
                  background: "rgba(255,255,255,0.35)",
                }}
              />

              {/* Subtext */}
              <span
                className="font-body text-center leading-snug"
                style={{ fontSize: 30, color: "rgba(255,255,255,0.85)" }}
              >
                Pet &amp; House Sitter Care Manuals
              </span>

              {/* Tagline */}
              <span
                className="font-body text-center mt-3"
                style={{ fontSize: 18, color: "rgba(255,255,255,0.50)" }}
              >
                One link with everything your sitter needs
              </span>
            </div>

            {/* Bottom bar — domain + badge */}
            <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-14 py-5">
              <span
                className="font-body tracking-wide"
                style={{ fontSize: 15, color: "rgba(255,255,255,0.35)" }}
              >
                vadem.app
              </span>
              <span
                className="font-body text-xs font-semibold px-3 py-1 rounded-pill"
                style={{
                  color: "rgba(255,255,255,0.75)",
                  background: "rgba(255,255,255,0.10)",
                  backdropFilter: "blur(4px)",
                }}
              >
                Free during early access
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── App Icon (1024×1024) ── */}
      <section className="mb-12">
        <h2 className="font-display text-2xl mb-2">App Icon</h2>
        <p className="text-sm text-text-muted mb-4">
          1024&times;1024px — screenshot and crop for app icon
        </p>
        <div className="overflow-auto border border-border-default rounded-lg inline-block">
          <div
            style={{
              width: 1024,
              height: 1024,
              background: "linear-gradient(145deg, #3D2418 0%, #8B4A2B 35%, #C2704A 65%, #D4943A 100%)",
            }}
            className="relative overflow-hidden shrink-0 flex items-center justify-center"
          >
            {/* Soft glow */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: -100,
                left: "50%",
                transform: "translateX(-50%)",
                width: 700,
                height: 700,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 65%)",
              }}
            />
            {/* Grain */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`,
              }}
            />
            <span
              className="font-display text-white relative"
              style={{ fontSize: 480, lineHeight: 1 }}
            >
              V
            </span>
          </div>
        </div>
      </section>

      {/* ── Layout Shells ── */}
      <section className="mb-8">
        <h2 className="font-display text-2xl mb-4">Layout Shells</h2>
        <p className="text-sm text-text-muted mb-4">
          Responsive layout containers. Creator: sidebar nav (desktop) + bottom
          nav (mobile). Sitter: full-width mobile-first + bottom nav. Resize
          browser to see breakpoint changes.
        </p>

        {/* Creator Layout Demo */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-text-secondary mb-2">
            Creator Dashboard Layout
          </p>
          <div className="border-[1.5px] border-border-default rounded-lg overflow-hidden h-[320px] relative">
            <CreatorLayout className="min-h-[320px] h-[320px]">
              <div className="p-6 flex flex-col gap-4">
                <h3 className="font-display text-xl">My Property</h3>
                <p className="text-sm text-text-secondary">
                  Sidebar visible at 1024px+. Bottom nav visible below 1024px.
                  Content max-width: 960px (desktop), 720px (tablet), 768px
                  (mobile).
                </p>
                <div className="flex gap-3 flex-wrap">
                  <Badge variant="room">Kitchen</Badge>
                  <Badge variant="room">Garage</Badge>
                  <Badge variant="success">Active</Badge>
                </div>
              </div>
            </CreatorLayout>
          </div>
        </div>

        {/* Sitter Layout Demo */}
        <div>
          <p className="text-sm font-semibold text-text-secondary mb-2">
            Sitter View Layout
          </p>
          <div className="border-[1.5px] border-border-default rounded-lg overflow-hidden h-[320px] relative">
            <SitterLayout className="min-h-[320px] h-[320px]">
              <div className="flex flex-col gap-4">
                <h3 className="font-display text-xl">Today View</h3>
                <p className="text-sm text-text-secondary">
                  Full-width mobile-first layout. Bottom nav always visible.
                  Content max-width: 640px centered. Today view is the default
                  landing.
                </p>
                <div className="flex gap-3 flex-wrap">
                  <Badge variant="time">7:00 AM</Badge>
                  <Badge variant="overlay">This Trip Only</Badge>
                  <Badge variant="success">Active</Badge>
                </div>
              </div>
            </SitterLayout>
          </div>
        </div>
      </section>

      {/* ── Today View Header ── */}
      <section className="mb-8 -mx-4 -mt-8">
        <TodayViewHeader
          sitterName="Jamie"
          currentDay={2}
          totalDays={5}
          tasksToday={6}
          completedTasks={2}
          proofNeeded={3}
        />
      </section>

      {/* ── Time Slot Dividers ── */}
      <section className="mb-8">
        <h2 className="font-display text-2xl mb-4">Time Slot Dividers</h2>
        <div className="flex flex-col gap-4">
          <TimeSlotDivider slot="morning" />
          <TimeSlotDivider slot="afternoon" />
          <TimeSlotDivider slot="evening" />
        </div>
      </section>

      {/* ── Activity Feed Items ── */}
      <section className="mb-8">
        <h2 className="font-display text-2xl mb-4">Activity Feed</h2>
        <div className="bg-bg-raised rounded-md border-[1.5px] border-border-default px-4">
          <ActivityFeedItem
            type="view"
            name="Jamie"
            action="viewed the morning checklist"
            timestamp="2 min ago"
          />
          <ActivityFeedItem
            type="task"
            name="Jamie"
            action={'completed \u201cFeed Luna breakfast\u201d'}
            timestamp="15 min ago"
          />
          <ActivityFeedItem
            type="vault"
            name="Jamie"
            action="accessed the front door code"
            timestamp="1 hour ago"
          />
          <ActivityFeedItem
            type="proof"
            name="Jamie"
            action={'uploaded proof for \u201cWalk Luna\u201d'}
            timestamp="2 hours ago"
          />
          <ActivityFeedItem
            type="view"
            name="Jamie"
            action="opened the pet manual"
            timestamp="3 hours ago"
            hideBorder
          />
        </div>
      </section>

      {/* ── Bottom Navigation (inline demo) ── */}
      <section className="mb-8">
        <h2 className="font-display text-2xl mb-4">Bottom Navigation</h2>
        <p className="text-sm text-text-muted mb-2">Inline demo (non-fixed)</p>
        <div className="relative rounded-xl overflow-hidden border-[1.5px] border-border-default">
          <BottomNav style={{ position: "relative" }} />
        </div>
        <p className="text-sm text-text-muted mt-2">Active tab: &quot;Manual&quot;</p>
        <div className="relative rounded-xl overflow-hidden border-[1.5px] border-border-default mt-2">
          <BottomNav activeTab="manual" style={{ position: "relative" }} />
        </div>
      </section>

      {/* ── Wizard Progress ── */}
      <section className="mb-8">
        <h2 className="font-display text-2xl mb-4">Wizard Progress</h2>
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-sm text-text-muted mb-2">Step 1 of 6 (Home)</p>
            <WizardProgress currentStep={0} />
          </div>
          <div>
            <p className="text-sm text-text-muted mb-2">Step 3 of 6 (Access)</p>
            <WizardProgress currentStep={2} />
          </div>
          <div>
            <p className="text-sm text-text-muted mb-2">Step 6 of 6 (Review)</p>
            <WizardProgress currentStep={5} />
          </div>
        </div>
      </section>

      {/* ── Section Navigation ── */}
      <section className="mb-8">
        <h2 className="font-display text-2xl mb-4">Section Navigation</h2>
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-sm text-text-muted mb-2">Sitter manual sections</p>
            <SectionNav
              sections={[
                { id: "overview", emoji: "🏠", label: "Overview" },
                { id: "feeding", emoji: "🍗", label: "Feeding" },
                { id: "walking", emoji: "🦮", label: "Walking" },
                { id: "medications", emoji: "💊", label: "Medications" },
                { id: "emergency", emoji: "🚨", label: "Emergency" },
                { id: "house-rules", emoji: "📋", label: "House Rules" },
                { id: "vet-info", emoji: "🏥", label: "Vet Info" },
              ]}
              activeId="feeding"
            />
          </div>
          <div>
            <p className="text-sm text-text-muted mb-2">First section active (default)</p>
            <SectionNav
              sections={[
                { id: "overview", emoji: "🏠", label: "Overview" },
                { id: "feeding", emoji: "🍗", label: "Feeding" },
                { id: "walking", emoji: "🦮", label: "Walking" },
                { id: "medications", emoji: "💊", label: "Medications" },
                { id: "emergency", emoji: "🚨", label: "Emergency" },
              ]}
            />
          </div>
        </div>
      </section>

      {/* ── Notification Toasts ── */}
      <section className="mb-8">
        <h2 className="font-display text-2xl mb-4">Notification Toasts</h2>
        <div className="flex flex-col gap-4 items-end">
          <NotificationToast
            variant="success"
            title="Task completed"
            message="Luna's morning walk has been marked as done."
            timestamp="Just now"
            autoDismissMs={0}
          />
          <NotificationToast
            variant="vault"
            title="Vault item revealed"
            message="Front door code is now visible for 10 minutes."
            timestamp="2 min ago"
            autoDismissMs={0}
          />
          <NotificationToast
            variant="warning"
            title="Task overdue"
            message="Evening feeding was due 30 minutes ago."
            timestamp="5 min ago"
            autoDismissMs={0}
          />
        </div>
      </section>

      {/* ── Badges ── */}
      <section className="mb-8">
        <h2 className="font-display text-2xl mb-4">Badges &amp; Pills</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <Badge variant="overlay">This Trip Only</Badge>
          <Badge variant="room">Kitchen</Badge>
          <Badge variant="room">Garage</Badge>
          <Badge variant="room">Backyard</Badge>
          <Badge variant="vault">Secure</Badge>
          <Badge variant="success">Active</Badge>
          <Badge variant="warning">Due Today</Badge>
          <Badge variant="danger">Overdue</Badge>
          <Badge variant="time">7:00 AM</Badge>
          <Badge variant="time">6:00 PM</Badge>
        </div>
      </section>

      {/* ── Emergency Contact Bar ── */}
      <section className="mb-8">
        <h2 className="font-display text-2xl mb-4">Emergency Contact Bar</h2>
        <EmergencyContactBar contacts={sampleContacts} />
      </section>

      {/* ── Pet Profile Cards ── */}
      <section className="mb-8">
        <h2 className="font-display text-2xl mb-4">Pet Profile Cards</h2>
        <div className="flex flex-wrap gap-6 items-start">
          <PetProfileCard
            src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=600&fit=crop"
            alt="Golden Retriever sitting in a field"
            name="Biscuit"
            breed="Golden Retriever"
            age="3 years old"
            details={samplePetDetails}
            personalityNote="Loves belly rubs, hides socks under the couch, and will sit by the door when she needs to go out 🐾"
          />
          <PetProfileCard
            name="Mochi"
            breed="Siamese Cat"
            age="5 years old"
            details={[
              { emoji: "🍗", label: "Feeding", value: "3× daily, wet food" },
              { emoji: "💊", label: "Medications", value: "None" },
            ]}
            personalityNote="Shy at first, then won't leave your lap. Chirps at birds through the window."
          />
        </div>
      </section>

      {/* ── Location Cards ── */}
      <section className="mb-8">
        <h2 className="font-display text-2xl mb-4">Location Cards</h2>
        <div className="flex flex-wrap gap-6 items-start">
          <LocationCard
            src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=450&fit=crop"
            alt="Modern house with pool"
            caption="Sarah's place on Oak St"
            room="Kitchen"
            tilt="tilted-left"
          />
          <LocationCard
            src="https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=600&h=450&fit=crop"
            alt="Cozy cottage"
            caption="Grandma's cottage"
            room="Living Room"
            tilt="neutral"
          />
          <LocationCard
            src="https://images.unsplash.com/photo-1449844908441-8829872d2607?w=600&h=450&fit=crop"
            alt="Suburban home"
            caption="Tom's backyard oasis"
            room="Backyard"
            tilt="tilted-right"
          />
          <LocationCard
            caption="Awaiting photos..."
            room="Garage"
            tilt="neutral"
          />
        </div>
      </section>

      {/* ── Inputs ── */}
      <section className="mb-8">
        <h2 className="font-display text-2xl mb-4">Text Input</h2>
        <div className="flex flex-col gap-4">
          <Input
            label="Location Name"
            placeholder="e.g. Grandma's House"
            hint="Where your pet will be staying"
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
          />
          <Input
            label="Phone Number"
            placeholder="(555) 555-5555"
            error="Please enter a valid phone number"
          />
          <Input placeholder="No label, just placeholder" />
        </div>
      </section>

      {/* ── Textarea ── */}
      <section className="mb-8">
        <h2 className="font-display text-2xl mb-4">Textarea</h2>
        <div className="flex flex-col gap-4">
          <Textarea
            label="Special Instructions"
            placeholder="Any special care instructions for your pet..."
            hint="Include feeding schedule, medications, etc."
          />
          <Textarea
            label="Notes"
            placeholder="Add notes..."
            error="Notes are required for this vadem"
          />
        </div>
      </section>

      {/* ── Search Bar ── */}
      <section className="mb-8">
        <h2 className="font-display text-2xl mb-4">Search Bar</h2>
        <SearchBar placeholder="Search locations, contacts..." />
      </section>

      {/* ── Vault Items ── */}
      <section className="mb-8">
        <h2 className="font-display text-2xl mb-4">Vault Items</h2>
        <div className="flex flex-col gap-3">
          <VaultItem
            state="revealed"
            icon={<LockIcon />}
            label="Front Door Code"
            hint="Enter on keypad, press #"
            value="4 8 2 7"
          />
          <VaultItem
            state="revealed"
            icon={<LockIcon />}
            label="WiFi Password"
            hint="Network: HomeNet-5G"
            value="sunny42!"
          />
          <VaultItem
            state="locked"
            icon={<LockIcon />}
            label="Garage Code"
            hint="Verify your phone number to view"
          />
          <VaultItem
            state="hidden"
            icon={<LockIcon />}
            label=""
          />
        </div>
      </section>

      {/* ── Task Items ── */}
      <section className="mb-8">
        <h2 className="font-display text-2xl mb-4">Task Items</h2>
        <div className="flex flex-col gap-3">
          <TaskItem
            text="Feed Luna breakfast — 1 cup dry food"
            time="7:00 AM"
            room="Kitchen"
          />
          <TaskItem
            text="Walk Luna around the block (15 min)"
            time="8:00 AM"
            room="Backyard"
            showProof
          />
          <TaskItem
            text="Give Luna her joint supplement"
            time="7:00 AM"
            room="Kitchen"
            overlay
          />
          <TaskItem
            text="Refill water bowl"
            defaultCompleted
          />
          <TaskItem
            text="Check that garage door is locked"
            room="Garage"
            overlay
            showProof
          />
        </div>
      </section>

      {/* ── Buttons ── */}
      <section className="mb-8">
        <h2 className="font-display text-2xl mb-4">Variants</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="vault">Vault</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="soft">Soft</Button>
          <Button variant="danger">Danger</Button>
        </div>
      </section>

      {/* ── Sizes ── */}
      <section className="mb-8">
        <h2 className="font-display text-2xl mb-4">Sizes</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <Button size="lg">Large</Button>
          <Button size="default">Default</Button>
          <Button size="sm">Small</Button>
        </div>
      </section>

      {/* ── With Icons ── */}
      <section className="mb-8">
        <h2 className="font-display text-2xl mb-4">With Icons</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <Button icon={<PlusIcon />}>Add Location</Button>
          <Button variant="secondary" icon={<PlusIcon />}>
            Confirm
          </Button>
          <Button variant="soft" icon={<PlusIcon />} size="sm">
            Edit
          </Button>
        </div>
      </section>

      {/* ── Disabled ── */}
      <section className="mb-8">
        <h2 className="font-display text-2xl mb-4">Disabled</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <Button disabled>Primary</Button>
          <Button variant="secondary" disabled>
            Secondary
          </Button>
          <Button variant="ghost" disabled>
            Ghost
          </Button>
          <Button variant="danger" disabled>
            Danger
          </Button>
        </div>
      </section>

      {/* ── All Sizes × All Variants ── */}
      <section>
        <h2 className="font-display text-2xl mb-4">
          Size &times; Variant Matrix
        </h2>
        <div className="flex flex-col gap-4">
          {(["lg", "default", "sm"] as const).map((size) => (
            <div
              key={size}
              className="flex flex-wrap gap-2 items-center"
            >
              <span className="text-xs text-text-muted min-w-[60px]">
                {size}
              </span>
              <Button variant="primary" size={size}>
                Primary
              </Button>
              <Button variant="secondary" size={size}>
                Secondary
              </Button>
              <Button variant="vault" size={size}>
                Vault
              </Button>
              <Button variant="ghost" size={size}>
                Ghost
              </Button>
              <Button variant="soft" size={size}>
                Soft
              </Button>
              <Button variant="danger" size={size}>
                Danger
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Fixed Bottom Navigation ── */}
      <BottomNav />
    </div>
  );
}
