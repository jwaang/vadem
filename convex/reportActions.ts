"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

// ── Local types matching getTripReport return shape ───────────────────────────

type Completion = {
  sitterName: string;
  completedAt: number;
  proofPhotoUrl?: string;
  date: string;
};

type ReportTask = {
  id: string;
  text: string;
  section: string;
  completions: Completion[];
};

type ReportOverlayItem = {
  id: string;
  text: string;
  date?: string;
  completions: Completion[];
};

type ReportVaultEntry = {
  sitterName?: string;
  itemLabel: string;
  accessedAt: number;
};

type ReportActivityEvent = {
  eventType: string;
  sitterName?: string;
  vaultItemLabel?: string;
  taskTitle?: string;
  createdAt: number;
};

type ReportData = {
  trip: {
    startDate: string;
    endDate: string;
    status: string;
    sitters: Array<{ name: string }>;
  };
  tasks: ReportTask[];
  overlayItems: ReportOverlayItem[];
  vaultAccessLog: ReportVaultEntry[];
  activityTimeline: ReportActivityEvent[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTs(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function eventLabel(event: ReportActivityEvent): string {
  const { eventType, taskTitle, vaultItemLabel, sitterName } = event;
  const who = sitterName ?? "System";
  if (eventType === "link_opened") return `${who} opened the sitter link`;
  if (eventType === "task_completed")
    return `${who} completed "${taskTitle ?? "a task"}"`;
  if (eventType === "proof_uploaded")
    return `${who} submitted proof for "${taskTitle ?? "a task"}"`;
  if (eventType === "task_unchecked")
    return `${who} unmarked "${taskTitle ?? "a task"}"`;
  if (eventType === "vault_accessed")
    return `${who} accessed ${vaultItemLabel ?? "a vault item"}`;
  if (eventType === "trip_started") return "Trip started";
  if (eventType === "trip_expired") return "Trip expired";
  return `${who}: ${eventType.replace(/_/g, " ")}`;
}

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  expired: "Expired",
  active: "Active",
  draft: "Draft",
};

// ── PDF Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 48,
    paddingVertical: 44,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#2A1F1A",
  },
  // ── Header ──
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: "#C2704A",
    borderBottomStyle: "solid",
  },
  logoText: {
    fontSize: 26,
    fontFamily: "Times-Bold",
    color: "#C2704A",
  },
  logoSub: {
    fontSize: 9,
    color: "#A89890",
    marginTop: 2,
  },
  headerRight: {
    textAlign: "right",
  },
  headerMeta: {
    fontSize: 9,
    color: "#6B5A50",
  },
  // ── Section heading ──
  sectionHeading: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#2A1F1A",
    marginTop: 18,
    marginBottom: 7,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#E8DFD6",
    borderBottomStyle: "solid",
  },
  // ── Summary grid ──
  summaryRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  summaryCell: {
    width: "50%",
  },
  summaryLabel: {
    fontSize: 8,
    color: "#A89890",
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#2A1F1A",
  },
  // ── Task row ──
  taskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 7,
    marginBottom: 3,
    borderRadius: 4,
  },
  taskRowDone: {
    backgroundColor: "#F2F7F3",
  },
  taskRowNotDone: {
    backgroundColor: "#FEF2F2",
  },
  taskCheck: {
    width: 14,
    fontSize: 10,
    marginRight: 6,
    marginTop: 1,
  },
  taskCheckDone: {
    color: "#5E8B6A",
  },
  taskCheckNotDone: {
    color: "#DC2626",
  },
  taskContent: {
    flex: 1,
  },
  taskText: {
    fontSize: 10,
    color: "#2A1F1A",
    marginBottom: 1,
  },
  taskMeta: {
    fontSize: 8,
    color: "#A89890",
  },
  taskMetaDanger: {
    fontSize: 8,
    color: "#DC2626",
  },
  // ── Photo grid ──
  photoWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  photoItem: {
    width: "47%",
    marginBottom: 10,
  },
  photoItemRight: {
    marginLeft: "6%",
  },
  photoImg: {
    width: "100%",
    height: 88,
    borderRadius: 4,
  },
  photoCaption: {
    fontSize: 8,
    color: "#6B5A50",
    marginTop: 3,
  },
  photoCaptionSub: {
    fontSize: 7,
    color: "#A89890",
    marginTop: 1,
  },
  // ── Vault row ──
  vaultRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 5,
    paddingHorizontal: 7,
    marginBottom: 3,
    backgroundColor: "#F2F4F6",
    borderRadius: 4,
  },
  vaultDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#3D4F5F",
    marginRight: 8,
    marginTop: 3,
  },
  vaultItemLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#2A1F1A",
    marginBottom: 1,
  },
  vaultMeta: {
    fontSize: 8,
    color: "#A89890",
  },
  // ── Activity row ──
  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 4,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#F3EDE5",
    borderBottomStyle: "solid",
  },
  activityDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D4943A",
    marginRight: 8,
    marginTop: 3,
  },
  activityText: {
    fontSize: 9,
    color: "#2A1F1A",
    flex: 1,
  },
  activityTime: {
    fontSize: 8,
    color: "#A89890",
    marginLeft: 8,
  },
  // ── Footer ──
  footer: {
    position: "absolute",
    bottom: 22,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#E8DFD6",
    borderTopStyle: "solid",
  },
  footerText: {
    fontSize: 8,
    color: "#A89890",
  },
});

// ── PDF Document builder (React.createElement, no JSX) ────────────────────────

function buildDocument(report: ReportData): React.ReactElement {
  const { trip, tasks, overlayItems, vaultAccessLog, activityTimeline } =
    report;
  const allTasks: Array<ReportTask | ReportOverlayItem> = [
    ...tasks,
    ...overlayItems,
  ];
  const doneCount = allTasks.filter((t) => t.completions.length > 0).length;
  const totalCount = allTasks.length;
  const statusLabel = STATUS_LABELS[trip.status] ?? trip.status;

  const proofPhotos = allTasks.flatMap((task) =>
    task.completions
      .filter((c) => !!c.proofPhotoUrl)
      .map((c) => ({
        url: c.proofPhotoUrl!,
        taskText: task.text,
        sitterName: c.sitterName,
        completedAt: c.completedAt,
      })),
  );

  const el = React.createElement;

  // ── Section: Header ──
  const header = el(
    View,
    { style: styles.header },
    el(
      View,
      null,
      el(Text, { style: styles.logoText }, "Vadem"),
      el(Text, { style: styles.logoSub }, "Trip Report"),
    ),
    el(
      View,
      { style: styles.headerRight },
      el(
        Text,
        { style: styles.headerMeta },
        `${trip.startDate} \u2013 ${trip.endDate}`,
      ),
      el(Text, { style: styles.headerMeta }, statusLabel),
    ),
  );

  // ── Section: Summary ──
  const summary = el(
    View,
    null,
    el(Text, { style: styles.sectionHeading }, "Summary"),
    el(
      View,
      { style: styles.summaryRow },
      el(
        View,
        { style: styles.summaryCell },
        el(Text, { style: styles.summaryLabel }, "DATES"),
        el(
          Text,
          { style: styles.summaryValue },
          `${trip.startDate} \u2013 ${trip.endDate}`,
        ),
      ),
      el(
        View,
        { style: styles.summaryCell },
        el(Text, { style: styles.summaryLabel }, "STATUS"),
        el(Text, { style: styles.summaryValue }, statusLabel),
      ),
    ),
    el(
      View,
      { style: styles.summaryRow },
      el(
        View,
        { style: styles.summaryCell },
        el(Text, { style: styles.summaryLabel }, "SITTERS"),
        el(
          Text,
          { style: styles.summaryValue },
          trip.sitters.length > 0
            ? trip.sitters.map((s) => s.name).join(", ")
            : "None added",
        ),
      ),
      el(
        View,
        { style: styles.summaryCell },
        el(Text, { style: styles.summaryLabel }, "TASKS COMPLETED"),
        el(
          Text,
          { style: styles.summaryValue },
          `${doneCount} / ${totalCount}`,
        ),
      ),
    ),
  );

  // ── Section: Tasks ──
  const taskRows = allTasks.map((task) => {
    const isDone = task.completions.length > 0;
    const last = task.completions[task.completions.length - 1];
    return el(
      View,
      {
        key: task.id,
        style: {
          ...styles.taskRow,
          ...(isDone ? styles.taskRowDone : styles.taskRowNotDone),
        },
      },
      el(
        Text,
        {
          style: {
            ...styles.taskCheck,
            ...(isDone ? styles.taskCheckDone : styles.taskCheckNotDone),
          },
        },
        isDone ? "\u2713" : "\u2717",
      ),
      el(
        View,
        { style: styles.taskContent },
        el(Text, { style: styles.taskText }, task.text),
        isDone
          ? el(
              Text,
              { style: styles.taskMeta },
              `${last.sitterName} \u00b7 ${fmtTs(last.completedAt)}`,
            )
          : el(Text, { style: styles.taskMetaDanger }, "Not completed"),
      ),
    );
  });

  const tasksSection = el(
    View,
    null,
    el(Text, { style: styles.sectionHeading }, "Task Completion"),
    allTasks.length === 0
      ? el(
          Text,
          { style: { fontSize: 10, color: "#A89890" } },
          "No tasks for this trip.",
        )
      : el(View, null, ...taskRows),
  );

  // ── Section: Proof Photos ──
  const photoItems = proofPhotos.map((photo, i) =>
    el(
      View,
      {
        key: i,
        style: {
          ...styles.photoItem,
          ...(i % 2 === 1 ? styles.photoItemRight : {}),
        },
      },
      el(Image, { src: photo.url, style: styles.photoImg }),
      el(Text, { style: styles.photoCaption }, photo.taskText),
      el(
        Text,
        { style: styles.photoCaptionSub },
        `${photo.sitterName} \u00b7 ${fmtTs(photo.completedAt)}`,
      ),
    ),
  );

  const photosSection =
    proofPhotos.length > 0
      ? el(
          View,
          null,
          el(Text, { style: styles.sectionHeading }, "Proof Photos"),
          el(View, { style: styles.photoWrap }, ...photoItems),
        )
      : null;

  // ── Section: Vault Access Log ──
  const vaultRows = vaultAccessLog.map((entry, i) =>
    el(
      View,
      { key: i, style: styles.vaultRow },
      el(View, { style: styles.vaultDot }),
      el(
        View,
        { style: { flex: 1 } },
        el(Text, { style: styles.vaultItemLabel }, entry.itemLabel),
        el(
          Text,
          { style: styles.vaultMeta },
          `${entry.sitterName ?? "Unknown sitter"} \u00b7 ${fmtTs(entry.accessedAt)}`,
        ),
      ),
    ),
  );

  const vaultSection =
    vaultAccessLog.length > 0
      ? el(
          View,
          null,
          el(Text, { style: styles.sectionHeading }, "Vault Access Log"),
          el(View, null, ...vaultRows),
        )
      : null;

  // ── Section: Activity Timeline ──
  const activityRows = activityTimeline.map((event, i) =>
    el(
      View,
      { key: i, style: styles.activityRow },
      el(View, { style: styles.activityDot }),
      el(Text, { style: styles.activityText }, eventLabel(event)),
      el(Text, { style: styles.activityTime }, fmtTs(event.createdAt)),
    ),
  );

  const activitySection =
    activityTimeline.length > 0
      ? el(
          View,
          null,
          el(Text, { style: styles.sectionHeading }, "Activity Timeline"),
          el(View, null, ...activityRows),
        )
      : null;

  // ── Footer (fixed — appears on every page) ──
  const footer = el(
    View,
    { style: styles.footer, fixed: true },
    el(Text, { style: styles.footerText }, "Generated by Vadem"),
    el(Text, {
      style: styles.footerText,
      render: ({
        pageNumber,
        totalPages,
      }: {
        pageNumber: number;
        totalPages: number;
      }) => `Page ${pageNumber} of ${totalPages}`,
    }),
  );

  return el(
    Document,
    { title: "Trip Report", author: "Vadem" },
    el(
      Page,
      { size: "A4" as const, style: styles.page },
      header,
      summary,
      tasksSection,
      photosSection,
      vaultSection,
      activitySection,
      footer,
    ),
  );
}

// ── Convex action ─────────────────────────────────────────────────────────────

export const generateTripReportPdf = action({
  args: { tripId: v.id("trips") },
  returns: v.string(),
  handler: async (ctx, { tripId }): Promise<string> => {
    const report = (await ctx.runQuery(api.reports.getTripReport, {
      tripId,
    })) as ReportData | null;

    if (!report) {
      throw new Error("Trip not found");
    }

    const doc = buildDocument(report);
    // Cast needed: React.createElement returns ReactElement<unknown> but
    // renderToBuffer expects ReactElement<DocumentProps>
    const buffer = await renderToBuffer(
      doc as Parameters<typeof renderToBuffer>[0],
    );
    return buffer.toString("base64");
  },
});
