import Image from "next/image";
import Link from "next/link";

type AppLogoProps = {
  href?: string;
  compact?: boolean;
};

export default function AppLogo({
  href = "/dashboard",
  compact = false,
}: AppLogoProps) {
  return (
    <Link href={href} className="flex items-center gap-2">
      <Image
        src="/images/logo.png"
        alt="VedaAI logo"
        width={compact ? 32 : 36}
        height={compact ? 32 : 36}
        priority
      />
      {!compact && (
        <span className="text-xl font-bold text-gray-900 tracking-tight">
          VedaAI
        </span>
      )}
    </Link>
  );
}
