// "use client";

// import React, { useMemo, useState } from "react";
// import { useQuery } from "@tanstack/react-query";
// import type {
//   CompanySummary,
//   LocationSummary,
//   CreditsSummary,
// } from "@/app/lib/types";

// /* ---------------- helpers ---------------- */

// const AVERAGE_CREDIT = 1469.21; // from your sheet
// const REVENUE_RATE = 0.2; // 20%

// async function fetchJSON<T>(url: string): Promise<T> {
//   const res = await fetch(url, { cache: "no-store" });
//   if (!res.ok) {
//     let msg = "Request failed";
//     try {
//       const text = await res.text();
//       msg = text || msg;
//     } catch {}
//     throw new Error(msg);
//   }
//   return res.json();
// }

// function formatNumber(n: number | null | undefined): string {
//   if (!n || Number.isNaN(n)) return "0";
//   return n.toLocaleString("en-US");
// }

// function formatMoney(n: number | null | undefined): string {
//   if (!n || Number.isNaN(n)) return "$0";
//   return `$${n.toLocaleString("en-US", {
//     maximumFractionDigits: 2,
//     minimumFractionDigits: 2,
//   })}`;
// }

// function todayStr() {
//   const d = new Date();
//   const yyyy = d.getFullYear();
//   const mm = String(d.getMonth() + 1).padStart(2, "0");
//   const dd = String(d.getDate()).padStart(2, "0");
//   return `${yyyy}-${mm}-${dd}`;
// }

// function startOfYearStr() {
//   const d = new Date();
//   const yyyy = d.getFullYear();
//   return `${yyyy}-01-01`;
// }

// /* ---------------- main page ---------------- */

// export default function CreditsPage() {
//   const [from, setFrom] = useState(startOfYearStr());
//   const [to, setTo] = useState(todayStr());

//   // company search and selection
//   const [companySearchInput, setCompanySearchInput] = useState("");
//   const [companySearchQuery, setCompanySearchQuery] = useState("");
//   const [selectedCompany, setSelectedCompany] = useState<CompanySummary | null>(
//     null
//   );

//   // location selection (for selected company)
//   const [selectedLocation, setSelectedLocation] =
//     useState<LocationSummary | null>(null);

//   /* ----- queries ----- */

//   const companiesQuery = useQuery<CompanySummary[]>({
//     queryKey: ["credits-companies", companySearchQuery],
//     queryFn: () =>
//       fetchJSON<CompanySummary[]>(
//         companySearchQuery
//           ? `/api/companies?q=${encodeURIComponent(companySearchQuery)}`
//           : "/api/companies"
//       ),
//     staleTime: 5 * 60_000,
//   });

//   const locationsQuery = useQuery<LocationSummary[]>({
//     queryKey: ["credits-locations", selectedCompany?.CustomerID],
//     queryFn: () =>
//       fetchJSON<LocationSummary[]>(
//         `/api/companies/${selectedCompany!.CustomerID}/locations`
//       ),
//     enabled: !!selectedCompany,
//     staleTime: 5 * 60_000,
//   });

//   const creditsSummaryQuery = useQuery<CreditsSummary>({
//     queryKey: [
//       "credits-summary",
//       from,
//       to,
//       selectedCompany?.CustomerID ?? null,
//       selectedLocation?.id ?? null,
//     ],
//     queryFn: () => {
//       const params = new URLSearchParams();
//       params.set("from", from);
//       params.set("to", to);
//       if (selectedCompany)
//         params.set("customerId", String(selectedCompany.CustomerID));
//       if (selectedLocation)
//         params.set("locationId", String(selectedLocation.id));
//       return fetchJSON<CreditsSummary>(
//         `/api/credits/summary?${params.toString()}`
//       );
//     },
//     enabled: Boolean(from && to),
//     staleTime: 60_000,
//   });

//   /* ----- derived metrics ----- */

//   const derived = useMemo(() => {
//     const base = creditsSummaryQuery.data;
//     if (!base) {
//       return {
//         pendingCredit: 0,
//         pendingRevenue: 0,
//         certifiedCredit: 0,
//         certifiedRevenue: 0,
//         estimatedTotal: 0,
//       };
//     }

//     const pendingCredit = base.totalPending * 0.5 * AVERAGE_CREDIT;
//     const pendingRevenue = pendingCredit * REVENUE_RATE;

//     const certifiedCredit = base.totalCerts * AVERAGE_CREDIT;
//     const certifiedRevenue = certifiedCredit * REVENUE_RATE;

//     const estimatedTotal = pendingRevenue + certifiedRevenue;

//     return {
//       pendingCredit,
//       pendingRevenue,
//       certifiedCredit,
//       certifiedRevenue,
//       estimatedTotal,
//     };
//   }, [creditsSummaryQuery.data]);

//   const summary = creditsSummaryQuery.data;

//   /* ----- handlers ----- */

//   const handleCompanySearch = () => {
//     setCompanySearchQuery(companySearchInput.trim());
//   };

//   const handleSelectCompany = (c: CompanySummary) => {
//     setSelectedCompany(c);
//     setSelectedLocation(null);
//   };

//   const handleSelectLocation = (locId: number) => {
//     const list = locationsQuery.data ?? [];
//     const found = list.find((l) => l.id === locId) ?? null;
//     setSelectedLocation(found);
//   };

//   /* ---------------- UI ---------------- */

//   return (
//     <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-50 sm:px-8 lg:px-14">
//       {/* Header */}
//       <header className="mx-auto flex max-w-6xl flex-col gap-4 pb-8 md:flex-row md:items-end md:justify-between">
//         <div>
//           <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-400">
//             WOTC Credits Monitoring
//           </p>
//           <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
//             Credits Dashboard
//           </h1>
//         </div>

//         <div className="flex flex-col items-start gap-2 text-xs md:items-end">
//           <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 font-medium text-slate-300">
//             Average credit:&nbsp;
//             <span className="font-semibold text-emerald-400">
//               {formatMoney(AVERAGE_CREDIT)}
//             </span>
//           </span>
//           <span className="text-[11px] text-slate-500">
//             Revenue share: {(REVENUE_RATE * 100).toFixed(0)}%
//           </span>
//         </div>
//       </header>

//       <div className="mx-auto flex max-w-6xl flex-col gap-10">
//         {/* 1. Filters */}
//         <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 p-6 shadow-[0_22px_70px_rgba(15,23,42,0.75)] md:p-8">
//           <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
//             <StepBadge number={1} title="Filters" />
//             <p className="text-xs text-slate-400">
//               Choose a date range, company, and optional location. All numbers
//               update automatically.
//             </p>
//           </div>

//           <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)]">
//             {/* Date + company search */}
//             <div className="space-y-6">
//               {/* Date range */}
//               <div>
//                 <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
//                   Time period
//                 </p>
//                 <div className="mt-3 grid gap-3 sm:grid-cols-2">
//                   <div className="flex flex-col gap-1.5">
//                     <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
//                       From
//                     </label>
//                     <input
//                       type="date"
//                       value={from}
//                       onChange={(e) => setFrom(e.target.value)}
//                       className="h-10 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-slate-100 outline-none ring-0 transition focus:border-sky-400 focus:shadow-[0_0_0_1px_rgba(56,189,248,0.7)]"
//                     />
//                   </div>
//                   <div className="flex flex-col gap-1.5">
//                     <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
//                       To
//                     </label>
//                     <input
//                       type="date"
//                       value={to}
//                       onChange={(e) => setTo(e.target.value)}
//                       className="h-10 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-slate-100 outline-none ring-0 transition focus:border-sky-400 focus:shadow-[0_0_0_1px_rgba(56,189,248,0.7)]"
//                     />
//                   </div>
//                 </div>
//               </div>

//               {/* Company search & list */}
//               <div className="space-y-2">
//                 <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
//                   Company
//                 </p>
//                 <div className="flex gap-2">
//                   <input
//                     value={companySearchInput}
//                     onChange={(e) => setCompanySearchInput(e.target.value)}
//                     onKeyDown={(e) => {
//                       if (e.key === "Enter") handleCompanySearch();
//                     }}
//                     placeholder="Search company name..."
//                     className="h-10 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs outline-none transition focus:border-sky-400 focus:shadow-[0_0_0_1px_rgba(56,189,248,0.7)]"
//                   />
//                   <button
//                     type="button"
//                     onClick={handleCompanySearch}
//                     className="inline-flex h-10 items-center justify-center rounded-xl border border-sky-500 bg-sky-500/20 px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-50 shadow-[0_0_18px_rgba(56,189,248,0.45)] transition hover:bg-sky-500/30"
//                   >
//                     Search
//                   </button>
//                 </div>

//                 <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/80">
//                   <ul className="divide-y divide-slate-800 text-xs">
//                     {companiesQuery.isLoading && (
//                       <li className="px-4 py-3 text-slate-500">
//                         Loading companies...
//                       </li>
//                     )}
//                     {companiesQuery.isError && !companiesQuery.isLoading && (
//                       <li className="px-4 py-3 text-rose-400">
//                         {(companiesQuery.error as Error).message}
//                       </li>
//                     )}
//                     {companiesQuery.data &&
//                       companiesQuery.data.length === 0 &&
//                       !companiesQuery.isLoading && (
//                         <li className="px-4 py-3 text-slate-500">
//                           No companies found.
//                         </li>
//                       )}
//                     {companiesQuery.data?.map((c) => {
//                       const active =
//                         selectedCompany?.CustomerID === c.CustomerID;
//                       return (
//                         <li
//                           key={c.CustomerID}
//                           onClick={() => handleSelectCompany(c)}
//                           className={[
//                             "cursor-pointer px-4 py-3 transition",
//                             active
//                               ? "bg-sky-500/15 text-sky-50"
//                               : "hover:bg-slate-900",
//                           ].join(" ")}
//                         >
//                           <div className="flex items-center justify-between gap-3">
//                             <div className="flex flex-col">
//                               <span className="font-medium text-slate-50">
//                                 {c.Name}
//                               </span>
//                               <span className="text-[11px] text-slate-400">
//                                 ID: {c.CustomerID}
//                               </span>
//                             </div>
//                             <div className="flex flex-col items-end text-[10px] text-slate-400">
//                               <span>Locs: {c.LocationCount}</span>
//                               <span>Emps: {c.EmployeeCount}</span>
//                             </div>
//                           </div>
//                         </li>
//                       );
//                     })}
//                   </ul>
//                 </div>
//               </div>
//             </div>

//             {/* Location dropdown + context */}
//             <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 md:p-5">
//               <div className="flex flex-col gap-2">
//                 <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
//                   Location (optional)
//                 </p>
//                 {!selectedCompany && (
//                   <p className="text-xs text-slate-500">
//                     Select a company on the left to see its locations. If you
//                     leave location empty, the dashboard will show **all**
//                     locations for that company.
//                   </p>
//                 )}

//                 {selectedCompany && (
//                   <>
//                     <p className="text-xs text-slate-300">
//                       {selectedCompany.Name}
//                     </p>
//                     <select
//                       className="mt-2 h-10 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs outline-none transition focus:border-emerald-400 focus:shadow-[0_0_0_1px_rgba(52,211,153,0.8)]"
//                       value={selectedLocation?.id ?? ""}
//                       onChange={(e) => {
//                         const id = Number(e.target.value);
//                         if (!id) {
//                           setSelectedLocation(null);
//                         } else {
//                           handleSelectLocation(id);
//                         }
//                       }}
//                     >
//                       <option value="">All locations</option>
//                       {locationsQuery.data?.map((loc) => (
//                         <option key={loc.id} value={loc.id}>
//                           {loc.Name} — {loc.City ?? ""} {loc.State ?? ""}
//                         </option>
//                       ))}
//                     </select>

//                     {locationsQuery.isLoading && (
//                       <p className="mt-2 text-[11px] text-slate-500">
//                         Loading locations...
//                       </p>
//                     )}
//                     {locationsQuery.isError && !locationsQuery.isLoading && (
//                       <p className="mt-2 text-[11px] text-rose-400">
//                         {(locationsQuery.error as Error).message}
//                       </p>
//                     )}
//                   </>
//                 )}
//               </div>

//               <div className="border-t border-slate-800 pt-4 text-[11px] text-slate-400">
//                 <p className="font-semibold uppercase tracking-[0.18em] text-slate-500">
//                   Current context
//                 </p>
//                 <ul className="mt-3 space-y-1.5">
//                   <li>
//                     <span className="text-slate-500">Date range: </span>
//                     <span className="text-slate-200">
//                       {from || "—"} → {to || "—"}
//                     </span>
//                   </li>
//                   <li>
//                     <span className="text-slate-500">Company: </span>
//                     <span className="text-slate-200">
//                       {selectedCompany ? selectedCompany.Name : "All companies"}
//                     </span>
//                   </li>
//                   <li>
//                     <span className="text-slate-500">Location: </span>
//                     <span className="text-slate-200">
//                       {selectedLocation
//                         ? `${selectedLocation.Name} — ${
//                             selectedLocation.City ?? ""
//                           } ${selectedLocation.State ?? ""}`
//                         : selectedCompany
//                         ? "All locations for company"
//                         : "All locations"}
//                     </span>
//                   </li>
//                 </ul>
//               </div>
//             </div>
//           </div>
//         </section>

//         {/* 2. Top metrics & pipeline */}
//         <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.75)] md:p-8">
//           <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
//             <StepBadge number={2} title="Counts overview" />
//             <p className="text-xs text-slate-400">
//               These are raw counts from{" "}
//               <span className="font-mono text-slate-200">wotcempcredits</span>{" "}
//               and <span className="font-mono text-slate-200">wotcemployee</span>{" "}
//               for the selected filters.
//             </p>
//           </div>

//           {/* stat cards */}
//           <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
//             <StatCard
//               label="Number screened YTD"
//               value={summary ? formatNumber(summary.screened) : "—"}
//               tone="sky"
//               description="Employees with a hire date in the selected period."
//               loading={creditsSummaryQuery.isLoading}
//             />
//             <StatCard
//               label="Qualified"
//               value={summary ? formatNumber(summary.qualified) : "—"}
//               tone="emerald"
//               description="Credits with sent = 1."
//               loading={creditsSummaryQuery.isLoading}
//             />
//             <StatCard
//               label="Non-qualified"
//               value={summary ? formatNumber(summary.nonQualified) : "—"}
//               tone="slate"
//               description="Credits with sent = 0."
//               loading={creditsSummaryQuery.isLoading}
//             />
//             <StatCard
//               label="Total certs"
//               value={summary ? formatNumber(summary.totalCerts) : "—"}
//               tone="lime"
//               description="CertifiedDate in the selected period."
//               loading={creditsSummaryQuery.isLoading}
//             />
//             <StatCard
//               label="Total denials"
//               value={summary ? formatNumber(summary.totalDenials) : "—"}
//               tone="rose"
//               description="DeniedDate in the selected period."
//               loading={creditsSummaryQuery.isLoading}
//             />
//             <StatCard
//               label="Total pending"
//               value={summary ? formatNumber(summary.totalPending) : "—"}
//               tone="amber"
//               description="DPC = 2 & PendingDate in the selected period."
//               loading={creditsSummaryQuery.isLoading}
//             />
//           </div>

//           {/* pipeline view */}
//           <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
//             <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
//               Flow of credits
//             </p>
//             <p className="mt-2 text-xs text-slate-400">
//               Visual pipeline showing how screened employees flow into qualified
//               / non-qualified, then into certified, denied, and pending buckets.
//             </p>

//             <div className="mt-5 flex flex-col gap-5">
//               {/* Level 1 */}
//               <div className="flex items-center gap-4">
//                 <FlowNode
//                   label="Screened"
//                   value={summary?.screened}
//                   color="sky"
//                 />
//                 <FlowArrow />
//                 <div className="flex flex-1 flex-wrap gap-3">
//                   <FlowNode
//                     label="Qualified (sent = 1)"
//                     value={summary?.qualified}
//                     color="emerald"
//                     size="sm"
//                   />
//                   <FlowNode
//                     label="Non-qualified (sent = 0)"
//                     value={summary?.nonQualified}
//                     color="slate"
//                     size="sm"
//                   />
//                 </div>
//               </div>

//               {/* Level 2 – split from Qualified */}
//               <div className="flex flex-col gap-3 pl-6">
//                 <div className="h-4 w-px bg-slate-700" />
//                 <div className="flex flex-wrap items-center gap-3">
//                   <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
//                     Qualified breakdown
//                   </span>
//                   <FlowArrow small />
//                   <div className="flex flex-wrap gap-3">
//                     <FlowNode
//                       label="Certified"
//                       value={summary?.totalCerts}
//                       color="lime"
//                       size="sm"
//                     />
//                     <FlowNode
//                       label="Denied"
//                       value={summary?.totalDenials}
//                       color="rose"
//                       size="sm"
//                     />
//                     <FlowNode
//                       label="Pending (DPC = 2)"
//                       value={summary?.totalPending}
//                       color="amber"
//                       size="sm"
//                     />
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </section>

//         {/* 3. Math explanation / “pipe” table */}
//         <section className="mb-10 rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.75)] md:p-8">
//           <StepBadge number={3} title="Credits math breakdown" />
//           <p className="mt-3 text-xs text-slate-400">
//             This table mirrors your Excel: it shows how counts from the top are
//             multiplied by average credit and revenue rate to get dollar amounts.
//             Use this to explain the numbers to your CEO.
//           </p>

//           <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/90">
//             <table className="min-w-full text-left text-xs">
//               <thead className="bg-slate-900/95 text-[11px] uppercase tracking-[0.18em] text-slate-400">
//                 <tr>
//                   <th className="px-5 py-3">Metric</th>
//                   <th className="px-5 py-3">Value</th>
//                   <th className="px-5 py-3">Formula</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-800">
//                 {/* counts */}
//                 <MathRow
//                   label="Number screened YTD"
//                   value={summary ? formatNumber(summary.screened) : "—"}
//                   formula="Count of employees with hire date in period."
//                   badge="Count"
//                 />
//                 <MathRow
//                   label="Qualified"
//                   value={summary ? formatNumber(summary.qualified) : "—"}
//                   formula="Credits where sent = 1."
//                   badge="Count"
//                 />
//                 <MathRow
//                   label="Non-qualified"
//                   value={summary ? formatNumber(summary.nonQualified) : "—"}
//                   formula="Credits where sent = 0."
//                   badge="Count"
//                 />
//                 <MathRow
//                   label="Total certs"
//                   value={summary ? formatNumber(summary.totalCerts) : "—"}
//                   formula="Qualified with CertifiedDate in period."
//                   badge="Count"
//                 />
//                 <MathRow
//                   label="Total denials"
//                   value={summary ? formatNumber(summary.totalDenials) : "—"}
//                   formula="Qualified with DeniedDate in period."
//                   badge="Count"
//                 />
//                 <MathRow
//                   label="Total pending"
//                   value={summary ? formatNumber(summary.totalPending) : "—"}
//                   formula="Qualified with DPC = 2 & PendingDate in period."
//                   badge="Count"
//                 />

//                 {/* money rows */}
//                 <MathRow
//                   label="Pending credit"
//                   value={formatMoney(derived.pendingCredit)}
//                   formulaNode={
//                     <FormulaPills
//                       parts={[
//                         { label: "Total pending", color: "amber" },
//                         { label: "× 0.5", color: "slate" },
//                         {
//                           label: `× ${formatMoney(AVERAGE_CREDIT)}`,
//                           color: "emerald",
//                         },
//                       ]}
//                     />
//                   }
//                   badge="Dollars"
//                 />
//                 <MathRow
//                   label="Pending revenue"
//                   value={formatMoney(derived.pendingRevenue)}
//                   formulaNode={
//                     <FormulaPills
//                       parts={[
//                         { label: "Pending credit", color: "sky" },
//                         {
//                           label: `× ${(REVENUE_RATE * 100).toFixed(0)}%`,
//                           color: "slate",
//                         },
//                       ]}
//                     />
//                   }
//                   badge="Dollars"
//                 />
//                 <MathRow
//                   label="Certified credit"
//                   value={formatMoney(derived.certifiedCredit)}
//                   formulaNode={
//                     <FormulaPills
//                       parts={[
//                         { label: "Total certs", color: "lime" },
//                         {
//                           label: `× ${formatMoney(AVERAGE_CREDIT)}`,
//                           color: "emerald",
//                         },
//                       ]}
//                     />
//                   }
//                   badge="Dollars"
//                 />
//                 <MathRow
//                   label="Certified revenue"
//                   value={formatMoney(derived.certifiedRevenue)}
//                   formulaNode={
//                     <FormulaPills
//                       parts={[
//                         { label: "Certified credit", color: "sky" },
//                         {
//                           label: `× ${(REVENUE_RATE * 100).toFixed(0)}%`,
//                           color: "slate",
//                         },
//                       ]}
//                     />
//                   }
//                   badge="Dollars"
//                 />
//                 <MathRow
//                   label="Estimated total"
//                   value={formatMoney(derived.estimatedTotal)}
//                   formulaNode={
//                     <FormulaPills
//                       parts={[
//                         { label: "Pending revenue", color: "amber" },
//                         { label: "+", color: "slate" },
//                         { label: "Certified revenue", color: "lime" },
//                       ]}
//                     />
//                   }
//                   badge="Dollars"
//                   highlight
//                 />
//               </tbody>
//             </table>
//           </div>

//           <p className="mt-4 text-[11px] text-slate-500">
//             You can extend this later to show multiple date columns (like your
//             weekly snapshots) by calling the same{" "}
//             <span className="font-mono text-slate-300">
//               /api/credits/summary
//             </span>{" "}
//             with different date ranges.
//           </p>
//         </section>
//       </div>
//     </main>
//   );
// }

// /* ---------------- small components ---------------- */

// function StepBadge({ number, title }: { number: number; title: string }) {
//   return (
//     <div className="inline-flex items-center gap-3 rounded-full bg-slate-900/80 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
//       <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/20 text-[11px] font-semibold text-sky-300 ring-1 ring-sky-500/60">
//         {number}
//       </span>
//       <span>{title}</span>
//     </div>
//   );
// }

// function StatCard({
//   label,
//   value,
//   description,
//   tone,
//   loading,
// }: {
//   label: string;
//   value: string;
//   description: string;
//   tone: "sky" | "emerald" | "slate" | "lime" | "rose" | "amber";
//   loading?: boolean;
// }) {
//   const colorMap: Record<
//     typeof tone,
//     { ring: string; bg: string; text: string }
//   > = {
//     sky: {
//       ring: "ring-sky-500/60",
//       bg: "bg-sky-500/10",
//       text: "text-sky-100",
//     },
//     emerald: {
//       ring: "ring-emerald-500/60",
//       bg: "bg-emerald-500/10",
//       text: "text-emerald-100",
//     },
//     slate: {
//       ring: "ring-slate-500/60",
//       bg: "bg-slate-700/30",
//       text: "text-slate-100",
//     },
//     lime: {
//       ring: "ring-lime-400/60",
//       bg: "bg-lime-400/10",
//       text: "text-lime-100",
//     },
//     rose: {
//       ring: "ring-rose-500/60",
//       bg: "bg-rose-500/10",
//       text: "text-rose-100",
//     },
//     amber: {
//       ring: "ring-amber-400/60",
//       bg: "bg-amber-400/10",
//       text: "text-amber-100",
//     },
//   };

//   const c = colorMap[tone];

//   return (
//     <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
//       <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
//         {label}
//       </p>
//       <div className="mt-3 inline-flex items-baseline gap-2">
//         <span
//           className={[
//             "inline-flex items-center rounded-xl px-3 py-1.5 text-sm font-semibold",
//             c.bg,
//             c.text,
//             c.ring,
//             "ring-1",
//           ].join(" ")}
//         >
//           {loading ? "…" : value}
//         </span>
//       </div>
//       <p className="mt-2 text-[11px] text-slate-500">{description}</p>
//     </div>
//   );
// }

// function FlowNode({
//   label,
//   value,
//   color,
//   size = "md",
// }: {
//   label: string;
//   value?: number;
//   color: "sky" | "emerald" | "slate" | "lime" | "rose" | "amber";
//   size?: "md" | "sm";
// }) {
//   const colorMap: Record<
//     typeof color,
//     { border: string; bg: string; text: string }
//   > = {
//     sky: {
//       border: "border-sky-500/60",
//       bg: "bg-sky-500/10",
//       text: "text-sky-100",
//     },
//     emerald: {
//       border: "border-emerald-500/60",
//       bg: "bg-emerald-500/10",
//       text: "text-emerald-100",
//     },
//     slate: {
//       border: "border-slate-600/80",
//       bg: "bg-slate-700/30",
//       text: "text-slate-100",
//     },
//     lime: {
//       border: "border-lime-400/70",
//       bg: "bg-lime-400/10",
//       text: "text-lime-100",
//     },
//     rose: {
//       border: "border-rose-500/70",
//       bg: "bg-rose-500/10",
//       text: "text-rose-100",
//     },
//     amber: {
//       border: "border-amber-400/70",
//       bg: "bg-amber-400/10",
//       text: "text-amber-100",
//     },
//   };

//   const c = colorMap[color];
//   const pad = size === "md" ? "px-4 py-3" : "px-3 py-2";

//   return (
//     <div
//       className={[
//         "inline-flex min-w-[160px] flex-col rounded-2xl border bg-slate-950/90",
//         c.border,
//         c.bg,
//         pad,
//       ].join(" ")}
//     >
//       <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
//         {label}
//       </span>
//       <span className={["mt-2 text-sm font-semibold", c.text].join(" ")}>
//         {value != null ? formatNumber(value) : "—"}
//       </span>
//     </div>
//   );
// }

// function FlowArrow({ small }: { small?: boolean }) {
//   return (
//     <div
//       className={[
//         "flex items-center justify-center text-slate-500",
//         small ? "text-xs" : "text-sm",
//       ].join(" ")}
//     >
//       <span className="inline-block rounded-full border border-slate-700 px-2 py-1">
//         →
//       </span>
//     </div>
//   );
// }

// function FormulaPills({
//   parts,
// }: {
//   parts: {
//     label: string;
//     color: "amber" | "emerald" | "sky" | "slate" | "lime";
//   }[];
// }) {
//   const colorMap: Record<
//     "amber" | "emerald" | "sky" | "slate" | "lime",
//     { bg: string; text: string }
//   > = {
//     amber: { bg: "bg-amber-500/15", text: "text-amber-200" },
//     emerald: { bg: "bg-emerald-500/15", text: "text-emerald-200" },
//     sky: { bg: "bg-sky-500/15", text: "text-sky-200" },
//     slate: { bg: "bg-slate-700/50", text: "text-slate-200" },
//     lime: { bg: "bg-lime-400/15", text: "text-lime-100" },
//   };

//   return (
//     <div className="flex flex-wrap gap-1.5">
//       {parts.map((p, idx) => {
//         const c = colorMap[p.color];
//         return (
//           <span
//             key={`${p.label}-${idx}`}
//             className={[
//               "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-medium",
//               c.bg,
//               c.text,
//             ].join(" ")}
//           >
//             {p.label}
//           </span>
//         );
//       })}
//     </div>
//   );
// }

// function MathRow({
//   label,
//   value,
//   formula,
//   formulaNode,
//   badge,
//   highlight,
// }: {
//   label: string;
//   value: string;
//   formula?: string;
//   formulaNode?: React.ReactNode;
//   badge: string;
//   highlight?: boolean;
// }) {
//   return (
//     <tr
//       className={
//         highlight ? "bg-emerald-500/5" : "hover:bg-slate-900/70 transition"
//       }
//     >
//       <td className="px-5 py-3 align-top">
//         <div className="flex flex-col gap-1">
//           <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
//             {label}
//           </span>
//           <span className="inline-flex w-fit rounded-full border border-slate-700 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-400">
//             {badge}
//           </span>
//         </div>
//       </td>
//       <td className="px-5 py-3 align-top text-sm font-semibold text-slate-50">
//         {value}
//       </td>
//       <td className="px-5 py-3 align-top text-[11px] text-slate-300">
//         {formulaNode ?? formula}
//       </td>
//     </tr>
//   );
// }

"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import type {
  CompanySummary,
  LocationSummary,
  CreditsSummary,
  CreditEmployee,
  LocationSearchResult,
  PaginatedResult,
} from "@/app/lib/types";
import { nanoid } from "nanoid";
import { AVERAGE_CREDIT, REVENUE_RATE } from "@/app/lib/credits";

/* ---------------- helpers ---------------- */

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

function formatNumber(n: number | null | undefined): string {
  if (!n || Number.isNaN(n)) return "0";
  return n.toLocaleString("en-US");
}

function formatMoney(n: number | null | undefined): string {
  if (!n || Number.isNaN(n)) return "$0.00";
  return `$${n.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
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

type EmployeeMetric =
  | "screened"
  | "qualified"
  | "nonQualified"
  | "certs"
  | "denials"
  | "pending";

async function fetchEmployeesForMetric(
  metric: EmployeeMetric,
  {
    from,
    to,
    customerId,
    locationId,
    limit = 200,
  }: {
    from: string;
    to: string;
    customerId?: number | null;
    locationId?: number | null;
    limit?: number;
  }
): Promise<CreditEmployee[]> {
  const params = new URLSearchParams();
  params.set("metric", metric);
  params.set("from", from);
  params.set("to", to);
  if (customerId) params.set("customerId", String(customerId));
  if (locationId) params.set("locationId", String(locationId));
  if (limit) params.set("limit", String(limit));
  return fetchJSON<CreditEmployee[]>(
    `/api/credits/employees?${params.toString()}`
  );
}

/* ---------------- main page ---------------- */

export default function CreditsPage() {
  const [from, setFrom] = useState(startOfYearStr());
  const [to, setTo] = useState(todayStr());

  // company search + selection
  const [companySearchInput, setCompanySearchInput] = useState("");
  const [companySearchQuery, setCompanySearchQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<CompanySummary | null>(
    null
  );
  const [companyPage, setCompanyPage] = useState(1);
  const [companyPageSize, setCompanyPageSize] = useState(10);

  // location selection
  const [selectedLocation, setSelectedLocation] =
    useState<LocationSummary | null>(null);

  // locations for selected company (pagination)
  const [locationPage, setLocationPage] = useState(1);
  const locationPageSize = 10;

  // global location search (across all companies)
  const [locationSearchInput, setLocationSearchInput] = useState("");
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [locationSearchPage, setLocationSearchPage] = useState(1);
  const locationSearchPageSize = 10;

  // which metric row is expanded for "see more"
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  /* ----- queries ----- */

  const companiesQuery = useQuery<PaginatedResult<CompanySummary>>({
    queryKey: [
      "credits-companies",
      companySearchQuery,
      companyPage,
      companyPageSize,
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("page", String(companyPage));
      params.set("pageSize", String(companyPageSize));
      if (companySearchQuery) {
        params.set("q", companySearchQuery);
      }
      return fetchJSON<PaginatedResult<CompanySummary>>(
        `/api/companies?${params.toString()}`
      );
    },
    staleTime: 5 * 60_000,
  });

  const locationsQuery = useQuery<PaginatedResult<LocationSummary>>({
    queryKey: [
      "credits-locations",
      selectedCompany?.CustomerID,
      locationPage,
      locationPageSize,
    ],
    queryFn: () =>
      fetchJSON<PaginatedResult<LocationSummary>>(
        `/api/companies/${
          selectedCompany!.CustomerID
        }/locations?page=${locationPage}&pageSize=${locationPageSize}`
      ),
    enabled: !!selectedCompany,
    staleTime: 5 * 60_000,
  });

  const globalLocationsQuery = useQuery<PaginatedResult<LocationSearchResult>>({
    queryKey: [
      "credits-locations-global",
      locationSearchQuery,
      locationSearchPage,
      locationSearchPageSize,
    ],
    queryFn: () =>
      fetchJSON<PaginatedResult<LocationSearchResult>>(
        `/api/locations?page=${locationSearchPage}&pageSize=${locationSearchPageSize}&q=${encodeURIComponent(
          locationSearchQuery
        )}`
      ),
    enabled: Boolean(locationSearchQuery),
    staleTime: 5 * 60_000,
  });

  const creditsSummaryQuery = useQuery<CreditsSummary>({
    queryKey: [
      "credits-summary",
      from,
      to,
      selectedCompany?.CustomerID ?? null,
      selectedLocation?.id ?? null,
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("from", from);
      params.set("to", to);
      if (selectedCompany)
        params.set("customerId", String(selectedCompany.CustomerID));
      if (selectedLocation)
        params.set("locationId", String(selectedLocation.id));
      return fetchJSON<CreditsSummary>(
        `/api/credits/summary?${params.toString()}`
      );
    },
    enabled: Boolean(from && to),
    staleTime: 60_000,
  });

  /* ----- derived metrics ----- */

  const derived = useMemo(() => {
    const base = creditsSummaryQuery.data;
    if (!base) {
      return {
        pendingCredit: 0,
        pendingRevenue: 0,
        certifiedCredit: 0,
        certifiedRevenue: 0,
        estimatedTotal: 0,
      };
    }

    const pendingCredit = base.totalPending * 0.5 * AVERAGE_CREDIT;
    const pendingRevenue = pendingCredit * REVENUE_RATE;

    const certifiedCredit = base.totalCerts * AVERAGE_CREDIT;
    const certifiedRevenue = certifiedCredit * REVENUE_RATE;

    const estimatedTotal = pendingRevenue + certifiedRevenue;

    return {
      pendingCredit,
      pendingRevenue,
      certifiedCredit,
      certifiedRevenue,
      estimatedTotal,
    };
  }, [creditsSummaryQuery.data]);

  const summary = creditsSummaryQuery.data;

  /* ----- handlers ----- */

  const handleCompanySearch = () => {
    setCompanyPage(1);
    setCompanySearchQuery(companySearchInput.trim());
  };

  const handleSelectCompany = (c: CompanySummary) => {
    setSelectedCompany(c);
    setSelectedLocation(null);
    setLocationPage(1);
  };

  const handleSelectLocation = (locId: number) => {
    const list = locationsQuery.data?.items ?? [];
    const found = list.find((l) => l.id === locId) ?? null;
    setSelectedLocation(found);
  };

  const handleGlobalLocationSearch = () => {
    setLocationSearchPage(1);
    setLocationSearchQuery(locationSearchInput.trim());
  };

  const handleSelectLocationGlobal = (r: LocationSearchResult) => {
    setSelectedCompany({
      CustomerID: r.CustomerID,
      Name: r.CompanyName,
      LocationCount: 0,
      EmployeeCount: r.EmployeeCount,
    });
    setSelectedLocation({
      id: r.id,
      Name: r.Name,
      City: r.City,
      State: r.State,
      Zip: r.Zip,
      latitude: r.latitude,
      longitude: r.longitude,
      EmployeeCount: r.EmployeeCount,
      TotalWages: 0,
      TotalHours: 0,
    });
    setLocationPage(1);
  };

  /* ---------------- metric rows data ---------------- */

  const tableRows: {
    key: string;
    label: string;
    value: string;
    employeeMetric?: EmployeeMetric; // rows with list
  }[] = [
    {
      key: "screened",
      label: "Number screened YTD",
      value: summary ? formatNumber(summary.screened) : "—",
      employeeMetric: "screened",
    },
    {
      key: "qualified",
      label: "Qualified",
      value: summary ? formatNumber(summary.qualified) : "—",
      employeeMetric: "qualified",
    },
    {
      key: "nonQualified",
      label: "Non-qualified",
      value: summary ? formatNumber(summary.nonQualified) : "—",
      employeeMetric: "nonQualified",
    },
    {
      key: "totalCerts",
      label: "Total certs",
      value: summary ? formatNumber(summary.totalCerts) : "—",
      employeeMetric: "certs",
    },
    {
      key: "totalDenials",
      label: "Total denials",
      value: summary ? formatNumber(summary.totalDenials) : "—",
      employeeMetric: "denials",
    },
    {
      key: "totalPending",
      label: "Total pending",
      value: summary ? formatNumber(summary.totalPending) : "—",
      employeeMetric: "pending",
    },

    // 💵 Amount rows – NO employeeMetric here, so no "See more"
    {
      key: "pendingCredit",
      label: "Pending credit",
      value: formatMoney(derived.pendingCredit),
    },
    {
      key: "pendingRevenue",
      label: "Pending revenue",
      value: formatMoney(derived.pendingRevenue),
    },
    {
      key: "certifiedCredit",
      label: "Certified credit",
      value: formatMoney(derived.certifiedCredit),
    },
    {
      key: "certifiedRevenue",
      label: "Certified revenue",
      value: formatMoney(derived.certifiedRevenue),
    },
    {
      key: "estimatedTotal",
      label: "Estimated total",
      value: formatMoney(derived.estimatedTotal),
    },
  ];

  /* ---------------- UI ---------------- */

  const companiesData = companiesQuery.data?.items ?? [];

  const companyColumns: ColumnDef<CompanySummary>[] = useMemo(
    () => [
      {
        accessorKey: "Name",
        header: "Company",
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-slate-50">{c.Name}</span>
              <span className="text-[11px] text-slate-400">
                ID: {c.CustomerID}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "LocationCount",
        header: () => <span className="block text-right">Locations</span>,
        cell: ({ row }) => (
          <span className="block text-right text-slate-300">
            {row.original.LocationCount}
          </span>
        ),
      },
      {
        accessorKey: "EmployeeCount",
        header: () => <span className="block text-right">Employees</span>,
        cell: ({ row }) => (
          <span className="block text-right text-slate-200">
            {row.original.EmployeeCount}
          </span>
        ),
      },
      {
        id: "download",
        header: () => <span className="block text-right">Download</span>,
        cell: ({ row }) => {
          const params = new URLSearchParams();
          if (from) params.set("from", from);
          if (to) params.set("to", to);
          params.set("customerId", String(row.original.CustomerID));
          const href = `/api/credits/companies/export?${params.toString()}`;
          return (
            <a
              href={href}
              onClick={(e) => e.stopPropagation()}
              className="block text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-300 hover:text-sky-200"
            >
              Download Excel
            </a>
          );
        },
      },
    ],
    [from, to]
  );

  const companyTable = useReactTable({
    data: companiesData,
    columns: companyColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: companiesQuery.data
      ? Math.ceil(companiesQuery.data.total / companiesQuery.data.pageSize)
      : -1,
    state: {
      pagination: {
        pageIndex: companyPage - 1,
        pageSize: companyPageSize,
      },
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({
              pageIndex: companyPage - 1,
              pageSize: companyPageSize,
            })
          : updater;
      setCompanyPage(next.pageIndex + 1);
      setCompanyPageSize(next.pageSize);
    },
  });

  const creditsExportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (selectedCompany) {
      params.set("customerId", String(selectedCompany.CustomerID));
    }
    if (selectedLocation) {
      params.set("locationId", String(selectedLocation.id));
    }
    return `/api/credits/export?${params.toString()}`;
  }, [from, to, selectedCompany, selectedLocation]);

  const companiesExportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (companySearchQuery) params.set("q", companySearchQuery);
    if (selectedLocation) {
      params.set("locationId", String(selectedLocation.id));
    } else if (selectedCompany) {
      params.set("customerId", String(selectedCompany.CustomerID));
    }
    return `/api/credits/companies/export?${params.toString()}`;
  }, [from, to, companySearchQuery, selectedCompany, selectedLocation]);

  const locationsExportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (selectedCompany) {
      params.set("customerId", String(selectedCompany.CustomerID));
    }
    if (selectedLocation) {
      params.set("locationId", String(selectedLocation.id));
    }
    return `/api/credits/locations/export?${params.toString()}`;
  }, [from, to, selectedCompany, selectedLocation]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-50 sm:px-8 lg:px-14">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl flex-col gap-4 pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-400">
            WOTC Credits Monitoring
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Credits Dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-400">
            Filter by time period, company, and location. Inspect each metric,
            and drill into the exact employees behind it.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 text-xs md:items-end">
          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 font-medium text-slate-300">
            Average credit:&nbsp;
            <span className="font-semibold text-emerald-400">
              {formatMoney(AVERAGE_CREDIT)}
            </span>
          </span>
          <span className="text-[11px] text-slate-500">
            Revenue share: {(REVENUE_RATE * 100).toFixed(0)}%
          </span>
          <a
            href={creditsExportHref}
            className="mt-1 inline-flex h-9 items-center justify-center rounded-full border border-sky-500 bg-sky-500/15 px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-50 shadow-[0_0_18px_rgba(56,189,248,0.45)] transition hover:bg-sky-500/30"
          >
            Download Excel
          </a>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        {/* Step 1: Filters */}
        <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 p-6 shadow-[0_22px_70px_rgba(15,23,42,0.75)] md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <StepBadge number={1} title="Filters" />
            <p className="text-xs text-slate-400">
              Choose a date range, company, and optional location. All metrics
              and employee lists are calculated from these filters.
            </p>
          </div>

          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)]">
            {/* Date + company search */}
            <div className="space-y-6">
              {/* Date range */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Time period
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                      From
                    </label>
                    <input
                      type="date"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className="h-10 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-slate-100 outline-none ring-0 transition focus:border-sky-400 focus:shadow-[0_0_0_1px_rgba(56,189,248,0.7)]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                      To
                    </label>
                    <input
                      type="date"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="h-10 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-slate-100 outline-none ring-0 transition focus:border-sky-400 focus:shadow-[0_0_0_1px_rgba(56,189,248,0.7)]"
                    />
                  </div>
                </div>
              </div>

              {/* Company search & list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Companies
                  </p>
                  <a
                    href={companiesExportHref}
                    className="inline-flex h-8 items-center justify-center rounded-full border border-sky-500 bg-sky-500/10 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-100 shadow-[0_0_14px_rgba(56,189,248,0.35)] transition hover:bg-sky-500/25"
                  >
                    Download Excel
                  </a>
                </div>
                <div className="flex gap-2">
                  <input
                    value={companySearchInput}
                    onChange={(e) => setCompanySearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCompanySearch();
                    }}
                    placeholder="Search company name..."
                    className="h-10 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs outline-none transition focus:border-sky-400 focus:shadow-[0_0_0_1px_rgba(56,189,248,0.7)]"
                  />
                  <button
                    type="button"
                    onClick={handleCompanySearch}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-sky-500 bg-sky-500/20 px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-50 shadow-[0_0_18px_rgba(56,189,248,0.45)] transition hover:bg-sky-500/30"
                  >
                    Search
                  </button>
                </div>

                <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/80">
                  <table className="min-w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-900/95 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                      {companyTable.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <th
                              key={header.id}
                              className={
                                header.column.id === "LocationCount" ||
                                header.column.id === "EmployeeCount" ||
                                header.column.id === "download"
                                  ? "px-4 py-2 text-right"
                                  : "px-4 py-2"
                              }
                            >
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {companiesQuery.isLoading && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-4 text-center text-xs text-slate-500"
                          >
                            Loading companies...
                          </td>
                        </tr>
                      )}
                      {companiesQuery.isError && !companiesQuery.isLoading && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-4 text-center text-xs text-rose-400"
                          >
                            {(companiesQuery.error as Error).message}
                          </td>
                        </tr>
                      )}
                      {!companiesQuery.isLoading &&
                        !companiesQuery.isError &&
                        companiesData.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-4 py-4 text-center text-xs text-slate-500"
                            >
                              No companies found.
                            </td>
                          </tr>
                        )}
                      {companyTable.getRowModel().rows.map((row) => {
                        const c = row.original;
                        const active =
                          selectedCompany?.CustomerID === c.CustomerID;
                        return (
                          <tr
                            key={row.id}
                            onClick={() => handleSelectCompany(c)}
                            className={[
                              "cursor-pointer border-t border-slate-800 text-[13px] transition",
                              active
                                ? "bg-sky-500/10 hover:bg-sky-500/15"
                                : "hover:bg-slate-900",
                            ].join(" ")}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <td
                                key={cell.id}
                                className={
                                  cell.column.id === "LocationCount" ||
                                  cell.column.id === "EmployeeCount" ||
                                  cell.column.id === "download"
                                    ? "px-4 py-3 text-right"
                                    : "px-4 py-3"
                                }
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {companiesQuery.data && (
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      Page {companiesQuery.data.page} of{" "}
                      {Math.max(
                        1,
                        Math.ceil(
                          companiesQuery.data.total /
                            companiesQuery.data.pageSize
                        )
                      )}
                    </span>
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCompanyPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={companyPage <= 1}
                        className="rounded-full border border-slate-700 px-3 py-1 text-[11px] uppercase tracking-[0.16em] disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompanyPage((prev) => prev + 1)}
                        disabled={
                          companiesQuery.data.page *
                            companiesQuery.data.pageSize >=
                          companiesQuery.data.total
                        }
                        className="rounded-full border border-slate-700 px-3 py-1 text-[11px] uppercase tracking-[0.16em] disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Locations + global location search */}
            <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 md:p-5">
              {/* Locations for selected company */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Locations for company
                  </p>
                  <a
                    href={locationsExportHref}
                    className="inline-flex h-8 items-center justify-center rounded-full border border-emerald-500 bg-emerald-500/10 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100 shadow-[0_0_14px_rgba(52,211,153,0.35)] transition hover:bg-emerald-500/25"
                  >
                    Download Excel
                  </a>
                </div>
                {!selectedCompany && (
                  <p className="text-xs text-slate-500">
                    Select a company on the left to see its locations. Leaving
                    location unselected will include all locations for that
                    company.
                  </p>
                )}
                {selectedCompany && (
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950">
                    <table className="min-w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-900/95 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                        <tr>
                          <th className="px-3 py-2">Location</th>
                          <th className="px-3 py-2">City</th>
                          <th className="px-3 py-2">State</th>
                          <th className="px-3 py-2 text-right">Employees</th>
                        </tr>
                      </thead>
                      <tbody>
                        {locationsQuery.isLoading && (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-4 text-center text-xs text-slate-500"
                            >
                              Loading locations...
                            </td>
                          </tr>
                        )}
                        {locationsQuery.isError &&
                          !locationsQuery.isLoading && (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-3 py-4 text-center text-xs text-rose-400"
                              >
                                {(locationsQuery.error as Error).message}
                              </td>
                            </tr>
                          )}
                        {locationsQuery.data &&
                          locationsQuery.data.items.length === 0 &&
                          !locationsQuery.isLoading && (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-3 py-4 text-center text-xs text-slate-500"
                              >
                                No locations found for this company.
                              </td>
                            </tr>
                          )}
                        {locationsQuery.data?.items.map((loc) => {
                          const active = selectedLocation?.id === loc.id;
                          return (
                            <tr
                              key={loc.id}
                              onClick={() => handleSelectLocation(loc.id)}
                              className={[
                                "cursor-pointer border-t border-slate-800 text-[13px] transition",
                                active
                                  ? "bg-emerald-500/10 hover:bg-emerald-500/15"
                                  : "hover:bg-slate-900",
                              ].join(" ")}
                            >
                              <td className="px-3 py-2">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-medium text-slate-50">
                                    {loc.Name}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    ID: {loc.id}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-slate-300">
                                {loc.City}
                              </td>
                              <td className="px-3 py-2 text-slate-300">
                                {loc.State}
                              </td>
                              <td className="px-3 py-2 text-right text-slate-50">
                                {loc.EmployeeCount}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {locationsQuery.data && selectedCompany && (
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      Page {locationsQuery.data.page} of{" "}
                      {Math.max(
                        1,
                        Math.ceil(
                          locationsQuery.data.total /
                            locationsQuery.data.pageSize
                        )
                      )}
                    </span>
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setLocationPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={locationPage <= 1}
                        className="rounded-full border border-slate-700 px-3 py-1 text-[11px] uppercase tracking-[0.16em] disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocationPage((prev) => prev + 1)}
                        disabled={
                          locationsQuery.data.page *
                            locationsQuery.data.pageSize >=
                          locationsQuery.data.total
                        }
                        className="rounded-full border border-slate-700 px-3 py-1 text-[11px] uppercase tracking-[0.16em] disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Global location search */}
              <div className="border-t border-slate-800 pt-4 text-[11px] text-slate-400">
                <p className="font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Search by location (all companies)
                </p>
                <div className="mt-3 flex gap-2">
                  <input
                    value={locationSearchInput}
                    onChange={(e) => setLocationSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleGlobalLocationSearch();
                    }}
                    placeholder="Search by location name, city, or ZIP..."
                    className="h-9 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs outline-none transition focus:border-emerald-400 focus:shadow-[0_0_0_1px_rgba(52,211,153,0.7)]"
                  />
                  <button
                    type="button"
                    onClick={handleGlobalLocationSearch}
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-emerald-500 bg-emerald-500/20 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-50 shadow-[0_0_14px_rgba(52,211,153,0.45)] transition hover:bg-emerald-500/30"
                  >
                    Search
                  </button>
                </div>

                <div className="mt-3 max-h-40 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950">
                  <table className="min-w-full text-left text-[11px]">
                    <thead className="sticky top-0 bg-slate-900/95 text-[10px] uppercase tracking-[0.16em] text-slate-400">
                      <tr>
                        <th className="px-3 py-2">Location</th>
                        <th className="px-3 py-2">City / State</th>
                        <th className="px-3 py-2">Company</th>
                        <th className="px-3 py-2 text-right">Employees</th>
                      </tr>
                    </thead>
                    <tbody>
                      {globalLocationsQuery.isLoading &&
                        locationSearchQuery && (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-3 text-center text-[11px] text-slate-500"
                            >
                              Searching locations...
                            </td>
                          </tr>
                        )}
                      {globalLocationsQuery.isError &&
                        !globalLocationsQuery.isLoading && (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-3 text-center text-[11px] text-rose-400"
                            >
                              {(globalLocationsQuery.error as Error).message}
                            </td>
                          </tr>
                        )}
                      {!globalLocationsQuery.isLoading &&
                        globalLocationsQuery.data &&
                        globalLocationsQuery.data.items.length === 0 &&
                        locationSearchQuery && (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-3 text-center text-[11px] text-slate-500"
                            >
                              No locations found.
                            </td>
                          </tr>
                        )}
                      {globalLocationsQuery.data?.items.map((r) => {
                        const active =
                          selectedLocation?.id === r.id &&
                          selectedCompany?.CustomerID === r.CustomerID;
                        return (
                          <tr
                            key={r.id}
                            onClick={() => handleSelectLocationGlobal(r)}
                            className={[
                              "cursor-pointer border-t border-slate-800 text-[11px] transition",
                              active
                                ? "bg-emerald-500/10 hover:bg-emerald-500/15"
                                : "hover:bg-slate-900",
                            ].join(" ")}
                          >
                            <td className="px-3 py-2 text-slate-50">
                              {r.Name}
                            </td>
                            <td className="px-3 py-2 text-slate-300">
                              {r.City}, {r.State}
                            </td>
                            <td className="px-3 py-2 text-slate-300">
                              {r.CompanyName}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-200">
                              {r.EmployeeCount}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 flex flex-col gap-2 text-[11px] text-slate-400">
                  <div>
                    <p className="font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Current context
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      <li>
                        <span className="text-slate-500">Date range: </span>
                        <span className="text-slate-200">
                          {from || "—"} → {to || "—"}
                        </span>
                      </li>
                      <li>
                        <span className="text-slate-500">Company: </span>
                        <span className="text-slate-200">
                          {selectedCompany
                            ? selectedCompany.Name
                            : "All companies"}
                        </span>
                      </li>
                      <li>
                        <span className="text-slate-500">Location: </span>
                        <span className="text-slate-200">
                          {selectedLocation
                            ? `${selectedLocation.Name} — ${
                                selectedLocation.City ?? ""
                              } ${selectedLocation.State ?? ""}`
                            : selectedCompany
                            ? "All locations for company"
                            : "All locations"}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Step 2: Table with see more / see less */}
        <section className="mb-10 rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.75)] md:p-8">
          <StepBadge number={2} title="Credits breakdown" />
          <p className="mt-3 text-xs text-slate-400">
            Metric view with drill-down. Use “See more” to open a list of the
            employees that make up each count/value.
          </p>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/90">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-900/95 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                <tr>
                  <th className="px-5 py-3">Metric</th>
                  <th className="px-5 py-3">Value</th>
                  <th className="px-5 py-3 w-[140px]">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {tableRows.map((row) => {
                  const isExpanded = expandedMetric === row.key;
                  const canDrill = !!row.employeeMetric;

                  return (
                    <React.Fragment key={row.key}>
                      <tr
                        className={
                          isExpanded
                            ? "bg-slate-900/80"
                            : "hover:bg-slate-900/60 transition"
                        }
                      >
                        <td className="px-5 py-3 align-top">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                            {row.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 align-top text-sm font-semibold text-slate-50">
                          {row.value}
                        </td>
                        <td className="px-5 py-3 align-top">
                          {canDrill ? (
                            <div className="flex flex-col gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedMetric(isExpanded ? null : row.key)
                                }
                                className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200 transition hover:border-sky-400 hover:text-sky-200"
                              >
                                {isExpanded ? "See less" : "See more"}
                                <span
                                  className={[
                                    "transition-transform",
                                    isExpanded ? "rotate-180" : "",
                                  ].join(" ")}
                                >
                                  ▾
                                </span>
                              </button>
                              {row.employeeMetric && (
                                <a
                                  href={(() => {
                                    const params = new URLSearchParams();
                                    params.set(
                                      "metric",
                                      row.employeeMetric as EmployeeMetric
                                    );
                                    if (from) params.set("from", from);
                                    if (to) params.set("to", to);
                                    if (selectedCompany) {
                                      params.set(
                                        "customerId",
                                        String(selectedCompany.CustomerID)
                                      );
                                    }
                                    if (selectedLocation) {
                                      params.set(
                                        "locationId",
                                        String(selectedLocation.id)
                                      );
                                    }
                                    return `/api/credits/employees/export?${params.toString()}`;
                                  })()}
                                  className="inline-flex h-7 items-center justify-center rounded-full border border-sky-500 bg-sky-500/10 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-100 hover:bg-sky-500/25"
                                >
                                  Download Excel
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              –
                            </span>
                          )}
                        </td>
                      </tr>

                      {row.employeeMetric && (
                        <EmployeesExpandableRow
                          isExpanded={isExpanded}
                          metric={row.employeeMetric}
                          from={from}
                          to={to}
                          customerId={selectedCompany?.CustomerID ?? null}
                          locationId={selectedLocation?.id ?? null}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-[11px] text-slate-500">
            Note: lists are limited (default 200 employees per metric) to keep
            things fast. We can add pagination later if needed.
          </p>
        </section>
      </div>
    </main>
  );
}

/* ---------------- sub components ---------------- */

function StepBadge({ number, title }: { number: number; title: string }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full bg-slate-900/80 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/20 text-[11px] font-semibold text-sky-300 ring-1 ring-sky-500/60">
        {number}
      </span>
      <span>{title}</span>
    </div>
  );
}

function EmployeesExpandableRow({
  isExpanded,
  metric,
  from,
  to,
  customerId,
  locationId,
}: {
  isExpanded: boolean;
  metric: EmployeeMetric;
  from: string;
  to: string;
  customerId: number | null;
  locationId: number | null;
}) {
  const router = useRouter();

  const employeesQuery = useQuery<CreditEmployee[]>({
    queryKey: [
      "credits-employees",
      metric,
      from,
      to,
      customerId ?? null,
      locationId ?? null,
    ],
    queryFn: () =>
      fetchEmployeesForMetric(metric, {
        from,
        to,
        customerId: customerId ?? undefined,
        locationId: locationId ?? undefined,
        limit: 200,
      }),
    enabled: isExpanded && Boolean(from && to),
    staleTime: 60_000,
  });

  const containerClasses = [
    "transition-all duration-250 ease-out grid",
    isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
  ].join(" ");

  return (
    <tr>
      <td colSpan={3} className="px-5 pb-4 pt-0">
        <div className={containerClasses}>
          <div className="overflow-hidden">
            <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950">
              {employeesQuery.isLoading && (
                <p className="px-4 py-3 text-[11px] text-slate-500">
                  Loading employees...
                </p>
              )}
              {employeesQuery.isError && !employeesQuery.isLoading && (
                <p className="px-4 py-3 text-[11px] text-rose-400">
                  {(employeesQuery.error as Error).message}
                </p>
              )}
              {employeesQuery.data &&
                employeesQuery.data.length === 0 &&
                !employeesQuery.isLoading && (
                  <p className="px-4 py-3 text-[11px] text-slate-500">
                    No employees found for this metric and filters.
                  </p>
                )}

              {employeesQuery.data && employeesQuery.data.length > 0 && (
                <ul className="divide-y divide-slate-800 text-xs">
                  {employeesQuery.data.map((e) => (
                    <li key={nanoid()}>
                      <button
                        type="button"
                        onClick={() => router.push(`/employees/${e.id}`)}
                        className="flex w-full items-center justify-between gap-4 px-4 py-2.5 text-left hover:bg-slate-900/80"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-slate-50">
                            {e.FirstName} {e.LastName}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            ID: {e.id}
                            {e.SSN ? ` • SSN: ${e.SSN}` : ""}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 text-[11px] text-slate-400">
                          <span>Hire: {e.datehired}</span>
                          <span>
                            {(e.LocationName ?? `Loc ${e.LocationID}`) +
                              (e.City || e.State
                                ? ` — ${e.City ?? ""} ${e.State ?? ""}`
                                : "")}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
