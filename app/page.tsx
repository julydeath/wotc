"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  CompanySummary,
  LocationSummary,
  LocationSearchResult,
  EmployeeSummary,
  CompanyRecord,
  EmployeeRecord,
  EmployeeWage,
} from "@/app/lib/types";

/* ---------- small helper ---------- */

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    let message = "Request failed";
    try {
      const text = await res.text();
      message = text || message;
    } catch {}
    throw new Error(message);
  }
  return res.json();
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return JSON.stringify(value);
}

/* ---------- main page ---------- */

export default function CompanyFlowPage() {
  // Entry mode: search by company or by location
  const [entryMode, setEntryMode] = useState<"company" | "location">("company");

  // selected ids
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    null
  );
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    null
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(
    null
  );

  // summary objects (for quick access from tables)
  const [selectedCompanySummary, setSelectedCompanySummary] =
    useState<CompanySummary | null>(null);
  const [selectedLocationSummary, setSelectedLocationSummary] =
    useState<LocationSummary | null>(null);
  const [selectedEmployeeSummary, setSelectedEmployeeSummary] =
    useState<EmployeeSummary | null>(null);

  /* ------- search states ------- */

  // Step 1 — company search
  const [companySearchInput, setCompanySearchInput] = useState("");
  const [companySearchQuery, setCompanySearchQuery] = useState("");

  // Step 1 (alt) — global location search
  const [locationGlobalInput, setLocationGlobalInput] = useState("");
  const [locationGlobalQuery, setLocationGlobalQuery] = useState("");

  // Step 2 — filter locations for the selected company
  const [locationFilterInput, setLocationFilterInput] = useState("");
  const [locationFilterQuery, setLocationFilterQuery] = useState("");

  // Step 3 — filter employees for the selected location
  const [employeeFilterInput, setEmployeeFilterInput] = useState("");
  const [employeeFilterQuery, setEmployeeFilterQuery] = useState("");

  /* ------- company list query ------- */

  const companiesQuery = useQuery<CompanySummary[]>({
    queryKey: ["companies", companySearchQuery],
    queryFn: () =>
      fetchJSON<CompanySummary[]>(
        companySearchQuery
          ? `/api/companies?q=${encodeURIComponent(companySearchQuery)}`
          : "/api/companies"
      ),
    staleTime: 60_000,
  });

  /* ------- company full details ------- */

  const companyDetailsQuery = useQuery<CompanyRecord | null>({
    queryKey: ["company-details", selectedCompanyId],
    queryFn: () =>
      fetchJSON<CompanyRecord | null>(`/api/companies/${selectedCompanyId}`),
    enabled: !!selectedCompanyId,
    staleTime: 300_000,
  });

  /* ------- company locations query ------- */

  const companyLocationsQuery = useQuery<LocationSummary[]>({
    queryKey: ["locations-by-company", selectedCompanyId, locationFilterQuery],
    queryFn: () =>
      fetchJSON<LocationSummary[]>(
        `/api/companies/${selectedCompanyId}/locations${
          locationFilterQuery
            ? `?q=${encodeURIComponent(locationFilterQuery)}`
            : ""
        }`
      ),
    enabled: !!selectedCompanyId,
    staleTime: 60_000,
  });

  /* ------- global location search (entry by location) ------- */

  const locationGlobalQueryResult = useQuery<LocationSearchResult[]>({
    queryKey: ["locations-global", locationGlobalQuery],
    queryFn: () =>
      fetchJSON<LocationSearchResult[]>(
        `/api/locations?q=${encodeURIComponent(locationGlobalQuery)}`
      ),
    enabled: entryMode === "location" && !!locationGlobalQuery,
    staleTime: 300_000,
  });

  /* ------- employees for selected location ------- */

  const employeesQuery = useQuery<EmployeeSummary[]>({
    queryKey: [
      "employees-by-location",
      selectedLocationId,
      employeeFilterQuery,
    ],
    queryFn: () =>
      fetchJSON<EmployeeSummary[]>(
        `/api/locations/${selectedLocationId}/employees${
          employeeFilterQuery
            ? `?q=${encodeURIComponent(employeeFilterQuery)}`
            : ""
        }`
      ),
    enabled: !!selectedLocationId,
    staleTime: 60_000,
  });

  /* ------- employee detail & wages ------- */

  const employeeDetailsQuery = useQuery<EmployeeRecord | null>({
    queryKey: ["employee-details", selectedEmployeeId],
    queryFn: () =>
      fetchJSON<EmployeeRecord | null>(`/api/employees/${selectedEmployeeId}`),
    enabled: !!selectedEmployeeId,
    staleTime: 300_000,
  });

  const employeeWagesQuery = useQuery<EmployeeWage[]>({
    queryKey: ["employee-wages", selectedEmployeeId],
    queryFn: () =>
      fetchJSON<EmployeeWage[]>(
        `/api/employees/${selectedEmployeeId}/wages?limit=200`
      ),
    enabled: !!selectedEmployeeId,
    staleTime: 300_000,
  });

  /* ------- field selection state ------- */

  const [companyFieldSelection, setCompanyFieldSelection] = useState<
    Record<string, boolean>
  >({});
  const [employeeFieldSelection, setEmployeeFieldSelection] = useState<
    Record<string, boolean>
  >({});

  // Initialize field selection when details data changes
  useEffect(() => {
    const data = companyDetailsQuery.data;
    if (!data) {
      setCompanyFieldSelection({});
      return;
    }
    const defaultKeys = new Set([
      "CustomerID",
      "Name",
      "AccountRep",
      "Inactive",
      "salesrep",
      "entereddate",
      "lastupdate",
      "wotcpercent",
    ]);
    const selection: Record<string, boolean> = {};
    Object.keys(data).forEach((key) => {
      selection[key] = defaultKeys.has(key);
    });
    setCompanyFieldSelection(selection);
  }, [companyDetailsQuery.data]);

  useEffect(() => {
    const data = employeeDetailsQuery.data;
    if (!data) {
      setEmployeeFieldSelection({});
      return;
    }
    const defaultKeys = new Set([
      "id",
      "FirstName",
      "Lastname",
      "SSN",
      "datehired",
      "dob",
      "termdate",
      "Inactive",
      "Address",
      "City",
      "State",
      "Zip",
      "telephone",
    ]);
    const selection: Record<string, boolean> = {};
    Object.keys(data).forEach((key) => {
      selection[key] = defaultKeys.has(key);
    });
    setEmployeeFieldSelection(selection);
  }, [employeeDetailsQuery.data]);

  const selectedCompanyFieldEntries = useMemo(() => {
    const record = companyDetailsQuery.data;
    if (!record || !companyFieldSelection) return [];
    return Object.entries(record).filter(([key]) => companyFieldSelection[key]);
  }, [companyDetailsQuery.data, companyFieldSelection]);

  const selectedEmployeeFieldEntries = useMemo(() => {
    const record = employeeDetailsQuery.data;
    if (!record || !employeeFieldSelection) return [];
    return Object.entries(record).filter(
      ([key]) => employeeFieldSelection[key]
    );
  }, [employeeDetailsQuery.data, employeeFieldSelection]);

  const hasCompany = !!selectedCompanyId;
  const hasLocation = !!selectedLocationId;

  /* ------- handlers ------- */

  const handleCompanySearchSubmit = () => {
    setCompanySearchQuery(companySearchInput.trim());
  };

  const handleGlobalLocationSearchSubmit = () => {
    setLocationGlobalQuery(locationGlobalInput.trim());
  };

  const handleLocationFilterSubmit = () => {
    setLocationFilterQuery(locationFilterInput.trim());
  };

  const handleEmployeeFilterSubmit = () => {
    setEmployeeFilterQuery(employeeFilterInput.trim());
  };

  const handleSelectCompanySummary = (c: CompanySummary) => {
    setSelectedCompanyId(c.CustomerID);
    setSelectedCompanySummary(c);
    setSelectedLocationId(null);
    setSelectedLocationSummary(null);
    setSelectedEmployeeId(null);
    setSelectedEmployeeSummary(null);
    setLocationFilterInput("");
    setLocationFilterQuery("");
    setEmployeeFilterInput("");
    setEmployeeFilterQuery("");
  };

  const handleSelectLocationSummary = (loc: LocationSummary) => {
    setSelectedLocationId(loc.id);
    setSelectedLocationSummary(loc);
    setSelectedEmployeeId(null);
    setSelectedEmployeeSummary(null);
    setEmployeeFilterInput("");
    setEmployeeFilterQuery("");
  };

  const handleSelectEmployeeSummary = (emp: EmployeeSummary) => {
    setSelectedEmployeeId(emp.id);
    setSelectedEmployeeSummary(emp);
  };

  // When choosing via global location search, we get both company + location
  const handleSelectLocationGlobal = (r: LocationSearchResult) => {
    // set company & location
    setSelectedCompanyId(r.CustomerID);
    setSelectedCompanySummary({
      CustomerID: r.CustomerID,
      Name: r.CompanyName,
      LocationCount: 0, // unknown here; will be loaded via locations API
      EmployeeCount: r.EmployeeCount,
    });
    setSelectedLocationId(r.id);
    setSelectedLocationSummary({
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
    setSelectedEmployeeId(null);
    setSelectedEmployeeSummary(null);

    // clear filters
    setLocationFilterInput("");
    setLocationFilterQuery("");
    setEmployeeFilterInput("");
    setEmployeeFilterQuery("");

    // Auto switch entryMode back to "company" if you want;
    // but for now, leave them in "location" tab for exploration.
  };

  /* ========== UI ========== */

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-50 sm:px-8 lg:px-12">
      {/* Header */}
      <header className="mx-auto flex max-w-7xl flex-col gap-4 pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Organization Data Explorer
          </h1>
        </div>
        <div className="flex gap-2 text-xs font-medium text-slate-300">
          <StepPill label="1. Company / Location" active />
          <StepPill label="2. Locations" active={hasCompany} />
          <StepPill label="3. Employees & Wages" active={hasLocation} />
        </div>
      </header>

      <div className="mx-auto flex max-w-8xl flex-col gap-10">
        {/* STEP 1: Company / Location search */}
        <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.7)] md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <StepBadge number={1} title="Search entry" />
            {/* entry mode toggle */}
            <div className="inline-flex rounded-full border border-slate-700 bg-slate-900 p-1 text-[11px] uppercase tracking-[0.16em]">
              <button
                type="button"
                onClick={() => setEntryMode("company")}
                className={[
                  "rounded-full px-3 py-1 transition",
                  entryMode === "company"
                    ? "bg-sky-500/20 text-sky-100 shadow-[0_0_18px_rgba(56,189,248,0.5)]"
                    : "text-slate-400 hover:bg-slate-800",
                ].join(" ")}
              >
                By Company
              </button>
              <button
                type="button"
                onClick={() => setEntryMode("location")}
                className={[
                  "rounded-full px-3 py-1 transition",
                  entryMode === "location"
                    ? "bg-emerald-500/20 text-emerald-100 shadow-[0_0_18px_rgba(52,211,153,0.5)]"
                    : "text-slate-400 hover:bg-slate-800",
                ].join(" ")}
              >
                By Location
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.1fr)] lg:items-start">
            {/* LEFT side: either company search or global location search */}
            <div className="space-y-5">
              {entryMode === "company" ? (
                <>
                  <label className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
                    Company search
                  </label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <input
                        value={companySearchInput}
                        onChange={(e) => setCompanySearchInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCompanySearchSubmit();
                        }}
                        placeholder="Search by company name..."
                        className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm outline-none transition focus:border-sky-400 focus:shadow-[0_0_0_1px_rgba(56,189,248,0.7)]"
                      />
                    </div>
                    <button
                      onClick={handleCompanySearchSubmit}
                      type="button"
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-sky-500 bg-sky-500/20 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-sky-50 shadow-[0_0_18px_rgba(56,189,248,0.45)] transition hover:bg-sky-500/30"
                    >
                      Search
                    </button>
                  </div>

                  <div className="mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/70">
                    <table className="min-w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-900/95 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                        <tr>
                          <th className="px-4 py-2">Company</th>
                          <th className="px-4 py-2 text-right">Locations</th>
                          <th className="px-4 py-2 text-right">Employees</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companiesQuery.isLoading && (
                          <tr>
                            <td
                              colSpan={3}
                              className="px-4 py-6 text-center text-xs text-slate-500"
                            >
                              Loading companies...
                            </td>
                          </tr>
                        )}
                        {companiesQuery.isError &&
                          !companiesQuery.isLoading && (
                            <tr>
                              <td
                                colSpan={3}
                                className="px-4 py-6 text-center text-xs text-rose-400"
                              >
                                {(companiesQuery.error as Error).message}
                              </td>
                            </tr>
                          )}
                        {!companiesQuery.isLoading &&
                          !companiesQuery.isError &&
                          companiesQuery.data &&
                          companiesQuery.data.length === 0 && (
                            <tr>
                              <td
                                colSpan={3}
                                className="px-4 py-6 text-center text-xs text-slate-500"
                              >
                                No companies found.
                              </td>
                            </tr>
                          )}
                        {companiesQuery.data?.map((c) => {
                          const active = selectedCompanyId === c.CustomerID;
                          return (
                            <tr
                              key={c.CustomerID}
                              onClick={() => handleSelectCompanySummary(c)}
                              className={[
                                "cursor-pointer border-t border-slate-800 text-[13px] transition",
                                active
                                  ? "bg-sky-500/10 hover:bg-sky-500/15"
                                  : "hover:bg-slate-900",
                              ].join(" ")}
                            >
                              <td className="px-4 py-3">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-medium text-slate-50">
                                    {c.Name}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    ID: {c.CustomerID}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right text-slate-300">
                                {c.LocationCount}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-200">
                                {c.EmployeeCount}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  <label className="text-xs font-medium uppercase tracking-[0.22em] text-emerald-400">
                    Location search
                  </label>
                  <div className="flex gap-3">
                    <input
                      value={locationGlobalInput}
                      onChange={(e) => setLocationGlobalInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          handleGlobalLocationSearchSubmit();
                      }}
                      placeholder="Search by location name, city, or ZIP..."
                      className="h-11 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm outline-none transition focus:border-emerald-400 focus:shadow-[0_0_0_1px_rgba(52,211,153,0.7)]"
                    />
                    <button
                      onClick={handleGlobalLocationSearchSubmit}
                      type="button"
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-emerald-500 bg-emerald-500/20 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-50 shadow-[0_0_18px_rgba(52,211,153,0.45)] transition hover:bg-emerald-500/30"
                    >
                      Search
                    </button>
                  </div>

                  <div className="mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/70">
                    <table className="min-w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-900/95 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                        <tr>
                          <th className="px-4 py-2">Location</th>
                          <th className="px-4 py-2">City / State</th>
                          <th className="px-4 py-2">Company</th>
                          <th className="px-4 py-2 text-right">Employees</th>
                        </tr>
                      </thead>
                      <tbody>
                        {locationGlobalQueryResult.isLoading &&
                          locationGlobalQuery && (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-4 py-6 text-center text-xs text-slate-500"
                              >
                                Searching locations...
                              </td>
                            </tr>
                          )}
                        {locationGlobalQueryResult.isError &&
                          !locationGlobalQueryResult.isLoading && (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-4 py-6 text-center text-xs text-rose-400"
                              >
                                {
                                  (locationGlobalQueryResult.error as Error)
                                    .message
                                }
                              </td>
                            </tr>
                          )}
                        {!locationGlobalQueryResult.isLoading &&
                          locationGlobalQueryResult.data &&
                          locationGlobalQueryResult.data.length === 0 &&
                          locationGlobalQuery && (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-4 py-6 text-center text-xs text-slate-500"
                              >
                                No locations found.
                              </td>
                            </tr>
                          )}
                        {locationGlobalQueryResult.data?.map((r) => {
                          const active =
                            selectedLocationId === r.id &&
                            selectedCompanyId === r.CustomerID;
                          return (
                            <tr
                              key={r.id}
                              onClick={() => handleSelectLocationGlobal(r)}
                              className={[
                                "cursor-pointer border-t border-slate-800 text-[13px] transition",
                                active
                                  ? "bg-emerald-500/10 hover:bg-emerald-500/15"
                                  : "hover:bg-slate-900",
                              ].join(" ")}
                            >
                              <td className="px-4 py-3 text-slate-50">
                                <div className="flex flex-col gap-0.5">
                                  <span>{r.Name}</span>
                                  <span className="text-[11px] text-slate-400">
                                    Location ID: {r.id}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-300">
                                {r.City}, {r.State}
                              </td>
                              <td className="px-4 py-3 text-slate-200">
                                {r.CompanyName}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-200">
                                {r.EmployeeCount}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* RIGHT: company detail panel with field selector */}
            <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 md:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Company details (full record)
              </p>

              {!selectedCompanySummary && (
                <p className="text-xs text-slate-500">
                  Select a company from the left (via company or location
                  search) to inspect all fields and choose which ones to
                  highlight.
                </p>
              )}

              {selectedCompanySummary && (
                <>
                  <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-semibold text-slate-50">
                      {selectedCompanySummary.Name}
                    </h2>
                    <p className="text-xs text-slate-400">
                      CustomerID: {selectedCompanySummary.CustomerID}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs">
                      <StatPill
                        label="Locations"
                        value={
                          selectedCompanySummary.LocationCount?.toString() ??
                          "-"
                        }
                      />
                      <StatPill
                        label="Employees"
                        value={
                          selectedCompanySummary.EmployeeCount?.toString() ??
                          "-"
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {/* highlighted fields */}
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Highlighted fields
                      </p>
                      {companyDetailsQuery.isLoading && (
                        <p className="mt-2 text-xs text-slate-500">
                          Loading company fields...
                        </p>
                      )}
                      {companyDetailsQuery.isError &&
                        !companyDetailsQuery.isLoading && (
                          <p className="mt-2 text-xs text-rose-400">
                            {(companyDetailsQuery.error as Error).message}
                          </p>
                        )}
                      {!companyDetailsQuery.isLoading &&
                        companyDetailsQuery.data &&
                        selectedCompanyFieldEntries.length === 0 && (
                          <p className="mt-2 text-xs text-slate-500">
                            No fields selected. Use the list on the right to
                            turn fields on/off.
                          </p>
                        )}
                      {!companyDetailsQuery.isLoading &&
                        selectedCompanyFieldEntries.length > 0 && (
                          <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                            <dl className="space-y-1.5 text-[11px]">
                              {selectedCompanyFieldEntries.map(
                                ([key, value]) => (
                                  <div
                                    key={key}
                                    className="flex items-start gap-2 border-b border-slate-800 pb-1 last:border-b-0 last:pb-0"
                                  >
                                    <dt className="w-[45%] shrink-0 pr-1 font-semibold text-slate-300">
                                      {key}
                                    </dt>
                                    <dd className="flex-1 break-all text-slate-300">
                                      {formatValue(value)}
                                    </dd>
                                  </div>
                                )
                              )}
                            </dl>
                          </div>
                        )}
                    </div>

                    {/* field selector */}
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        All fields (toggle)
                      </p>
                      {companyDetailsQuery.data && (
                        <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-[11px]">
                          {Object.keys(companyDetailsQuery.data)
                            .sort()
                            .map((key) => (
                              <label
                                key={key}
                                className="flex cursor-pointer items-center justify-between gap-2 py-0.5"
                              >
                                <span className="truncate text-slate-300">
                                  {key}
                                </span>
                                <input
                                  type="checkbox"
                                  className="h-3 w-3 rounded border-slate-600 bg-slate-900"
                                  checked={Boolean(companyFieldSelection[key])}
                                  onChange={(e) =>
                                    setCompanyFieldSelection((prev) => ({
                                      ...prev,
                                      [key]: e.target.checked,
                                    }))
                                  }
                                />
                              </label>
                            ))}
                        </div>
                      )}
                      {!companyDetailsQuery.data && selectedCompanySummary && (
                        <p className="mt-2 text-xs text-slate-500">
                          Full record will load automatically; fields will
                          appear here.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* STEP 2: Locations list for selected company */}
        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.7)] md:p-8">
          <StepBadge number={2} title="Locations for company" />

          <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
                {selectedCompanySummary
                  ? `Locations for ${selectedCompanySummary.Name}`
                  : "No company selected"}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Filter locations, then click one to see its employees below.
              </p>
            </div>
            <div className="flex w-full max-w-sm gap-3">
              <input
                value={locationFilterInput}
                onChange={(e) => setLocationFilterInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLocationFilterSubmit();
                }}
                placeholder="Search by location name, city, state..."
                className="h-10 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs outline-none transition focus:border-sky-400 focus:shadow-[0_0_0_1px_rgba(56,189,248,0.7)]"
                disabled={!hasCompany}
              />
              <button
                type="button"
                onClick={handleLocationFilterSubmit}
                disabled={!hasCompany}
                className={[
                  "inline-flex h-10 items-center justify-center rounded-xl border px-4 text-[11px] font-semibold uppercase tracking-[0.16em] transition",
                  hasCompany
                    ? "border-sky-500 bg-sky-500/20 text-sky-50 hover:bg-sky-500/30"
                    : "cursor-not-allowed border-slate-700 bg-slate-900 text-slate-500",
                ].join(" ")}
              >
                Filter
              </button>
            </div>
          </div>

          <div className="mt-4 max-h-96 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/80">
            <table className="min-w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-900/95 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <th className="px-4 py-2">Location</th>
                  <th className="px-4 py-2">City</th>
                  <th className="px-4 py-2">State</th>
                  <th className="px-4 py-2 text-right">Employees</th>
                </tr>
              </thead>
              <tbody>
                {!hasCompany && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-xs text-slate-500"
                    >
                      Start by selecting a company (or a location) in Step 1.
                    </td>
                  </tr>
                )}

                {hasCompany &&
                  companyLocationsQuery.isLoading &&
                  !companyLocationsQuery.data && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-xs text-slate-500"
                      >
                        Loading locations...
                      </td>
                    </tr>
                  )}

                {hasCompany &&
                  companyLocationsQuery.isError &&
                  !companyLocationsQuery.isLoading && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-xs text-rose-400"
                      >
                        {(companyLocationsQuery.error as Error).message}
                      </td>
                    </tr>
                  )}

                {hasCompany &&
                  !companyLocationsQuery.isLoading &&
                  !companyLocationsQuery.isError &&
                  companyLocationsQuery.data &&
                  companyLocationsQuery.data.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-xs text-slate-500"
                      >
                        No locations found for this company.
                      </td>
                    </tr>
                  )}

                {companyLocationsQuery.data?.map((loc) => {
                  const active = selectedLocationId === loc.id;
                  return (
                    <tr
                      key={loc.id}
                      onClick={() => handleSelectLocationSummary(loc)}
                      className={[
                        "cursor-pointer border-t border-slate-800 text-[13px] transition",
                        active
                          ? "bg-emerald-500/10 hover:bg-emerald-500/15"
                          : "hover:bg-slate-900",
                      ].join(" ")}
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-slate-50">
                            {loc.Name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            ID: {loc.id}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{loc.City}</td>
                      <td className="px-4 py-3 text-slate-300">{loc.State}</td>
                      <td className="px-4 py-3 text-right text-slate-50">
                        {loc.EmployeeCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* STEP 3: Employees & wages */}
        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.7)] md:p-8">
          <StepBadge number={3} title="Employees & wages" />

          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.1fr)] lg:items-start">
            {/* LEFT: employee table */}
            <div className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
                    {selectedLocationSummary
                      ? `Employees at ${selectedLocationSummary.Name}`
                      : "No location selected"}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Filter by name or SSN, then click an employee to see full
                    record and wage history.
                  </p>
                </div>
                <div className="flex w-full max-w-sm gap-3">
                  <input
                    value={employeeFilterInput}
                    onChange={(e) => setEmployeeFilterInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleEmployeeFilterSubmit();
                    }}
                    placeholder="Search by name or SSN..."
                    className="h-10 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs outline-none transition focus:border-emerald-400 focus:shadow-[0_0_0_1px_rgba(52,211,153,0.8)]"
                    disabled={!hasLocation}
                  />
                  <button
                    type="button"
                    onClick={handleEmployeeFilterSubmit}
                    disabled={!hasLocation}
                    className={[
                      "inline-flex h-10 items-center justify-center rounded-xl border px-4 text-[11px] font-semibold uppercase tracking-[0.16em] transition",
                      hasLocation
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-50 hover:bg-emerald-500/30"
                        : "cursor-not-allowed border-slate-700 bg-slate-900 text-slate-500",
                    ].join(" ")}
                  >
                    Filter
                  </button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/80">
                <table className="min-w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-900/95 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                    <tr>
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">Hire date</th>
                      <th className="px-4 py-2 text-right">Total wages</th>
                      <th className="px-4 py-2 text-right">Total hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!hasLocation && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-6 text-center text-xs text-slate-500"
                        >
                          Select a location above to load employees.
                        </td>
                      </tr>
                    )}
                    {hasLocation &&
                      employeesQuery.isLoading &&
                      !employeesQuery.data && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-6 text-center text-xs text-slate-500"
                          >
                            Loading employees...
                          </td>
                        </tr>
                      )}
                    {hasLocation &&
                      employeesQuery.isError &&
                      !employeesQuery.isLoading && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-6 text-center text-xs text-rose-400"
                          >
                            {(employeesQuery.error as Error).message}
                          </td>
                        </tr>
                      )}
                    {hasLocation &&
                      !employeesQuery.isLoading &&
                      !employeesQuery.isError &&
                      employeesQuery.data &&
                      employeesQuery.data.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-6 text-center text-xs text-slate-500"
                          >
                            No employees found for this location.
                          </td>
                        </tr>
                      )}
                    {employeesQuery.data?.map((emp) => {
                      const active = selectedEmployeeId === emp.id;
                      return (
                        <tr
                          key={emp.id}
                          onClick={() => handleSelectEmployeeSummary(emp)}
                          className={[
                            "cursor-pointer border-t border-slate-800 text-[13px] transition",
                            active
                              ? "bg-emerald-500/10 hover:bg-emerald-500/15"
                              : "hover:bg-slate-900",
                          ].join(" ")}
                        >
                          <td className="px-4 py-3 text-slate-50">
                            {emp.FirstName} {emp.LastName}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {emp.datehired}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-200">
                            {emp.TotalWages.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-200">
                            {emp.TotalHours.toFixed(1)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT: employee details + field selector + wages */}
            <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 md:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Employee details & wage history
              </p>

              {!selectedEmployeeSummary && (
                <p className="text-xs text-slate-500">
                  Click an employee row to load full record and wage breakdown.
                </p>
              )}

              {selectedEmployeeSummary && (
                <>
                  <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-semibold text-slate-50">
                      {selectedEmployeeSummary.FirstName}{" "}
                      {selectedEmployeeSummary.LastName}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Employee ID: {selectedEmployeeSummary.id}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs">
                      <StatPill
                        label="Total wages"
                        value={selectedEmployeeSummary.TotalWages.toFixed(2)}
                      />
                      <StatPill
                        label="Total hours"
                        value={selectedEmployeeSummary.TotalHours.toFixed(1)}
                      />
                    </div>
                  </div>

                  {/* detail + selector */}
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Highlighted fields
                      </p>
                      {employeeDetailsQuery.isLoading && (
                        <p className="mt-2 text-xs text-slate-500">
                          Loading employee fields...
                        </p>
                      )}
                      {employeeDetailsQuery.isError &&
                        !employeeDetailsQuery.isLoading && (
                          <p className="mt-2 text-xs text-rose-400">
                            {(employeeDetailsQuery.error as Error).message}
                          </p>
                        )}
                      {!employeeDetailsQuery.isLoading &&
                        employeeDetailsQuery.data &&
                        selectedEmployeeFieldEntries.length === 0 && (
                          <p className="mt-2 text-xs text-slate-500">
                            No fields selected. Use the list on the right to
                            pick fields.
                          </p>
                        )}
                      {!employeeDetailsQuery.isLoading &&
                        selectedEmployeeFieldEntries.length > 0 && (
                          <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                            <dl className="space-y-1.5 text-[11px]">
                              {selectedEmployeeFieldEntries.map(
                                ([key, value]) => (
                                  <div
                                    key={key}
                                    className="flex items-start gap-2 border-b border-slate-800 pb-1 last:border-b-0 last:pb-0"
                                  >
                                    <dt className="w-[45%] shrink-0 pr-1 font-semibold text-slate-300">
                                      {key}
                                    </dt>
                                    <dd className="flex-1 break-all text-slate-300">
                                      {formatValue(value)}
                                    </dd>
                                  </div>
                                )
                              )}
                            </dl>
                          </div>
                        )}
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        All fields (toggle)
                      </p>
                      {employeeDetailsQuery.data && (
                        <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-[11px]">
                          {Object.keys(employeeDetailsQuery.data)
                            .sort()
                            .map((key) => (
                              <label
                                key={key}
                                className="flex cursor-pointer items-center justify-between gap-2 py-0.5"
                              >
                                <span className="truncate text-slate-300">
                                  {key}
                                </span>
                                <input
                                  type="checkbox"
                                  className="h-3 w-3 rounded border-slate-600 bg-slate-900"
                                  checked={Boolean(employeeFieldSelection[key])}
                                  onChange={(e) =>
                                    setEmployeeFieldSelection((prev) => ({
                                      ...prev,
                                      [key]: e.target.checked,
                                    }))
                                  }
                                />
                              </label>
                            ))}
                        </div>
                      )}
                      {!employeeDetailsQuery.data &&
                        selectedEmployeeSummary && (
                          <p className="mt-2 text-xs text-slate-500">
                            Full record will load automatically; fields will
                            appear here.
                          </p>
                        )}
                    </div>
                  </div>

                  {/* wage table */}
                  <div className="mt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Wage history
                    </p>
                    {employeeWagesQuery.isLoading && (
                      <p className="mt-2 text-xs text-slate-500">
                        Loading wages...
                      </p>
                    )}
                    {employeeWagesQuery.isError &&
                      !employeeWagesQuery.isLoading && (
                        <p className="mt-2 text-xs text-rose-400">
                          {(employeeWagesQuery.error as Error).message}
                        </p>
                      )}
                    {!employeeWagesQuery.isLoading &&
                      !employeeWagesQuery.isError &&
                      employeeWagesQuery.data &&
                      employeeWagesQuery.data.length === 0 && (
                        <p className="mt-2 text-xs text-slate-500">
                          No wage records found for this employee.
                        </p>
                      )}
                    {employeeWagesQuery.data &&
                      employeeWagesQuery.data.length > 0 && (
                        <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950">
                          <table className="min-w-full text-left text-[11px]">
                            <thead className="sticky top-0 bg-slate-900/95 text-[10px] uppercase tracking-[0.16em] text-slate-400">
                              <tr>
                                <th className="px-3 py-2">From</th>
                                <th className="px-3 py-2">To</th>
                                <th className="px-3 py-2 text-right">Amount</th>
                                <th className="px-3 py-2 text-right">Hours</th>
                              </tr>
                            </thead>
                            <tbody>
                              {employeeWagesQuery.data.map((w) => (
                                <tr
                                  key={w.id}
                                  className="border-t border-slate-800"
                                >
                                  <td className="px-3 py-2 text-slate-300">
                                    {w.fromdate}
                                  </td>
                                  <td className="px-3 py-2 text-slate-300">
                                    {w.todate}
                                  </td>
                                  <td className="px-3 py-2 text-right text-slate-200">
                                    {w.amount.toFixed(2)}
                                  </td>
                                  <td className="px-3 py-2 text-right text-slate-200">
                                    {w.hours.toFixed(1)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

/* ---------- small presentational components ---------- */

function StepBadge({ number, title }: { number: number; title: string }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full bg-slate-900/80 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-300">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/20 text-[11px] font-semibold text-sky-300 ring-1 ring-sky-500/60">
        {number}
      </span>
      <span>{title}</span>
    </div>
  );
}

function StepPill({ label, active }: { label: string; active?: boolean }) {
  return (
    <div
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1",
        "text-[11px] uppercase tracking-[0.16em] transition",
        active
          ? "border-sky-400/70 bg-sky-500/10 text-sky-100 shadow-[0_0_18px_rgba(56,189,248,0.5)]"
          : "border-slate-700/80 bg-slate-900/80 text-slate-500",
      ].join(" ")}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          active ? "bg-sky-400" : "bg-slate-500",
        ].join(" ")}
      />
      {label}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex flex-col rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 py-2">
      <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>
      <span className="mt-1 text-sm font-semibold text-slate-50">{value}</span>
    </div>
  );
}
