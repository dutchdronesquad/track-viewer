import { scenarios } from "./scenarios";
export const choices = {
  scenario: scenarios.map((s) => s.id),
  view: ["3d", "2d"],
  presentation: ["framed", "transparent"],
  theme: ["light", "dark"],
  background: ["paper", "night", "gradient", "checker"],
  viewport: ["fluid", "desktop", "tablet", "phone"],
  units: ["metric", "imperial"],
  numbers: ["on", "off"],
  controls: ["on", "off"],
  axes: ["on", "off"],
  reset: ["on", "off"],
  fallback: ["off", "on"],
  compare: ["off", "on"],
  assets: ["online", "missing"],
  clean: ["off", "on"],
  camera: ["default", "overhead", "low"],
  backs: ["default", "orange", "blue"],
  labels: ["default", "custom"],
} as const;
export type ScenarioState = {
  [K in keyof typeof choices]: (typeof choices)[K][number];
};
export const defaults: ScenarioState = {
  scenario: "circuit",
  view: "3d",
  presentation: "framed",
  theme: "light",
  background: "paper",
  viewport: "fluid",
  units: "metric",
  numbers: "on",
  controls: "on",
  axes: "on",
  reset: "on",
  fallback: "off",
  compare: "off",
  assets: "online",
  clean: "off",
  camera: "default",
  backs: "default",
  labels: "default",
};
export function readState(search: string): ScenarioState {
  const params = new URLSearchParams(search);
  return Object.fromEntries(
    Object.entries(choices).map(([key, values]) => {
      const value = params.get(key);
      return [
        key,
        value && (values as readonly string[]).includes(value)
          ? value
          : defaults[key as keyof ScenarioState],
      ];
    })
  ) as ScenarioState;
}
export function stateQuery(state: ScenarioState): string {
  return new URLSearchParams(
    Object.entries(state).filter(
      ([key, value]) => value !== defaults[key as keyof ScenarioState]
    )
  ).toString();
}
