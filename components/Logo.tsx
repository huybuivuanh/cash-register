import Image from "next/image";
import Link from "next/link";

/**
 * "ASIAN [Vietnam map] LE REGISTER", styled like the website logo.
 * Light text, so place it on the dark `bg-ink` background.
 */
export function Logo({ href, large = false }: { href?: string; large?: boolean }) {
  const word = `${large ? "text-3xl" : "text-xl"} font-extrabold tracking-wide transition group-hover:text-gold`;
  const content = (
    <>
      <span className={word}>ASIAN</span>
      <Image
        src="/logo.png"
        alt=""
        width={28}
        height={40}
        className={large ? "h-14 w-10 object-contain" : "h-10 w-7 object-contain"}
        unoptimized
      />
      <span className={word}>LE</span>
      <span className={`ml-1 font-bold uppercase tracking-widest text-gold ${large ? "text-sm" : "text-xs"}`}>
        Register
      </span>
    </>
  );

  if (!href) {
    return (
      <div className="flex shrink-0 items-center gap-1 text-on-ink" aria-label="Asian Le Register" role="img">
        {content}
      </div>
    );
  }
  return (
    <Link
      href={href}
      aria-label="Asian Le Register – Home"
      className="group flex shrink-0 items-center gap-1 rounded-md text-on-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
    >
      {content}
    </Link>
  );
}
