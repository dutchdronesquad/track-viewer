import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  type TrackDrawViewerOptions,
  type ViewerViewState,
} from "@trackdraw/viewer";
import { scenarios } from "./scenarios";
import {
  choices,
  defaults,
  readState,
  stateQuery,
  type ScenarioState,
} from "./state";
import "./app.css";
import { Preview } from "./preview";
import { Showcase } from "./showcase";
import { Develop } from "./develop";

import { importTrack, type ImportedTrack } from "./import-track";

declare const __DEMO_DEV__: boolean;

function App() {
  const [state, setState] = useState(() => readState(location.search));
  const [settings, setSettings] = useState(false);
  const [search, setSearch] = useState("");
  const [imported, setImported] = useState<ImportedTrack | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetRevision, reset] = useState(0);
  const [effective, setEffective] = useState<ViewerViewState | null>(null);
  const [compared, setCompared] = useState<ViewerViewState | null>(null);
  const importRevision = useRef(0);
  const finetuneButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const pop = () => setState(readState(location.search));
    addEventListener("popstate", pop);
    return () => removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    history.replaceState(
      null,
      "",
      `/scenarios${stateQuery(state) ? `?${stateQuery(state)}` : ""}`
    );
  }, [state]);
  // Preview children tear down their React roots before archive object URLs are revoked.
  useEffect(
    () => () => {
      if (imported?.dispose)
        queueMicrotask(() => queueMicrotask(imported.dispose!));
    },
    [imported]
  );
  useEffect(() => {
    if (!__DEMO_DEV__) return;
    const source = new EventSource("/__reload");
    source.onmessage = () => location.reload();
    return () => {
      source.close();
    };
  }, []);
  useEffect(() => {
    if (!settings) return;
    const trigger = finetuneButton.current;
    const panel = document.getElementById("settings")!;
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettings(false);
      if (event.key !== "Tab") return;
      const controls = [
        ...panel.querySelectorAll<HTMLElement>("button, select, input"),
      ];
      const first = controls[0],
        last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("keydown", keyboard);
      trigger?.focus();
    };
  }, [settings]);
  const patch = <K extends keyof ScenarioState>(
    key: K,
    value: ScenarioState[K]
  ) => setState((s) => ({ ...s, [key]: value }));
  const scenario = scenarios.find((s) => s.id === state.scenario)!;
  const design = imported?.design ?? scenario.design;
  const options: TrackDrawViewerOptions = {
    design,
    ...(state.camera !== "default"
      ? {
          camera3D: {
            position: [
              design.field.width / 2,
              Math.max(design.field.width, design.field.height) *
                (state.camera === "overhead" ? 1.2 : 0.25),
              design.field.height / 2 +
                Math.max(design.field.width, design.field.height) *
                  (state.camera === "overhead" ? 0.01 : 0.8),
            ] as [number, number, number],
            target: [design.field.width / 2, 0, design.field.height / 2] as [
              number,
              number,
              number,
            ],
          },
        }
      : {}),
    ...(state.backs !== "default"
      ? {
          gateBackColors: Object.fromEntries(
            design.shapes
              .filter((shape) => shape.kind === "gate")
              .map((shape) => [
                shape.id,
                state.backs === "orange" ? "#f0761d" : "#1e93db",
              ])
          ),
        }
      : {}),
    ...(state.labels === "custom"
      ? {
          labels: {
            loading3D: "Preparing the 3D scene…",
            unavailable3D:
              "This browser cannot show 3D. Explore the 2D track below.",
            resetOverview: "Fit the track",
          },
        }
      : {}),
    view: state.view,
    presentation: state.presentation,
    theme: state.theme,
    unitSystem: state.units,
    showObstacleNumbers: state.numbers === "on",
    showViewControls: state.controls === "on",
    show3DAxes: state.axes === "on",
    showResetControl: state.reset === "on",
    forceWebglUnsupported: state.fallback === "on",
    ...(state.assets === "missing"
      ? { assetResolver: () => "/intentionally-missing-texture.webp" }
      : imported?.assetResolver
        ? { assetResolver: imported.assetResolver }
        : {}),
    onViewChange: (view) => patch("view", view),
  };
  async function load(file?: File) {
    if (!file) return;
    const revision = ++importRevision.current;
    setBusy(true);
    setNotice("");
    let next: ImportedTrack | undefined;
    try {
      next = await importTrack(file, revision);
      if (revision !== importRevision.current) {
        next.dispose?.();
        return;
      }
      setImported(next);
      setNotice(
        `Loaded ${file.name}. Local files are not included in preview URLs.`
      );
    } catch (error) {
      if (revision === importRevision.current)
        setNotice(
          error instanceof Error ? error.message : "Could not read this track."
        );
    } finally {
      if (revision === importRevision.current) setBusy(false);
    }
  }
  async function copyLink(clean = false) {
    if (imported) {
      setNotice(
        "Choose a built-in scenario to copy a reproducible URL. Local files stay in this browser."
      );
      return;
    }
    const url = new URL(location.href);
    url.pathname = "/scenarios";
    url.search = stateQuery({ ...state, clean: clean ? "on" : state.clean });
    try {
      await navigator.clipboard.writeText(url.href);
      setNotice("Preview URL copied.");
    } catch {
      setNotice(`Preview URL: ${url.href}`);
    }
  }
  const choose = (id: string) => {
    importRevision.current++;
    setBusy(false);
    setImported(null);
    setNotice("");
    patch("scenario", id);
  };
  const select = <K extends keyof ScenarioState>(key: K, title: string) => (
    <label className="setting" key={key}>
      <span>{title}</span>
      <select
        value={state[key]}
        onChange={(e) => patch(key, e.target.value as ScenarioState[K])}
      >
        {choices[key].map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </label>
  );
  const groups = ["Tracks", "Items", "Edge cases"];
  return (
    <div className={`scenarios ${state.clean === "on" ? "clean" : ""}`}>
      <header className="header" inert={settings}>
        <a className="brand" href="/" aria-label="TrackDraw Demo home">
          <span className="brand-symbol">↗</span>
          <strong>
            TrackDraw<span> / Demo</span>
          </strong>
        </a>
        <span className="dev-badge">DEVELOPMENT</span>
        <div className="header-actions">
          <label className="button import">
            {busy ? "Loading…" : "Import track"}
            <input
              type="file"
              accept=".json,.tdviewer.zip,.zip"
              disabled={busy}
              onChange={(e) => {
                void load(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <button onClick={() => void copyLink()}>Copy preview URL</button>
          <button
            className="primary"
            ref={finetuneButton}
            aria-expanded={settings}
            aria-controls="settings"
            onClick={() => setSettings((v) => !v)}
          >
            Finetune
          </button>
        </div>
      </header>
      <main className="workspace" inert={settings}>
        <aside className="scenarios">
          <div className="eyebrow">EXPLORE THE VIEWER</div>
          <h1>Choose a scene.</h1>
          <p className="muted">Real rendering. Repeatable scenarios.</p>
          <input
            className="search"
            type="search"
            aria-label="Search scenarios"
            placeholder="Find a scene…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {groups.map((group) => (
            <section key={group}>
              <h2>{group}</h2>
              {scenarios
                .filter(
                  (s) =>
                    s.group === group &&
                    `${s.name} ${s.description}`
                      .toLowerCase()
                      .includes(search.toLowerCase())
                )
                .map((s) => (
                  <button
                    key={s.id}
                    className={`scene ${!imported && s.id === state.scenario ? "selected" : ""}`}
                    aria-pressed={!imported && s.id === state.scenario}
                    onClick={() => choose(s.id)}
                  >
                    <span>{s.name}</span>
                    <span className="scene-arrow">↗</span>
                  </button>
                ))}
            </section>
          ))}
          <div className="sidebar-note">
            Scenario tools · public viewer API
            <br />
            No account or editor state.
          </div>
        </aside>
        <div className="stage-area">
          <div className="scene-heading">
            <div>
              <div className="eyebrow">
                {imported ? "LOCAL IMPORT" : scenario.group.toUpperCase()}
              </div>
              <h2>{imported?.name ?? scenario.name}</h2>
              <p className="muted">
                {imported
                  ? "Your track, rendered locally. Choose any scene to return to fixtures."
                  : scenario.description}
              </p>
            </div>
            <div className="view-switch" aria-label="Preview view">
              {(["2d", "3d"] as const).map((view) => (
                <button
                  key={view}
                  aria-pressed={state.view === view}
                  className={state.view === view ? "active" : ""}
                  onClick={() => patch("view", view)}
                >
                  {view.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div
            className={`stage background-${state.background} viewport-${state.viewport} ${state.compare === "on" ? "comparison" : ""}`}
          >
            <div className="preview-frame">
              <Preview
                key={imported?.id ?? scenario.id}
                options={options}
                resetRevision={resetRevision}
                onState={setEffective}
              />
            </div>
            {state.compare === "on" && (
              <div className="preview-frame">
                <Preview
                  key={`compare-${imported?.id ?? scenario.id}`}
                  options={{
                    ...options,
                    theme: state.theme === "light" ? "dark" : "light",
                    view: state.view === "3d" ? "2d" : "3d",
                  }}
                  resetRevision={resetRevision}
                  onState={setCompared}
                />
              </div>
            )}
          </div>
          <div className="stage-footer">
            <span>
              <span className="status-dot" />
              {effective
                ? `${effective.view.toUpperCase()}${!effective.available3D ? " · WebGL unavailable" : " · interactive"}`
                : "Initializing viewer…"}
              {state.compare === "on" && compared
                ? ` / ${compared.view.toUpperCase()} comparison`
                : ""}
            </span>
            <span>
              {design.field.width} × {design.field.height} m ·{" "}
              {design.shapes.length} items
            </span>
            <button onClick={() => reset((n) => n + 1)}>Reset overview</button>
          </div>
          <p className="notice" role="status">
            {notice}
          </p>
          {state.assets === "missing" && (
            <p className="asset-warning">
              Missing-asset mode: all requested textures intentionally return
              404. Choose Obstacle catalog to inspect the renderer’s fallback.
            </p>
          )}
          <details className="integration">
            <summary>Integration options</summary>
            <p className="muted">
              Supply your validated snapshot design. Runtime callbacks and local
              archive URLs are omitted below.
            </p>
            <pre>{`createTrackDrawViewer(container, ${JSON.stringify({ ...options, design: "snapshot.design", assetResolver: undefined, onViewChange: undefined }, null, 2)});`}</pre>
          </details>
        </div>
      </main>
      {settings && (
        <>
          <button
            className="scrim"
            tabIndex={-1}
            aria-label="Close finetune"
            onClick={() => setSettings(false)}
          />
          <div
            tabIndex={-1}
            id="settings"
            className="settings"
            role="dialog"
            aria-modal="true"
            aria-label="Finetune viewer"
          >
            <div className="settings-title">
              <h2>Finetune</h2>
              <button
                autoFocus
                aria-label="Close finetune"
                onClick={() => setSettings(false)}
              >
                ✕
              </button>
            </div>
            <p className="muted">
              Change the host and the viewer independently.
            </p>
            {select("presentation", "Presentation")}
            {select("theme", "Viewer theme")}
            {select("background", "Host background")}
            {select("viewport", "Container size")}
            {select("units", "Measurement units")}
            {select("camera", "Framed 3D camera")}
            {select("backs", "Unprinted gate backs")}
            {select("labels", "Overlay copy")}
            <h3>Viewer controls</h3>
            {select("numbers", "Obstacle numbers")}
            {select("controls", "View switch")}
            {select("axes", "3D axes")}
            {select("reset", "Reset overlay")}
            <h3>Runtime checks</h3>
            {select("compare", "Compare opposite theme / view")}
            {select("fallback", "Force WebGL unavailable")}
            {select("assets", "Catalog textures")}
            <p className="muted">
              Transparent presentation uses its canonical camera. Reset overview
              is a 3D presentation control.
            </p>
            <button
              onClick={() => {
                setState({ ...defaults, scenario: state.scenario });
              }}
            >
              Restore defaults
            </button>
            <button onClick={() => void copyLink(true)}>
              Copy clean preview URL
            </button>
          </div>
        </>
      )}
      {state.clean === "on" && (
        <button className="exit-clean" onClick={() => patch("clean", "off")}>
          Back to scenarios
        </button>
      )}
    </div>
  );
}
const page = location.pathname.replace(/\/$/, "");
createRoot(document.getElementById("root")!).render(
  page === "/scenarios" ? (
    <App />
  ) : page === "/develop" ? (
    <Develop />
  ) : (
    <Showcase />
  )
);
