import Image from "next/image";

const LOGO_SRC = "/vamc.jpeg";
const LOGO_ALT = "Varun Arjun Medical College & Rohilkhand Hospital";

type HospitalLogoProps = {
  /** Full banner for auth screens; compact for sidebar; bar for mobile top nav */
  variant?: "header" | "compact" | "bar";
  className?: string;
  priority?: boolean;
};

const VARIANT_STYLES: Record<NonNullable<HospitalLogoProps["variant"]>, string> = {
  header: "h-12 sm:h-14",
  compact: "h-10",
  bar: "h-8",
};

export default function HospitalLogo({
  variant = "header",
  className = "",
  priority = false,
}: HospitalLogoProps) {
  const align = variant === "header" ? "object-center" : "object-left";

  return (
    <div className={`relative w-full ${VARIANT_STYLES[variant]} ${className}`}>
      <Image
        src={LOGO_SRC}
        alt={LOGO_ALT}
        fill
        sizes={
          variant === "bar"
            ? "(max-width: 1024px) 70vw, 240px"
            : variant === "compact"
              ? "256px"
              : "(max-width: 640px) 90vw, 360px"
        }
        className={`object-contain ${align}`}
        priority={priority}
      />
    </div>
  );
}