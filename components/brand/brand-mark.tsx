import Image from "next/image";
import type { CSSProperties, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import styles from "./brand-wordmark.module.css";

type BrandMarkProps = HTMLAttributes<HTMLSpanElement> & {
  framed?: boolean;
};

export function BrandMark({ className, framed = false, ...props }: BrandMarkProps) {
  return (
    <span
      role="img"
      aria-label="NovelNow"
      className={cn(
        "relative inline-flex aspect-[602/335] items-center justify-center overflow-visible",
        framed ? "rounded-[6px] bg-[#151517] p-1" : "bg-transparent",
        className,
      )}
      {...props}
    >
      <Image
        src="/Images/Logo/logo.png"
        alt=""
        fill
        sizes="64px"
        className="object-contain dark:hidden"
      />
      <Image
        src="/Images/Logo/logo-dark.png"
        alt=""
        fill
        sizes="64px"
        className="hidden object-contain dark:block"
      />
    </span>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  let index = 0;
  const part = (text: string, accent: boolean) =>
    text.split("").map((char) => (
      <span
        key={`${char}-${index}`}
        className={cn(styles.letter, accent && "text-(--brand-emphasis)")}
        style={{ "--i": index++ } as CSSProperties}
      >
        {char}
      </span>
    ));

  return (
    <span
      aria-label="NovelNow"
      className={cn(
        "relative inline-flex items-baseline font-(family-name:--font-wordmark) text-xl font-semibold leading-none tracking-[-0.01em]",
        className,
      )}
    >
      <span aria-hidden>
        {part("Novel", false)}
        {part("Now", true)}
      </span>
    </span>
  );
}
