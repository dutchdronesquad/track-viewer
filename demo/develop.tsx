import { useEffect, useState } from "react";
import type {
  ViewerViewState,
  ViewerView,
  MeasurementUnitSystem,
} from "@trackdraw/viewer";
import { Preview } from "./preview";
import { DemoNavigation } from "./navigation";
import { recipes, recipeCode, downloadSample, eventTracks } from "./examples";
import logo from "./assets/trackdraw-logo-color-darkbg.svg";
import "./develop.css";

declare const __DEMO_DEV__: boolean;
export function Develop() {
  const [selected, select] = useState(
    () =>
      recipes.find(
        (recipe) =>
          recipe.id === new URLSearchParams(location.search).get("recipe")
      ) ?? recipes[0]
  );
  const [track, setTrack] = useState<(typeof eventTracks)[number]>(
    eventTracks[0]
  );
  const [view, setView] = useState<ViewerView>("3d");
  const [units, setUnits] = useState<MeasurementUnitSystem>("metric");
  const [state, setState] = useState<ViewerViewState | null>(null);
  const [resetRevision, reset] = useState(0);
  const [copied, setCopied] = useState("");
  useEffect(() => {
    document.title = "TrackDraw · Developer examples";
    if (!__DEMO_DEV__) return;
    const stream = new EventSource("/__reload");
    stream.onmessage = () => location.reload();
    return () => stream.close();
  }, []);
  const options = {
    ...selected.options,
    ...(selected.id === "controls" ? { view } : {}),
    ...(selected.id === "briefing" ? { unitSystem: units } : {}),
  };
  const code = recipeCode(
    selected,
    options,
    selected.id === "controls" ? `${track.id}.snapshot.json` : undefined
  );
  const markup = `<div id="track" style="height: 420px; width: 100%;"></div>\n<p id="status" role="status"></p>${selected.id === "hero" ? '\n<button id="reset">Reset view</button>' : ""}${selected.id === "controls" ? '\n<button data-view="2d">2D</button>\n<button data-view="3d">3D</button>\n<button data-track="./qualifying.snapshot.json">Qualifying</button>\n<button data-track="./final.snapshot.json">Final</button>' : ""}`;
  async function copy(value: string, kind: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(`${kind} copied`);
    } catch {
      setCopied("Copy unavailable. Select and copy the code below.");
    }
  }
  return (
    <div className="developer">
      <header className="developer-nav">
        <div className="developer-nav-inner">
          <a href="/">
            <img src={logo} alt="TrackDraw" width={180} height={35} />
          </a>
          <DemoNavigation
            label="Developer navigation"
            links={[
              { href: "/", label: "Showcase" },
              { href: "/scenarios", label: "Scenario tools ↗" },
              {
                href: "https://github.com/dutchdronesquad/track-viewer",
                label: "GitHub ↗",
                external: true,
              },
            ]}
          />
        </div>
      </header>
      <main className="developer-main">
        <div className="developer-intro">
          <p className="dev-eyebrow">BUILD WITH TRACKDRAW</p>
          <h1>
            From a live track
            <br />
            to your own website.
          </h1>
          <p>
            A demo of the @trackdraw/viewer package. Working examples, the
            options behind them, and code you can take with you.
          </p>
          <p className="development-build-note">
            These examples use the current development build. New options may
            not yet be available in the latest npm release.{" "}
            <a href="https://github.com/dutchdronesquad/track-viewer">
              View the package source ↗
            </a>
          </p>
        </div>
        <div className="developer-layout">
          <nav className="recipe-nav" aria-label="Integration examples">
            {recipes.map((recipe, i) => (
              <button
                key={recipe.id}
                aria-current={selected.id === recipe.id ? "page" : undefined}
                onClick={() => {
                  select(recipe);
                  setState(null);
                  setCopied("");
                  setView("3d");
                  setUnits("metric");
                  setTrack(eventTracks[0]);
                  history.replaceState(
                    null,
                    "",
                    `/develop?recipe=${recipe.id}`
                  );
                }}
              >
                <small>0{i + 1}</small>
                <span>
                  {recipe.title}
                  <small>{recipe.use}</small>
                </span>
              </button>
            ))}
          </nav>
          <section className="recipe-content" aria-labelledby="recipe-title">
            <div className="recipe-heading">
              <div>
                <p className="dev-eyebrow">{selected.use}</p>
                <h2 id="recipe-title">{selected.title}</h2>
              </div>
              {selected.id === "controls" ? (
                <div className="recipe-downloads">
                  {eventTracks.map((sample) => (
                    <button
                      key={sample.id}
                      onClick={() =>
                        downloadSample(
                          sample.design,
                          `${sample.id}.snapshot.json`
                        )
                      }
                    >
                      Download {sample.label.toLowerCase()} ↓
                    </button>
                  ))}
                </div>
              ) : (
                <button onClick={() => downloadSample(selected.design)}>
                  Download sample track ↓
                </button>
              )}
            </div>
            <p className="recipe-explanation">{selected.explanation}</p>
            <div
              className={`recipe-preview ${selected.id === "hero" ? "recipe-hero" : ""}`}
            >
              <div className="recipe-preview-bar">
                <span>LIVE PREVIEW</span>
                <div>
                  {selected.id === "controls" &&
                    (["2d", "3d"] as const).map((mode) => (
                      <button
                        key={mode}
                        aria-pressed={view === mode}
                        onClick={() => setView(mode)}
                      >
                        {mode.toUpperCase()}
                      </button>
                    ))}
                  {selected.id === "briefing" &&
                    (["metric", "imperial"] as const).map((unit) => (
                      <button
                        key={unit}
                        aria-pressed={units === unit}
                        onClick={() => setUnits(unit)}
                      >
                        {unit === "metric" ? "Metres" : "Feet"}
                      </button>
                    ))}
                  {selected.id === "hero" && (
                    <button onClick={() => reset((n) => n + 1)}>
                      Reset view ↺
                    </button>
                  )}
                </div>
              </div>
              {selected.id === "controls" && (
                <div
                  className="recipe-track-picker"
                  role="group"
                  aria-label="Preview race session"
                >
                  {eventTracks.map((sample) => (
                    <button
                      key={sample.id}
                      aria-pressed={track.id === sample.id}
                      onClick={() => setTrack(sample)}
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="recipe-mount">
                <Preview
                  key={selected.id}
                  options={{
                    design:
                      selected.id === "controls"
                        ? track.design
                        : selected.design,
                    ...options,
                    ...(selected.id === "controls"
                      ? { onViewChange: setView }
                      : {}),
                  }}
                  resetRevision={resetRevision}
                  onState={setState}
                />
              </div>
              <p className="recipe-status" role="status">
                {state
                  ? state.available3D
                    ? `Viewing in ${state.view.toUpperCase()}`
                    : "Viewing in 2D: 3D is unavailable"
                  : "Loading track…"}
              </p>
            </div>
            <div className="code-heading">
              <h3>1. Install</h3>
            </div>
            <pre>
              <code>npm install @trackdraw/viewer</code>
            </pre>
            <div className="code-heading">
              <h3>2. Give the viewer a home</h3>
              <button onClick={() => void copy(markup, "HTML")}>
                Copy HTML
              </button>
            </div>
            <p className="code-note">
              The container needs an explicit height. Transparent presentation
              also needs a background on your host page.
            </p>
            <pre>
              <code>{markup}</code>
            </pre>
            <div className="code-heading">
              <h3>3. Load and mount</h3>
              <button onClick={() => void copy(code, "JavaScript")}>
                Copy JavaScript
              </button>
            </div>
            <p className="code-note">
              For an ESM project with a bundler. This uses the development API;
              mountTrack will be available in the next npm release. Save{" "}
              {selected.id === "controls" ? (
                "both downloaded snapshots"
              ) : (
                <>
                  the sample as <code>track.snapshot.json</code>
                </>
              )}{" "}
              beside your page. The options below match this preview
              {selected.id === "fallback"
                ? "; simulated WebGL failure is shown separately as a development-only switch"
                : ""}
              .
            </p>
            <pre>
              <code>{code}</code>
            </pre>
            <p role="status" className="copy-status">
              {copied}
            </p>
            <details>
              <summary>Loading errors and component cleanup</summary>
              <p>
                mountTrack rejects failed downloads, invalid tracks and
                unsupported viewer requirements. Show an error in your own page.
                Cancel loading if your component unmounts before the viewer is
                ready.
              </p>
              <pre>
                <code>{`const controller = new AbortController();
let viewer;
try {
  viewer = await mountTrack("#track", {
    source: "./track.snapshot.json",
    signal: controller.signal,
  });
} catch (error) {
  if (!controller.signal.aborted) {
    document.querySelector("#status").textContent = "Could not load the track";
  }
}

// Run from your component's cleanup hook, including while loading:
// controller.abort();
// viewer?.destroy();`}</code>
              </pre>
            </details>
            <div className="recipe-next">
              <h3>Bring your own track</h3>
              <p>
                Export a viewer snapshot or .tdviewer.zip from TrackDraw. Use
                the <a href="/scenarios">scenario tools</a> to check it locally
                before integrating. Keep API credentials on your server.
              </p>
              <details>
                <summary>Load an offline archive</summary>
                <pre>
                  <code>{`// The same viewer can load a hosted archive:
await viewer.setSource("./track.tdviewer.zip");

// Or a File from an <input type="file">:
await viewer.setSource(file);

// destroy() also releases the archive's texture URLs.
// viewer.destroy();`}</code>
                </pre>
              </details>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
