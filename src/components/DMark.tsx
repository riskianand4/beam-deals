export function DMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer D */}
      <path d="M 25 10 L 25 90 L 55 90 C 77 90 93 74 93 50 C 93 26 77 10 55 10 Z" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
      {/* Inner D — consistent gap from outer */}
      <path d="M 40 26 L 40 74 L 55 74 C 70 74 78 64 78 50 C 78 36 70 26 55 26 Z" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
    </svg>
  );
}
