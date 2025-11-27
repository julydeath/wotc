// app/company-flow/page.tsx
"use client";

import React, { useMemo, useState } from "react";

type Employee = {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
};

type Location = {
  id: string;
  name: string;
  city: string;
  country: string;
  employeesCount: number;
  employees: Employee[];
};

type Company = {
  id: string;
  name: string;
  code: string;
  industry: string;
  totalEmployees: number;
  totalLocations: number;
  locations: Location[];
};

// TODO: Replace this with your real data from queries
const MOCK_COMPANIES: Company[] = [
  {
    id: "c1",
    name: "Acme Technologies",
    code: "ACME",
    industry: "Software & Services",
    totalEmployees: 420,
    totalLocations: 3,
    locations: [
      {
        id: "c1-l1",
        name: "Hyderabad Campus",
        city: "Hyderabad",
        country: "India",
        employeesCount: 220,
        employees: [
          {
            id: "e1",
            name: "Rohit Sharma",
            role: "Senior Engineer",
            department: "Platform",
            email: "rohit.sharma@acme.com",
          },
          {
            id: "e2",
            name: "Priya Singh",
            role: "Product Manager",
            department: "Product",
            email: "priya.singh@acme.com",
          },
        ],
      },
      {
        id: "c1-l2",
        name: "Bangalore Tech Park",
        city: "Bengaluru",
        country: "India",
        employeesCount: 150,
        employees: [],
      },
      {
        id: "c1-l3",
        name: "SF HQ",
        city: "San Francisco",
        country: "USA",
        employeesCount: 50,
        employees: [],
      },
    ],
  },
  {
    id: "c2",
    name: "Northwind Logistics",
    code: "NWLD",
    industry: "Logistics",
    totalEmployees: 180,
    totalLocations: 2,
    locations: [
      {
        id: "c2-l1",
        name: "Delhi Warehouse",
        city: "New Delhi",
        country: "India",
        employeesCount: 80,
        employees: [],
      },
      {
        id: "c2-l2",
        name: "Mumbai Dock",
        city: "Mumbai",
        country: "India",
        employeesCount: 100,
        employees: [],
      },
    ],
  },
];

export default function CompanyFlowPage() {
  const [companySearch, setCompanySearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  );

  // Filtered data
  const filteredCompanies = useMemo(() => {
    const q = companySearch.toLowerCase().trim();
    if (!q) return MOCK_COMPANIES;
    return MOCK_COMPANIES.filter((c) =>
      [c.name, c.code, c.industry].join(" ").toLowerCase().includes(q)
    );
  }, [companySearch]);

  const locations = selectedCompany?.locations ?? [];
  const filteredLocations = useMemo(() => {
    const q = locationSearch.toLowerCase().trim();
    if (!q) return locations;
    return locations.filter((loc) =>
      [loc.name, loc.city, loc.country].join(" ").toLowerCase().includes(q)
    );
  }, [locationSearch, locations]);

  const employees = selectedLocation?.employees ?? [];
  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.toLowerCase().trim();
    if (!q) return employees;
    return employees.filter((emp) =>
      [emp.name, emp.role, emp.department, emp.email]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [employeeSearch, employees]);

  const hasCompany = Boolean(selectedCompany);
  const hasLocation = Boolean(selectedLocation);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-50 sm:px-6 lg:px-10">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl flex-col gap-4 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-400">
            Company → Location → Employees
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Org Data Exploration Flow
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            Pick a company, drill down into locations, and instantly inspect
            employee lists – all in one interactive flow.
          </p>
        </div>
        {/* Step indicator */}
        <div className="flex gap-2 text-xs font-medium text-slate-300">
          <StepPill label="1. Company" active />
          <StepPill label="2. Location" active={hasCompany} />
          <StepPill label="3. Employees" active={hasLocation} />
        </div>
      </header>

      {/* Flow cards */}
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* Step 1: Company */}
        <section className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 via-slate-950 to-slate-950 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.75)] sm:p-7">
          {/* Flow connector badge */}
          <StepBadge number={1} title="Select a company" />

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
            {/* Search + list */}
            <div className="space-y-4">
              <label className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
                Company search
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <span className="h-4 w-4 rounded-full border border-slate-500/40" />
                </div>
                <input
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  placeholder="Search by name, code, industry..."
                  className="h-11 w-full rounded-xl border border-slate-700/70 bg-slate-900/70 pl-9 pr-3 text-sm outline-none ring-0 transition focus:border-sky-400/80 focus:bg-slate-900 focus:shadow-[0_0_0_1px_rgba(56,189,248,0.7)]"
                />
              </div>

              <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-800/90 bg-slate-950/70">
                <table className="min-w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-900/95 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                    <tr>
                      <th className="px-4 py-2">Company</th>
                      <th className="px-4 py-2">Industry</th>
                      <th className="px-4 py-2 text-right">Employees</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanies.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-6 text-center text-xs text-slate-500"
                        >
                          No companies match that search.
                        </td>
                      </tr>
                    )}
                    {filteredCompanies.map((company) => {
                      const isActive = selectedCompany?.id === company.id;
                      return (
                        <tr
                          key={company.id}
                          onClick={() => {
                            setSelectedCompany(company);
                            setSelectedLocation(null);
                            setLocationSearch("");
                            setEmployeeSearch("");
                          }}
                          className={[
                            "cursor-pointer border-t border-slate-800/70 text-[13px] transition",
                            isActive
                              ? "bg-sky-500/10 hover:bg-sky-500/15"
                              : "hover:bg-slate-900/60",
                          ].join(" ")}
                        >
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-slate-50">
                                {company.name}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                Code: {company.code}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {company.industry}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-200">
                            {company.totalEmployees}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Company summary + action */}
            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 sm:p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Selected company
                </p>
                {selectedCompany ? (
                  <>
                    <h2 className="mt-2 text-lg font-semibold text-slate-50">
                      {selectedCompany.name}
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                      {selectedCompany.industry} · Code {selectedCompany.code}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3 text-xs">
                      <StatPill
                        label="Locations"
                        value={selectedCompany.totalLocations.toString()}
                      />
                      <StatPill
                        label="Total employees"
                        value={selectedCompany.totalEmployees.toString()}
                      />
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-xs text-slate-500">
                    Pick a company from the list on the left to see locations
                    and employees.
                  </p>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-[11px] text-slate-400">
                  Click{" "}
                  <span className="font-semibold text-sky-300">
                    &ldquo;View locations&rdquo;
                  </span>{" "}
                  to roll down the next step.
                </p>
                <button
                  type="button"
                  disabled={!selectedCompany}
                  className={[
                    "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] transition",
                    selectedCompany
                      ? "border-sky-400/70 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20 hover:shadow-[0_0_25px_rgba(56,189,248,0.55)]"
                      : "cursor-not-allowed border-slate-700 bg-slate-900 text-slate-500",
                  ].join(" ")}
                  // The button itself doesn’t need to do anything extra,
                  // the next section automatically opens when a company is selected.
                  onClick={() => {
                    /* purely visual CTA */
                  }}
                >
                  View locations
                  <span className="text-xs">↓</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Step 2: Locations */}
        <section
          className={[
            "relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/90 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.85)] transition-all duration-500",
            hasCompany
              ? "max-h-[720px] opacity-100 translate-y-0"
              : "max-h-0 opacity-0 -translate-y-4 pointer-events-none border-transparent shadow-none",
          ].join(" ")}
        >
          <StepBadge number={2} title="Select a location" />

          <div className="mt-6 space-y-4">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
                  {selectedCompany
                    ? `Locations for ${selectedCompany.name}`
                    : "Locations"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Filter locations and click one to roll down the employee list.
                </p>
              </div>
              <div className="w-full max-w-xs">
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                  Location search
                </label>
                <input
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  placeholder="Search by campus, city, country..."
                  className="h-10 w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 text-xs outline-none transition focus:border-sky-400/80 focus:bg-slate-900 focus:shadow-[0_0_0_1px_rgba(56,189,248,0.7)]"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-800/80 bg-slate-950/70">
              <table className="min-w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-900/95 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="px-4 py-2">Location</th>
                    <th className="px-4 py-2">City</th>
                    <th className="px-4 py-2">Country</th>
                    <th className="px-4 py-2 text-right">Employees</th>
                  </tr>
                </thead>
                <tbody>
                  {hasCompany && filteredLocations.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-xs text-slate-500"
                      >
                        No locations match that search.
                      </td>
                    </tr>
                  )}
                  {!hasCompany && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-xs text-slate-500"
                      >
                        Select a company above first.
                      </td>
                    </tr>
                  )}
                  {filteredLocations.map((loc) => {
                    const isActive = selectedLocation?.id === loc.id;
                    return (
                      <tr
                        key={loc.id}
                        onClick={() => {
                          setSelectedLocation(loc);
                          setEmployeeSearch("");
                        }}
                        className={[
                          "cursor-pointer border-t border-slate-800/70 text-[13px] transition",
                          isActive
                            ? "bg-emerald-500/10 hover:bg-emerald-500/15"
                            : "hover:bg-slate-900/70",
                        ].join(" ")}
                      >
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-slate-50">
                              {loc.name}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              ID: {loc.id}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{loc.city}</td>
                        <td className="px-4 py-3 text-slate-300">
                          {loc.country}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-50">
                          {loc.employeesCount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Step 3: Employees */}
        <section
          className={[
            "relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/95 p-5 shadow-[0_16px_60px_rgba(15,23,42,0.85)] transition-all duration-500",
            hasLocation
              ? "max-h-[720px] opacity-100 translate-y-0"
              : "max-h-0 opacity-0 -translate-y-4 pointer-events-none border-transparent shadow-none",
          ].join(" ")}
        >
          <StepBadge number={3} title="View employees" />

          <div className="mt-6 space-y-4">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
                  {selectedLocation
                    ? `Employees at ${selectedLocation.name}`
                    : "Employees"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Search across name, role, department, or email.
                </p>
              </div>
              <div className="w-full max-w-xs">
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                  Employee search
                </label>
                <input
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  placeholder="e.g. frontend, HR, john.doe@..."
                  className="h-10 w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 text-xs outline-none transition focus:border-emerald-400/80 focus:bg-slate-900 focus:shadow-[0_0_0_1px_rgba(52,211,153,0.8)]"
                />
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-800/80 bg-slate-950/70">
              <table className="min-w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-900/95 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Role</th>
                    <th className="px-4 py-2">Department</th>
                    <th className="px-4 py-2">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {hasLocation && filteredEmployees.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-xs text-slate-500"
                      >
                        No employees match that search.
                      </td>
                    </tr>
                  )}
                  {!hasLocation && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-xs text-slate-500"
                      >
                        Select a location in Step 2 first.
                      </td>
                    </tr>
                  )}
                  {filteredEmployees.map((emp) => (
                    <tr
                      key={emp.id}
                      className="border-t border-slate-800/70 text-[13px] hover:bg-slate-900/70"
                    >
                      <td className="px-4 py-3 text-slate-50">{emp.name}</td>
                      <td className="px-4 py-3 text-slate-300">{emp.role}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {emp.department}
                      </td>
                      <td className="px-4 py-3 text-slate-200">{emp.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="pt-2 text-[11px] text-slate-500">
              Scroll back up any time to change company or location – the flow
              keeps state so your CEO can explore freely.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

/* -------- Small presentational components -------- */

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
          ? "border-sky-400/70 bg-sky-500/10 text-sky-100 shadow-[0_0_20px_rgba(56,189,248,0.4)]"
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
