const adad = () => {
  return (
    <div>
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
          href={() => {}}
          className="mt-1 inline-flex h-9 items-center justify-center rounded-full border border-sky-500 bg-sky-500/15 px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-50 shadow-[0_0_18px_rgba(56,189,248,0.45)] transition hover:bg-sky-500/30"
        >
          Download Excel
        </a>
      </div>
    </div>
  );
};
