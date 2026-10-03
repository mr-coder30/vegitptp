import Image from "next/image";
import Link from "next/link";

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-2xl items-center px-4">
        <Link
          href="/"
          className="flex items-center"
          aria-label="VegitPTP home"
        >
          <div className="relative h-10 w-10 shrink-0">
            <Image
              src="/vegitptp-icon.png"
              alt="VegitPTP"
              fill
              priority
              sizes="40px"
              className="object-contain"
            />
          </div>

          <div className="ml-3">
            <h1 className="text-lg font-bold leading-tight tracking-tight text-green-700">
              VegitPTP
            </h1>

            <p className="text-xs leading-tight text-gray-500">
              Fresh vegetables in Pithapuram
            </p>
          </div>
        </Link>
      </div>
    </header>
  );
}