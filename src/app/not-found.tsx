import Link from "next/link";

export default function NotFound() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ backgroundColor: "#050506" }}
    >
      <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a0b] p-8 text-center">
        <p className="text-4xl font-bold" style={{ color: "#b11226" }}>
          404
        </p>
        <h1 className="mt-3 text-xl font-semibold text-zinc-100">Nothing here</h1>
        <p className="mt-2 text-sm text-zinc-500">
          That page doesn&rsquo;t exist.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full border border-white/[0.14] px-5 py-2 text-sm text-zinc-300 transition hover:border-white/30 hover:text-white"
        >
          ← Back to Airdrop Web
        </Link>
      </div>
    </main>
  );
}
