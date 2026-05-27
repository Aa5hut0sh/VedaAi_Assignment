"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

type UserAvatarProps = {
  name?: string | null;
  seed?: string | null;
  size?: number;
  className?: string;
};

const buildAvatarUrl = (seed: string) =>
  `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

export default function UserAvatar({
  name,
  seed,
  size = 40,
  className = "",
}: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const avatarSeed = seed || name || "vedaai";

  const avatarUrl = useMemo(() => buildAvatarUrl(avatarSeed), [avatarSeed]);
  const initials = (name || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-linear-to-br from-orange-100 to-amber-200 text-orange-800 font-bold ${className}`}
        style={{ width: size, height: size }}
      >
        {initials || "U"}
      </div>
    );
  }

  return (
    <Image
      src={avatarUrl}
      alt={name ? `${name} avatar` : "Profile avatar"}
      className={`rounded-full object-cover bg-white ${className}`}
      width={size}
      height={size}
      unoptimized
      onError={() => setHasError(true)}
    />
  );
}
