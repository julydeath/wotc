"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { EmployeeRecord, PaginatedResult } from "@/app/lib/types";

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

function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfYearStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  return `${yyyy}-01-01`;
}

export default function EmployeesPage() {
  const [from, setFrom] = useState(startOfYearStr());
  const [to, setTo] = useState(todayStr());
  const [page, setPage] = useState(1);
  const pageSize = 100;

  const employeesQuery = useQuery<PaginatedResult<EmployeeRecord>>({
    queryKey: ["employees-by-date", from, to, page, pageSize],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("from", from);
      params.set("to", to);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      return fetchJSON<PaginatedResult<EmployeeRecord>>(
        `/api/employees?${params.toString()}`
      );
    },
    enabled: Boolean(from && to),
    staleTime: 60_000,
  });

  const employees = employeesQuery.data?.items ?? [];

  const columnKeys = useMemo(() => {
    if (!employees.length) return [] as string[];
    const keys = new Set<string>();
    employees.forEach((row) => {
      Object.keys(row).forEach((k) => keys.add(k));
    });
    return Array.from(keys);
  }, [employees]);

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return `/api/employees/export?${params.toString()}`;
  }, [from, to]);

  const total = employeesQuery.data?.total ?? 0;
  const totalPages =
    total > 0 ? Math.max(1, Math.ceil(total / pageSize)) : page;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-50 sm:px-8 lg:px-14">
      <header className="mx-auto flex max-w-6xl flex-col gap-4 pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-400">
            Employees by hire date
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Employees
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-400">
            View employees hired within a selected time period. All columns are
            shown exactly as they exist in the{" "}
            <span className="font-mono text-slate-200">wotcemployee</span> table.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 text-xs md:items-end">
          <span className="text-[11px] text-slate-400">
            Total employees in range:{" "}
            <span className="font-semibold text-slate-100">{total}</span>
          </span>
          <a
            href={exportHref}
            className="mt-1 inline-flex h-9 items-center justify-center rounded-full border border-sky-500 bg-sky-500/15 px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-50 shadow-[0_0_18px_rgba(56,189,248,0.45)] transition hover:bg-sky-500/30"
          >
            Download Excel
          </a>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 p-6 shadow-[0_22px_70px_rgba(15,23,42,0.75)] md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Time period
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Employees with a hire date between the selected dates will be
                included.
              </p>
            </div>
            <div className="flex flex-col gap-3 text-xs sm:flex-row sm:items-end">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                  From
                </label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setPage(1);
                    setFrom(e.target.value);
                  }}
                  className="h-10 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-slate-100 outline-none transition focus:border-sky-400 focus:shadow-[0_0_0_1px_rgba(56,189,248,0.7)]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                  To
                </label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => {
                    setPage(1);
                    setTo(e.target.value);
                  }}
                  className="h-10 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-slate-100 outline-none transition focus:border-sky-400 focus:shadow-[0_0_0_1px_rgba(56,189,248,0.7)]"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 max-h-[520px] overflow-auto rounded-2xl border border-slate-800 bg-slate-950">
            <table className="min-w-full text-left text-[11px]">
              <thead className="sticky top-0 bg-slate-900/95 text-[10px] uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  {columnKeys.map((key) => (
                    <th key={key} className="px-3 py-2">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employeesQuery.isLoading && (
                  <tr>
                    <td
                      colSpan={columnKeys.length || 1}
                      className="px-3 py-4 text-center text-slate-500"
                    >
                      Loading employees...
                    </td>
                  </tr>
                )}
                {employeesQuery.isError && !employeesQuery.isLoading && (
                  <tr>
                    <td
                      colSpan={columnKeys.length || 1}
                      className="px-3 py-4 text-center text-rose-400"
                    >
                      {(employeesQuery.error as Error).message}
                    </td>
                  </tr>
                )}
                {!employeesQuery.isLoading &&
                  !employeesQuery.isError &&
                  employees.length === 0 && (
                    <tr>
                      <td
                        colSpan={columnKeys.length || 1}
                        className="px-3 py-4 text-center text-slate-500"
                      >
                        No employees found for this date range.
                      </td>
                    </tr>
                  )}
                {employees.map((row) => (
                  <tr
                    key={row.id as number}
                    className="border-t border-slate-800 hover:bg-slate-900/70"
                  >
                    {columnKeys.map((key) => {
                      const value = row[key as keyof EmployeeRecord];
                      return (
                        <td key={key} className="px-3 py-2 text-slate-200">
                          {value === null || value === undefined
                            ? ""
                            : String(value)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > 0 && (
            <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="inline-flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page <= 1}
                  className="rounded-full border border-slate-700 px-3 py-1 text-[11px] uppercase tracking-[0.16em] disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPage((prev) => (prev < totalPages ? prev + 1 : prev))
                  }
                  disabled={page >= totalPages}
                  className="rounded-full border border-slate-700 px-3 py-1 text-[11px] uppercase tracking-[0.16em] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

