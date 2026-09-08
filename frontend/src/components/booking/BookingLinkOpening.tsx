"use client";

/**
 * Shared loading / error shell for booking-link and trip-code resolvers.
 * Styled to match the public `/book` wizard (not admin chrome).
 */
export function BookingLinkOpening({ error }: { error?: string }) {
  return (
    <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 pt-[72px] md:pt-[80px] font-montserrat">
      <div className="max-w-md w-full bg-white border border-slate-200/90 rounded-[24px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        {error ? (
          <>
            <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#D4541A] bg-[#D4541A]/10 px-2 py-0.5 rounded-full">
              Booking Link
            </span>
            <h1 className="mt-3 text-lg font-black tracking-tight text-slate-900">
              Booking link unavailable
            </h1>
            <p className="mt-2 text-sm text-slate-600 font-medium leading-relaxed">
              {error}
            </p>
            <a
              href="/trips"
              className="mt-5 inline-flex items-center justify-center w-full h-11 rounded-xl bg-[#D4541A] text-white text-sm font-extrabold uppercase tracking-wider hover:bg-[#c2460e] transition-colors"
            >
              Browse trips
            </a>
          </>
        ) : (
          <>
            <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#D4541A] bg-[#D4541A]/10 px-2 py-0.5 rounded-full">
              Trrabb
            </span>
            <h1 className="mt-3 text-lg font-black tracking-tight text-slate-900">
              Opening your booking…
            </h1>
            <p className="mt-2 text-sm text-slate-600 font-medium">
              Taking you to the same checkout as our website.
            </p>
            <div className="mt-5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full w-1/2 rounded-full bg-[#D4541A] animate-pulse" />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
