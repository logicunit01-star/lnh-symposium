import Link from "next/link";
export default function NotFound() {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-ink px-4 text-center">
      <div className="orb left-1/4 top-1/4 h-96 w-96 bg-lnh-blue/30" /><div className="orb bottom-1/4 right-1/4 h-80 w-80 bg-lnh-red/25" />
      <div className="relative">
        <p className="h-display text-[30vw] leading-none text-white/5 sm:text-[14rem]">404</p>
        <h1 className="h-display -mt-10 text-4xl text-white">Page not found</h1>
        <p className="mt-3 text-slate-400">The page you’re looking for doesn’t exist or has moved.</p>
        <Link href="/" className="btn-primary mt-8">Back to home</Link>
      </div>
    </div>
  );
}
