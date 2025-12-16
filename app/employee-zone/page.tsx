"use client";

import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";

type Summary = {
  total: number;
  withAddress: number;
};

type PreviewRow = Record<string, unknown>;

export default function EmployeeZonePage() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);

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
    setPreviewRows([]);
    setPreviewColumns([]);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSummary(null);
    setPreviewRows([]);
    setPreviewColumns([]);

    if (!file) {
      setError("Please choose an Excel file first.");
      return;
    }

    setProcessing(true);

    try {
      const formData = new FormData();
      formData.set("file", file);

      const res = await fetch("/api/employee-zone", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let message = "Failed to process Excel file.";
        try {
          const data = await res.json();
          if (data && typeof data.error === "string") {
            message = data.error;
          }
        } catch {
          // response was not JSON – ignore
        }
        setError(message);
        setProcessing(false);
        return;
      }

      const total = Number(res.headers.get("X-Rows-Total") ?? "0");
      const withAddress = Number(res.headers.get("X-Rows-With-Address") ?? "0");

      setSummary({
        total,
        withAddress,
      });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

      try {
        const buffer = await blob.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<PreviewRow>(sheet, {
          defval: "",
        });
        const rows = json.slice(0, 10);
        const columnsSet = new Set<string>();
        rows.forEach((row) => {
          Object.keys(row).forEach((key) => columnsSet.add(key));
        });
        setPreviewRows(rows);
        setPreviewColumns(Array.from(columnsSet));
      } catch {
        // preview is optional – ignore errors
      }
    } catch {
      setError("Something went wrong while contacting the server.");
    } finally {
      setProcessing(false);
    }
  };

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
                    {summary.total}
                  </span>{" "}
                  rows. Zone data was looked up for{" "}
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

            {downloadUrl && (
              <div className="space-y-4 pt-2">
                <a
                  href={downloadUrl}
                  download="employee-zones.xlsx"
                  className="inline-flex h-9 items-center justify-center rounded-full border border-emerald-500 bg-emerald-500/15 px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-50 shadow-[0_0_18px_rgba(16,185,129,0.45)] transition hover:bg-emerald-500/30"
                >
                  Download Enriched Excel
                </a>

                {previewRows.length > 0 && previewColumns.length > 0 && (
                  <div className="max-h-64 overflow-auto rounded-2xl border border-slate-800 bg-slate-950/80">
                    <table className="min-w-full text-left text-[11px]">
                      <thead className="sticky top-0 bg-slate-900/95 text-[10px] uppercase tracking-[0.16em] text-slate-400">
                        <tr>
                          {previewColumns.map((column) => (
                            <th key={column} className="px-3 py-2">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, rowIndex) => (
                          <tr
                            key={rowIndex}
                            className="border-t border-slate-800"
                          >
                            {previewColumns.map((column) => {
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
                )}
              </div>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}
