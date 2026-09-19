import type { MouseEvent } from "react";
import { buttonVariants } from "@heroui/react";

export type MenuItem = { name: string; path: string };

type HomeProps = {
  items: MenuItem[];
  onNavigate: (path: string) => void;
};

export default function Home({ items, onNavigate }: HomeProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>, path: string) {
    // Modified clicks stay with the browser, so open-in-new-tab still works
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    onNavigate(path);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <nav
        aria-labelledby="home-title"
        className="flex w-64 flex-col items-center gap-6"
      >
        <h1 id="home-title" className="text-xl font-semibold text-foreground">
          HeroUI Playground
        </h1>
        <ul className="flex w-full flex-col gap-2">
          {items.map((item) => (
            <li key={item.path}>
              <a
                href={item.path}
                onClick={(event) => handleClick(event, item.path)}
                className={buttonVariants({
                  variant: "tertiary",
                  size: "lg",
                  fullWidth: true,
                  // HeroUI draws its focus ring off React Aria state, which a
                  // plain anchor lacks, so apply the same ring on focus-visible
                  className: "focus-visible:status-focused",
                })}
              >
                {item.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
