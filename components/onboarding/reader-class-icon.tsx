import Image from "next/image";

import { cn } from "@/lib/utils";

export function ReaderClassIcon({
  src,
  className,
  sizes = "40px",
}: {
  src: string;
  className?: string;
  sizes?: string;
}) {
  return (
    <Image
      src={src}
      alt=""
      aria-hidden
      width={1254}
      height={1254}
      sizes={sizes}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
