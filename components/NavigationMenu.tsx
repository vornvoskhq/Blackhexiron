import * as React from "react";
import Link from "next/link";
import { cn } from "../utils/cn";

export function NavigationMenu() {
  return (
    <nav className="flex items-center justify-between py-4 px-8">
      <div className="font-mono text-2xl tracking-widest text-antarctica-ice">
        BLACKHEXIRON
      </div>
      <div className="flex gap-6 font-mono text-base text-antarctica-steel">
        <Link href="/"><span className="hover:text-antarctica-glitch">Home</span></Link>
        <Link href="/about"><span className="hover:text-antarctica-glitch">About</span></Link>
        <Link href="/roadmap"><span className="hover:text-antarctica-glitch">Roadmap</span></Link>
      </div>
    </nav>
  );
}