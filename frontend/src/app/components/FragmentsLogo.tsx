"use client";

import Image from "next/image";

interface FragmentsLogoProps {
  size?: number;
  variant?: "icon" | "wordmark" | "wordmark-accent";
  className?: string;
}

export default function FragmentsLogo({
  size = 32,
  variant = "wordmark",
  className = "",
}: FragmentsLogoProps) {
  if (variant === "icon") {
    return (
      <Image
        src="/fragments-logo.svg"
        alt="Fragments"
        width={size}
        height={size}
        className={className}
        priority
      />
    );
  }

  // Wordmark SVG is 280×54 — scale height to `size`, width proportional.
  const height = Math.round(size * 1.2);
  const width = Math.round(height * (280 / 54));
  return (
    <Image
      src="/fragments-logo-wordmark.svg"
      alt="Fragments"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}
