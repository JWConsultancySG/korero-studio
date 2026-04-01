"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export const KORERO_LOGO_SRC = "/white_icon_color1_background.png";

type KoreroLogoProps = {
  className?: string;
  /** Tailwind / arbitrary size classes for the image (default fits nav / small marks). */
  imgClassName?: string;
  /** Intrinsic size for `next/image` (layout scales via `imgClassName`). */
  size?: number;
  priority?: boolean;
};

export function KoreroLogo({
  className,
  imgClassName,
  size = 256,
  priority = false,
}: KoreroLogoProps) {
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)}>
      <Image
        src={KORERO_LOGO_SRC}
        alt="Korero"
        width={size}
        height={size}
        className={cn("object-contain", imgClassName)}
        priority={priority}
      />
    </span>
  );
}
