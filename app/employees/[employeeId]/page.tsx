"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import React, { useState } from "react";
import type { EmployeeRecord } from "@/app/lib/types";

/* ---------- helpers ---------- */

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    let msg = "Request failed";
    try {
      const text = await res.text();
      msg = text || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

function formatDate(raw?: string | null): string {
  if (!raw) return "—";
  const trimmed = raw.toString().slice(0, 10); // handle datetime as well
  if (trimmed === "1900-01-01" || trimmed === "0000-00-00") return "—";
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return trimmed;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(raw?: string | null): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.toString();
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(n: number | null | undefined): string {
  if (!n || Number.isNaN(n)) return "$0.00";
  return `$${n.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

function formatBool(raw?: number | null): {
  label: string;
  tone: "on" | "off";
} {
  if (!raw) return { label: "No", tone: "off" };
  return { label: "Yes", tone: "on" };
}

function maskSSN(ssn?: string | null): string {
  if (!ssn) return "—";
  const digits = ssn.replace(/[^\d]/g, "");
  if (digits.length < 4) return "***-**-****";
  const last4 = digits.slice(-4);
  return `***-**-${last4}`;
}

/* ---------- main page ---------- */

export default function EmployeeDetailPage() {
  const params = useParams<{ employeeId: string }>();
  const router = useRouter();
  const employeeId = params?.employeeId;
  const numericId = employeeId ? Number(employeeId) : NaN;

  const [showVariableInfo, setShowVariableInfo] = useState(false);
  const [showCalcText, setShowCalcText] = useState(false);

  const employeeQuery = useQuery<EmployeeRecord | null>({
    queryKey: ["employee", employeeId],
    enabled: !!employeeId && !Number.isNaN(numericId),
    queryFn: () =>
      fetchJSON<EmployeeRecord | null>(`/api/employees/${employeeId}`),
    staleTime: 60_000,
  });

  const employee = employeeQuery.data;

  const isInactive = employee?.Inactive === 1;
  const isLate = employee?.Late === 1;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-50 sm:px-8 lg:px-14">
      {/* Top bar */}
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 pb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-sky-300"
        >
          <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[11px]">
            ← Back
          </span>
          <span className="hidden sm:inline">Return to dashboard</span>
        </button>

        <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
          Employee details
        </span>
      </div>

      {/* Content states */}
      {employeeQuery.isLoading && (
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-center text-sm text-slate-400">
          Loading employee…
        </div>
      )}

      {employeeQuery.isError && !employeeQuery.isLoading && (
        <div className="mx-auto max-w-5xl rounded-3xl border border-rose-600/50 bg-rose-950/40 p-8 text-sm text-rose-100">
          {(employeeQuery.error as Error).message}
        </div>
      )}

      {!employeeQuery.isLoading && !employeeQuery.isError && !employee && (
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-center text-sm text-slate-300">
          No employee found for ID{" "}
          <span className="font-mono">{employeeId}</span>.
        </div>
      )}

      {employee && (
        <div className="mx-auto flex max-w-5xl flex-col gap-8 pb-10">
          {/* Header card */}
          <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 p-6 shadow-[0_22px_70px_rgba(15,23,42,0.75)] sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-sky-400">
                  Employee #{employee.id}
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {employee.FirstName} {employee.MidInit} {employee.Lastname}{" "}
                  {employee.suffix}
                </h1>
                <p className="mt-2 text-xs text-slate-400">
                  SSN:&nbsp;
                  <span className="font-mono text-slate-200">
                    {employee.SSN}
                  </span>
                  &nbsp;• Hire date:{" "}
                  <span className="font-medium text-slate-200">
                    {formatDate(employee.datehired)}
                  </span>
                  {employee.termdate &&
                    formatDate(employee.termdate) !== "—" && (
                      <>
                        {" "}
                        • Term date:{" "}
                        <span className="font-medium text-slate-200">
                          {formatDate(employee.termdate)}
                        </span>
                      </>
                    )}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-[11px]">
                {/* Active / inactive */}
                <StatusPill
                  label={isInactive ? "Inactive" : "Active"}
                  tone={isInactive ? "red" : "green"}
                />
                {/* Late */}
                {isLate && <StatusPill label="Late" tone="amber" />}
                {/* WOTC/NQ flag */}
                {employee.nq === 1 && (
                  <StatusPill label="Non-qualified (NQ)" tone="slate" />
                )}
                {employee.tobesent === 1 && (
                  <StatusPill label="To be sent" tone="blue" />
                )}
                {employee.SSExemption === 1 && (
                  <StatusPill label="SS Exemption" tone="purple" />
                )}
              </div>
            </div>
          </section>

          {/* Grid sections */}
          <section className="grid gap-6 lg:grid-cols-2">
            {/* Personal info */}
            <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-5 sm:p-6">
              <SectionTitle title="Personal details" />
              <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                <DetailRow label="First name" value={employee.FirstName} />
                <DetailRow label="Last name" value={employee.Lastname} />
                <DetailRow label="Middle initial" value={employee.MidInit} />
                <DetailRow label="Suffix" value={employee.suffix} />
                <DetailRow
                  label="Date of birth"
                  value={formatDate(employee.dob)}
                />
                <DetailRow label="SSN (masked)" value={employee.SSN} />
                <DetailRow label="Telephone" value={employee.telephone} />
                <DetailRow label="Foreign ID" value={employee.foreignid} />
                <DetailRow label="Tag" value={employee.tag} />
                <DetailRow
                  label="Wage"
                  value={employee.wage ? formatMoney(employee.wage) : "—"}
                />
              </div>
            </div>

            {/* Contact / address */}
            <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-5 sm:p-6">
              <SectionTitle title="Contact & address" />
              <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                <DetailRow label="Address line 1" value={employee.Address} />
                <DetailRow label="Address line 2" value={employee.Address2} />
                <DetailRow label="City" value={employee.City} />
                <DetailRow label="County" value={employee.County} />
                <DetailRow label="State" value={employee.State} />
                <DetailRow label="ZIP" value={employee.Zip} />
                <DetailRow
                  label="Location ID"
                  value={employee.LocationID?.toString()}
                />
                <DetailRow
                  label="Web page"
                  value={employee.webpage === 1 ? "Enabled" : "No"}
                />
              </div>
            </div>
          </section>

          {/* Employment / WOTC dates & flags */}
          <section className="grid gap-6 lg:grid-cols-2">
            {/* Employment timeline */}
            <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-5 sm:p-6">
              <SectionTitle title="Employment & WOTC timeline" />
              <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                <DetailRow
                  label="Date hired"
                  value={formatDate(employee.datehired)}
                />
                <DetailRow
                  label="Start date"
                  value={formatDate(employee.startdate)}
                />
                <DetailRow
                  label="Signed date"
                  value={formatDate(employee.signeddate)}
                />
                <DetailRow
                  label="Info given date"
                  value={formatDate(employee.gaveinfodate)}
                />
                <DetailRow
                  label="Offered date"
                  value={formatDate(employee.offereddate)}
                />
                <DetailRow
                  label="Received date"
                  value={formatDate(employee.receiveddate)}
                />
                <DetailRow
                  label="Term date"
                  value={formatDate(employee.termdate)}
                />
                <DetailRow
                  label="Entered date"
                  value={formatDateTime(employee.entereddate as any)}
                />
                <DetailRow
                  label="Last update"
                  value={formatDate(employee.lastupdate)}
                />
              </div>
            </div>

            {/* Flags */}
            <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-5 sm:p-6">
              <SectionTitle title="Status flags" />
              <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                <BoolRow label="Inactive" value={employee.Inactive} />
                <BoolRow label="Late" value={employee.Late} />
                <BoolRow label="Received" value={employee.received} />
                <BoolRow label="Not received" value={employee.notreceived} />
                <BoolRow label="Incomplete" value={employee.incomplete} />
                <BoolRow label="Sleep" value={employee.sleep} />
                <BoolRow label="Sent to state" value={employee.senttostate} />
                <BoolRow label="SS exemption" value={employee.SSExemption} />
                <BoolRow label="Non-qualified (NQ)" value={employee.nq} />
                <BoolRow label="To be sent" value={employee.tobesent} />
              </div>
            </div>
          </section>

          {/* Long text panels */}
          <section className="grid gap-6 lg:grid-cols-2">
            {/* Variable info */}
            <LongTextCard
              title="Variable info"
              value={employee.variableinfo}
              open={showVariableInfo}
              onToggle={() => setShowVariableInfo((v) => !v)}
            />

            {/* Calc text */}
            <LongTextCard
              title="Calculation text"
              value={employee.calctext}
              open={showCalcText}
              onToggle={() => setShowCalcText((v) => !v)}
            />
          </section>
        </div>
      )}
    </main>
  );
}

/* ---------- small components ---------- */

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        {title}
      </h2>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <span className="text-xs text-slate-100">
        {value === null || value === undefined || value === "" ? "—" : value}
      </span>
    </div>
  );
}

function BoolRow({ label, value }: { label: string; value?: number | null }) {
  const { label: text, tone } = formatBool(value);
  const base =
    "inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em]";

  const colors =
    tone === "on"
      ? "border-emerald-500/70 bg-emerald-500/10 text-emerald-100"
      : "border-slate-700 bg-slate-900 text-slate-300";

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <span className={`${base} ${colors}`}>{text}</span>
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "red" | "amber" | "blue" | "purple" | "slate";
}) {
  const toneMap: Record<
    typeof tone,
    { border: string; bg: string; text: string }
  > = {
    green: {
      border: "border-emerald-500/60",
      bg: "bg-emerald-500/10",
      text: "text-emerald-100",
    },
    red: {
      border: "border-rose-500/70",
      bg: "bg-rose-500/10",
      text: "text-rose-100",
    },
    amber: {
      border: "border-amber-400/70",
      bg: "bg-amber-400/10",
      text: "text-amber-100",
    },
    blue: {
      border: "border-sky-500/70",
      bg: "bg-sky-500/10",
      text: "text-sky-100",
    },
    purple: {
      border: "border-violet-500/70",
      bg: "bg-violet-500/10",
      text: "text-violet-100",
    },
    slate: {
      border: "border-slate-500/70",
      bg: "bg-slate-700/30",
      text: "text-slate-100",
    },
  };

  const c = toneMap[tone];

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
        c.border,
        c.bg,
        c.text,
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function LongTextCard({
  title,
  value,
  open,
  onToggle,
}: {
  title: string;
  value?: string | null;
  open: boolean;
  onToggle: () => void;
}) {
  const hasContent = value && value.trim().length > 0;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <SectionTitle title={title} />
        {hasContent && (
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200 transition hover:border-sky-400 hover:text-sky-200"
          >
            {open ? "Hide" : "Show"}
            <span
              className={[
                "transition-transform",
                open ? "rotate-180" : "",
              ].join(" ")}
            >
              ▾
            </span>
          </button>
        )}
      </div>

      {!hasContent && <p className="mt-4 text-xs text-slate-500">No data.</p>}

      {hasContent && (
        <div
          className={[
            "mt-3 grid transition-all duration-250 ease-out",
            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          ].join(" ")}
        >
          <div className="overflow-hidden">
            <pre className="max-h-52 overflow-y-auto rounded-2xl bg-slate-950/90 px-3 py-3 text-[11px] text-slate-200">
              {value}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
