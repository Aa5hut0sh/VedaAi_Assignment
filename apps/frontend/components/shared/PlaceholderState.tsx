import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

type PlaceholderStateProps = {
  title: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
};

export default function PlaceholderState({
  title,
  description,
  ctaHref,
  ctaLabel,
}: PlaceholderStateProps) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center rounded-[28px] border border-white/70 bg-white/85 p-8 text-center shadow-[0_18px_60px_-28px_rgba(0,0,0,0.25)] backdrop-blur-sm">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1c1c1e] text-white shadow-lg shadow-black/10">
        <Sparkles className="h-7 w-7 text-orange-400" />
      </div>
      <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
      <p className="mt-3 max-w-lg text-sm leading-6 text-gray-500">
        {description}
      </p>
      <Link
        href={ctaHref}
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#1c1c1e] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-black"
      >
        {ctaLabel}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
