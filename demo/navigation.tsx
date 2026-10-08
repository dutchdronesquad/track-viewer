import { useEffect, useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./components/ui/sheet";
import logo from "./assets/trackdraw-logo-color-darkbg.svg";
import "./navigation.css";

export function DemoNavigation({
  label,
  links,
  badge,
}: {
  label: string;
  links: { href: string; label: string; external?: boolean }[];
  badge?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 768px)");
    const onResize = () => {
      if (!mobile.matches) setOpen(false);
    };
    mobile.addEventListener("change", onResize);
    return () => mobile.removeEventListener("change", onResize);
  }, []);
  const linkElements = (mobile: boolean) =>
    links.map((link) => {
      const anchor = (
        <a
          key={link.href}
          href={link.href}
          target={link.external ? "_blank" : undefined}
          rel={link.external ? "noopener noreferrer" : undefined}
        >
          {link.label}
        </a>
      );
      return mobile ? (
        <SheetClose key={link.href} asChild>
          {anchor}
        </SheetClose>
      ) : (
        anchor
      );
    });
  return (
    <>
      <nav className="demo-navigation" aria-label={label}>
        {badge}
        {linkElements(false)}
      </nav>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="demo-nav-toggle" aria-label="Open navigation">
            <Menu size={20} aria-hidden />
            <span>Menu</span>
          </button>
        </SheetTrigger>
        <SheetContent closeLabel="Close navigation">
          <SheetHeader>
            <SheetTitle className="demo-sheet-brand">
              <img src={logo} alt="TrackDraw" width={130} height={26} />
              <span className="demo-badge">Demo</span>
            </SheetTitle>
            <SheetDescription className="demo-nav-description">
              Choose a page or section to explore.
            </SheetDescription>
          </SheetHeader>
          <nav className="demo-sheet-navigation" aria-label={label}>
            {linkElements(true)}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
