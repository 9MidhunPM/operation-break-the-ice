export function BrandHeader({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex flex-col items-center text-center animate-fade-in">
      <div className="flex items-center gap-3">
        <img
          src="/ieee-mark.svg"
          alt=""
          className="h-9 w-9"
          aria-hidden="true"
        />
        <span className="font-display text-2xl tracking-[0.25em] text-white">
          IEEE
        </span>
      </div>
      <span className="mt-1 text-[0.65rem] uppercase tracking-[0.4em] text-ieee-accent">
        Orientation
      </span>
      {subtitle ? (
        <p className="mt-3 text-sm text-white/60">{subtitle}</p>
      ) : null}
    </div>
  )
}
