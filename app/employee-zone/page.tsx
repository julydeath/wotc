"use client";

import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";

type Row = Record<string, unknown>;

type Summary = {
  total: number;
  withAddress: number;
  processed: number;
};

const PAGE_SIZE = 25;

function getField(row: Row, candidates: string[]): string {
  const lowerCandidates = candidates.map((c) => c.toLowerCase());

  for (const key of Object.keys(row)) {
    const lowerKey = key.toLowerCase();
    if (lowerCandidates.includes(lowerKey)) {
      const value = row[key];
      if (value === undefined || value === null) return "";
      return String(value).trim();
    }
  }

  return "";
}

function getAddress(row: Row): {
  street: string;
  city: string;
  state: string;
  zip: string;
} {
  const street = getField(row, ["Street", "Address", "Address1", "Address 1"]);
  const city = getField(row, ["City"]);
  const state = getField(row, ["State", "ST"]);
  const zip = getField(row, [
    "Zip",
    "ZIP",
    "ZipCode",
    "Zip Code",
    "PostalCode",
    "Postal Code",
  ]);

  return {
    street,
    city,
    state,
    zip,
  };
}

export default function EmployeeZonePage() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setError(null);
    setSummary(null);
    setRows([]);
    setColumns([]);
    setPage(1);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSummary(null);
    setRows([]);
    setColumns([]);
    setPage(1);

    if (!file) {
      setError("Please choose an Excel file first.");
      return;
    }

    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }

    setProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        setError("Uploaded workbook has no sheets.");
        setProcessing(false);
        return;
      }

      const sheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json<Row>(sheet, {
        defval: "",
        raw: false,
      });

      if (!json.length) {
        setError("Uploaded sheet is empty.");
        setProcessing(false);
        return;
      }

      const columnsSet = new Set<string>();
      json.forEach((row) => {
        Object.keys(row).forEach((key) => columnsSet.add(key));
      });
      columnsSet.add("censusTract");
      columnsSet.add("zone");

      const initialRows: Row[] = json.map((row) => ({
        ...row,
        censusTract: row.censusTract ?? "",
        zone: row.zone ?? "",
      }));

      setRows(initialRows);
      setColumns(Array.from(columnsSet));

      const total = initialRows.length;
      let processed = 0;
      let withAddress = 0;

      setSummary({
        total,
        withAddress,
        processed,
      });

      const resultRows = [...initialRows];

      for (let i = 0; i < resultRows.length; i += 1) {
        const row = resultRows[i];
        const { street, city, state, zip } = getAddress(row);

        processed += 1;

        if (street && city && state && zip) {
          withAddress += 1;

          try {
            const res = await fetch("/api/employee-zone/lookup", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                street,
                city,
                state,
                zip,
              }),
            });

            if (res.ok) {
              const data = (await res.json()) as {
                censusTract?: string;
                zone?: string;
              };

              const censusTract =
                typeof data.censusTract === "string" ? data.censusTract : "";
              const zone = typeof data.zone === "string" ? data.zone : "";

              resultRows[i] = {
                ...resultRows[i],
                censusTract,
                zone,
              };

              setRows((prev) => {
                if (!prev.length) return prev;
                const next = [...prev];
                if (i < next.length) {
                  next[i] = {
                    ...next[i],
                    censusTract,
                    zone,
                  };
                }
                return next;
              });
            }
          } catch {
            // ignore individual lookup failures – row stays with empty values
          }
        }

        setSummary({
          total,
          withAddress,
          processed,
        });
      }

      const outWorkbook = XLSX.utils.book_new();
      const outSheet = XLSX.utils.json_to_sheet(resultRows);
      XLSX.utils.book_append_sheet(outWorkbook, outSheet, "Employees");

      const outArrayBuffer = XLSX.write(outWorkbook, {
        type: "array",
        bookType: "xlsx",
      });

      const outBlob = new Blob([outArrayBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(outBlob);
      setDownloadUrl(url);
    } catch {
      setError("Failed to read or process Excel file.");
    } finally {
      setProcessing(false);
    }
  };

  const hasTable = rows.length > 0 && columns.length > 0;
  const totalPages = hasTable
    ? Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
    : 1;
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const pageRows = hasTable
    ? rows.slice(startIndex, startIndex + PAGE_SIZE)
    : [];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-50 sm:px-8 lg:px-14">
      <header className="mx-auto flex max-w-5xl flex-col gap-4 pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-400">
            Employee zone lookup
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Employee Zone Enrichment
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-400">
            Upload an Excel file with employee addresses to automatically look
            up their empowerment zone and census tract, then download a new
            Excel with those values added for every employee.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl">
        <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 p-6 shadow-[0_22px_70px_rgba(15,23,42,0.75)] md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                1. Upload employees Excel
              </p>
              <p className="text-xs text-slate-500">
                The first sheet will be used. Address columns should match your
                database naming – for example{" "}
                <span className="font-mono text-slate-200">
                  Address, City, State, Zip
                </span>
                . We also accept{" "}
                <span className="font-mono text-slate-200">
                  Street / Address1, ZipCode, PostalCode
                </span>
                .
              </p>
              <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-700 bg-slate-950/80 px-6 py-8 text-center text-xs text-slate-400 hover:border-sky-500 hover:bg-slate-900/80">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                  Choose Excel file
                </span>
                <span className="text-[11px] text-slate-500">
                  .xlsx, .xls or .csv
                </span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {file && (
                <p className="mt-2 text-[11px] text-emerald-400">
                  Selected file:{" "}
                  <span className="font-medium text-emerald-300">
                    {file.name}
                  </span>
                </p>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                2. Enrich with zone data
              </p>
              <p className="text-xs text-slate-500">
                For each employee with a complete address, we call the{" "}
                <span className="font-mono text-slate-200">
                  GetEmpowermentZone
                </span>{" "}
                API to retrieve{" "}
                <span className="font-mono text-slate-200">censusTract</span>{" "}
                and{" "}
                <span className="font-mono text-slate-200">zone</span>. These
                are added as two new columns in the output Excel.
              </p>

              <button
                type="submit"
                disabled={!file || processing}
                className="inline-flex h-10 items-center justify-center rounded-full border border-sky-500 bg-sky-500/20 px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-50 shadow-[0_0_18px_rgba(56,189,248,0.45)] transition hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-400"
              >
                {processing ? "Processing..." : "Process & Download Excel"}
              </button>

              {error && (
                <p className="text-xs text-rose-400" role="alert">
                  {error}
                </p>
              )}

              {summary && (
                <p className="text-[11px] text-slate-400">
                  Processed{" "}
                  <span className="font-semibold text-slate-100">
                    {summary.processed}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-100">
                    {summary.total}
                  </span>{" "}
                  rows. Zone lookups were attempted for{" "}
                  <span className="font-semibold text-emerald-300">
                    {summary.withAddress}
                  </span>{" "}
                  employees with complete address information. Rows with missing
                  address fields keep empty{" "}
                  <span className="font-mono text-slate-200">
                    censusTract
                  </span>{" "}
                  and{" "}
                  <span className="font-mono text-slate-200">zone</span>.
                </p>
              )}
            </div>

            {(downloadUrl || hasTable) && (
              <div className="space-y-4 pt-4">
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    download="employee-zones.xlsx"
                    className="inline-flex h-9 items-center justify-center rounded-full border border-emerald-500 bg-emerald-500/15 px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-50 shadow-[0_0_18px_rgba(16,185,129,0.45)] transition hover:bg-emerald-500/30"
                  >
                    Download Enriched Excel
                  </a>
                )}

                {hasTable && (
                  <div className="space-y-3">
                    <div className="max-h-[480px] overflow-auto rounded-2xl border border-slate-800 bg-slate-950/80">
                      <table className="min-w-full text-left text-[11px]">
                        <thead className="sticky top-0 bg-slate-900/95 text-[10px] uppercase tracking-[0.16em] text-slate-400">
                          <tr>
                            {columns.map((column) => (
                              <th key={column} className="px-3 py-2">
                                {column}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {pageRows.map((row, rowIndex) => (
                            <tr
                              key={startIndex + rowIndex}
                              className="border-t border-slate-800"
                            >
                              {columns.map((column) => {
                                const value = row[column];
                                return (
                                  <td key={column} className="px-3 py-2">
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

                    {totalPages > 1 && (
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>
                          Page {safePage} of {totalPages}
                        </span>
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            disabled={safePage <= 1}
                            onClick={() =>
                              setPage((prev) => Math.max(prev - 1, 1))
                            }
                            className="rounded-full border border-slate-700 px-3 py-1 uppercase tracking-[0.16em] disabled:opacity-40"
                          >
                            Previous
                          </button>
                          <button
                            type="button"
                            disabled={safePage >= totalPages}
                            onClick={() =>
                              setPage((prev) =>
                                prev < totalPages ? prev + 1 : prev
                              )
                            }
                            className="rounded-full border border-slate-700 px-3 py-1 uppercase tracking-[0.16em] disabled:opacity-40"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}
