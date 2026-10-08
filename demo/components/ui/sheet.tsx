// Adapted from shadcn/ui's MIT-licensed Sheet for the demo's plain CSS theme.
import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetTitle = SheetPrimitive.Title;
const SheetDescription = SheetPrimitive.Description;

function SheetContent({
  className,
  children,
  closeLabel = "Close",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  closeLabel?: string;
}) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="demo-sheet-overlay" />
      <SheetPrimitive.Content
        className={["demo-sheet", className].filter(Boolean).join(" ")}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          className="demo-sheet-close"
          aria-label={closeLabel}
        >
          <X size={20} aria-hidden />
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

function SheetHeader(props: React.ComponentProps<"div">) {
  return <div className="demo-sheet-header" {...props} />;
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
};
