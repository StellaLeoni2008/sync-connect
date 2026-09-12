import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SyncLogo } from "@/components/brand/sync-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import lifestyle from "@/assets/band/lifestyle.jpg.asset.json";
import midnight from "@/assets/band/midnight.jpg.asset.json";
import sand from "@/assets/band/sand.jpg.asset.json";
import rose from "@/assets/band/rose.jpg.asset.json";
import olive from "@/assets/band/olive.jpg.asset.json";
import sky from "@/assets/band/sky.jpg.asset.json";
import lavender from "@/assets/band/lavender.jpg.asset.json";
import texasTechRed from "@/assets/band/texas-tech-red.jpg.asset.json";

export const Route = createFileRoute("/band")({
  head: () => ({
    meta: [
      { title: "SYNC Band — Small. Smart. Always with you." },
      { name: "description", content: "A minimal, screenless companion for ambient real-world discovery." },
      { property: "og:title", content: "SYNC Band" },
      { property: "og:description", content: "Looks like an accessory. Built for real connections." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Band,
});

const COLORS = [
  { id: "midnight", name: "Midnight", tagline: "Classic. Always works.", swatch: "#1A1C1E", img: midnight.url },
  { id: "sand", name: "Sand", tagline: "Minimal. Effortless. Anywhere.", swatch: "#D9CDBB", img: sand.url },
  { id: "rose", name: "Rose", tagline: "Bold. Friendly. Connected.", swatch: "#D4A3A6", img: rose.url },
  { id: "olive", name: "Olive", tagline: "Natural. Versatile. Always with you.", swatch: "#8B8B6E", img: olive.url },
  { id: "sky", name: "Sky", tagline: "Calm. Open. Infinite possibilities.", swatch: "#A8C4DE", img: sky.url },
  { id: "lavender", name: "Lavender", tagline: "Creative. Unique. You.", swatch: "#B9AECB", img: lavender.url },
  { id: "texas-tech-red", name: "Texas Tech Red", tagline: "Special Edition", swatch: "#C8102E", img: texasTechRed.url, special: true },
] as const;

type Color = (typeof COLORS)[number];

function Band() {
  const [selected, setSelected] = useState<Color>(COLORS[0]);

  return (
    <main className="bg-background text-foreground">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-7">
        <a href="/" aria-label="SYNC home">
          <SyncLogo className="text-2xl" />
        </a>
        <Button asChild size="sm">
          <a href="/auth">Get Started</a>
        </Button>
      </nav>

      {/* Hero: full lifestyle image, original proportions, no overlay text */}
      <section className="mx-auto max-w-6xl px-5 pb-24 pt-4 sm:pb-32">
        <img
          src={lifestyle.url}
          alt="Person wearing the black SYNC Band — the real world connects here"
          width={1024}
          height={1536}
          className="mx-auto w-full max-w-3xl rounded-2xl"
        />
      </section>

      {/* Color selector */}
      <section className="mx-auto max-w-6xl px-5 pb-32 text-center">
        <h2 className="text-4xl font-medium tracking-[-.04em] sm:text-6xl">Choose your SYNC.</h2>

        {/* Fixed-dimension stage: all images crossfade in place, no layout shift */}
        <div className="relative mx-auto mt-12 aspect-[3/2] w-full max-w-4xl sm:mt-16">
          {COLORS.map((color) => (
            <img
              key={color.id}
              src={color.img}
              alt={`SYNC Band in ${color.name}`}
              width={1536}
              height={1024}
              loading={color.id === "midnight" ? "eager" : "lazy"}
              aria-hidden={selected.id !== color.id}
              className={cn(
                "absolute inset-0 h-full w-full rounded-2xl object-cover transition-opacity duration-500 ease-out",
                selected.id === color.id ? "opacity-100" : "opacity-0",
              )}
            />
          ))}
        </div>

        <div className="mt-10">
          <p className="text-lg font-medium">{selected.name}</p>
          <p className={cn("mt-1 text-sm", selected.special ? "text-[#C8102E]" : "text-muted-foreground")}>
            {selected.tagline}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3" role="radiogroup" aria-label="Band color">
          {COLORS.map((color) => (
            <button
              key={color.id}
              type="button"
              role="radio"
              aria-checked={selected.id === color.id}
              aria-label={color.special ? `${color.name} — Special Edition` : color.name}
              title={color.special ? `${color.name} — Special Edition` : color.name}
              onClick={() => setSelected(color)}
              className={cn(
                "h-9 w-9 rounded-full border border-black/10 transition-all duration-200",
                selected.id === color.id
                  ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                  : "hover:scale-105",
              )}
              style={{ backgroundColor: color.swatch }}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
