"use client";

import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  type Variants,
} from "framer-motion";
import { useRef, type ReactNode } from "react";

/* ──────────────────────────────────────────────
   Shared easing — matches Vadem design system
   ────────────────────────────────────────────── */
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* ──────────────────────────────────────────────
   FadeUp — scroll-triggered fade + translateY
   ────────────────────────────────────────────── */
type FadeUpProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  duration?: number;
  once?: boolean;
};

export function FadeUp({
  children,
  className,
  delay = 0,
  y = 40,
  duration = 0.7,
  once = true,
}: FadeUpProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-80px" }}
      transition={{ duration, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/* ──────────────────────────────────────────────
   StaggerContainer + StaggerItem
   ────────────────────────────────────────────── */
const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE_OUT },
  },
};

type StaggerContainerProps = {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  once?: boolean;
};

export function StaggerContainer({
  children,
  className,
  staggerDelay,
  once = true,
}: StaggerContainerProps) {
  const variants = staggerDelay
    ? {
        ...staggerContainerVariants,
        visible: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.1,
          },
        },
      }
    : staggerContainerVariants;

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-60px" }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={staggerItemVariants}>
      {children}
    </motion.div>
  );
}

/* ──────────────────────────────────────────────
   SlideIn — horizontal entrance from left/right
   ────────────────────────────────────────────── */
type SlideInProps = {
  children: ReactNode;
  className?: string;
  direction?: "left" | "right";
  delay?: number;
  once?: boolean;
};

export function SlideIn({
  children,
  className,
  direction = "left",
  delay = 0,
  once = true,
}: SlideInProps) {
  const x = direction === "left" ? -60 : 60;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once, margin: "-80px" }}
      transition={{ duration: 0.8, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/* ──────────────────────────────────────────────
   Parallax — scroll-linked vertical offset
   ────────────────────────────────────────────── */
type ParallaxProps = {
  children: ReactNode;
  className?: string;
  speed?: number; // negative = slower, positive = faster
};

export function Parallax({
  children,
  className,
  speed = -0.15,
}: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, speed * 200]);
  const smoothY = useSpring(y, { stiffness: 100, damping: 30 });

  return (
    <motion.div ref={ref} className={className} style={{ y: smoothY }}>
      {children}
    </motion.div>
  );
}

/* ──────────────────────────────────────────────
   FloatingMock — subtle continuous float + tilt
   ────────────────────────────────────────────── */
type FloatingMockProps = {
  children: ReactNode;
  className?: string;
  tiltDeg?: number;
};

export function FloatingMock({
  children,
  className,
  tiltDeg = 2,
}: FloatingMockProps) {
  return (
    <motion.div
      className={className}
      animate={{
        y: [0, -8, 0],
        rotate: [-tiltDeg * 0.3, tiltDeg * 0.3, -tiltDeg * 0.3],
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      whileHover={{
        scale: 1.03,
        rotate: 0,
        transition: { duration: 0.4, ease: EASE_OUT },
      }}
    >
      {children}
    </motion.div>
  );
}

/* ──────────────────────────────────────────────
   HeroTextReveal — word-by-word stagger
   ────────────────────────────────────────────── */
type HeroTextRevealProps = {
  text: string;
  className?: string;
  delay?: number;
};

export function HeroTextReveal({
  text,
  className,
  delay = 0,
}: HeroTextRevealProps) {
  const words = text.split(" ");
  return (
    <motion.span
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.06,
            delayChildren: delay,
          },
        },
      }}
    >
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="inline-block mr-[0.3em]"
          variants={{
            hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
            visible: {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              transition: { duration: 0.5, ease: EASE_OUT },
            },
          }}
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
}

/* ──────────────────────────────────────────────
   ScrollProgress — thin bar at top of viewport
   ────────────────────────────────────────────── */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] bg-primary origin-left z-[60]"
      style={{ scaleX }}
    />
  );
}
