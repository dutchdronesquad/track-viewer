// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DemoNavigation } from "../../demo/navigation";

let root: Root;
let mobile: boolean;
let resize: () => void;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mobile = true;
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return mobile;
    },
    addEventListener: (_type: string, listener: () => void) => {
      resize = listener;
    },
    removeEventListener: vi.fn(),
  }));
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

async function setup() {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <DemoNavigation
        label="Showcase"
        links={[{ href: "#track", label: "The track" }]}
      />
    );
  });
  const trigger = container.querySelector<HTMLButtonElement>("button")!;
  await act(async () => trigger.click());
  return trigger;
}

it("dismisses mobile navigation with Escape and restores focus to its trigger", async () => {
  const trigger = await setup();
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  expect(trigger.getAttribute("aria-expanded")).toBe("true");
  await act(async () => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

it("releases the modal when resizing back to desktop", async () => {
  const trigger = await setup();
  expect(document.body.style.pointerEvents).toBe("none");
  await act(async () => {
    mobile = false;
    resize();
  });
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(document.body.style.pointerEvents).not.toBe("none");
});
