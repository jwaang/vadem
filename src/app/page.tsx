import { Button } from "@/components/ui/Button";

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

export default function Home() {
  return (
    <div
      style={{
        maxWidth: 768,
        margin: "0 auto",
        padding: "var(--space-8) var(--space-4)",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-5xl)",
          lineHeight: "var(--leading-tight)",
          letterSpacing: "var(--tracking-tight)",
          color: "var(--text)",
          marginBottom: "var(--space-2)",
        }}
      >
        Handoff
      </h1>
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-lg)",
          lineHeight: "var(--leading-normal)",
          color: "var(--text-secondary)",
          marginBottom: "var(--space-8)",
        }}
      >
        Button component showcase
      </p>

      {/* ── Variants ── */}
      <section style={{ marginBottom: "var(--space-8)" }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-2xl)",
            marginBottom: "var(--space-4)",
          }}
        >
          Variants
        </h2>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--space-3)",
            alignItems: "center",
          }}
        >
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="vault">Vault</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="soft">Soft</Button>
          <Button variant="danger">Danger</Button>
        </div>
      </section>

      {/* ── Sizes ── */}
      <section style={{ marginBottom: "var(--space-8)" }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-2xl)",
            marginBottom: "var(--space-4)",
          }}
        >
          Sizes
        </h2>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--space-3)",
            alignItems: "center",
          }}
        >
          <Button size="lg">Large</Button>
          <Button size="default">Default</Button>
          <Button size="sm">Small</Button>
        </div>
      </section>

      {/* ── With Icons ── */}
      <section style={{ marginBottom: "var(--space-8)" }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-2xl)",
            marginBottom: "var(--space-4)",
          }}
        >
          With Icons
        </h2>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--space-3)",
            alignItems: "center",
          }}
        >
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
      <section style={{ marginBottom: "var(--space-8)" }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-2xl)",
            marginBottom: "var(--space-4)",
          }}
        >
          Disabled
        </h2>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--space-3)",
            alignItems: "center",
          }}
        >
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
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-2xl)",
            marginBottom: "var(--space-4)",
          }}
        >
          Size &times; Variant Matrix
        </h2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          {(["lg", "default", "sm"] as const).map((size) => (
            <div
              key={size}
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--space-2)",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                  minWidth: 60,
                }}
              >
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
    </div>
  );
}
