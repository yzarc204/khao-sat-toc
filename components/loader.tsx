import Image from "next/image";

export default function Loader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-cultured px-4">
      <Image
        src="/images/tlu.webp"
        alt="TLU Logo"
        width={220}
        height={220}
        priority
        className="h-auto w-[160px] sm:w-[220px]"
      />

      <div className="flex items-center gap-2" aria-label="Đang tải">
        <span className="loader-dot" />
        <span className="loader-dot loader-dot-delay-1" />
        <span className="loader-dot loader-dot-delay-2" />
      </div>
    </div>
  );
}
