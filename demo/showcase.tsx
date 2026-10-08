import { useEffect, useRef, useState, type CSSProperties } from "react";
import type {
  TrackDrawViewerOptions,
  MeasurementUnitSystem,
  ViewerView,
  ViewerViewState,
} from "@trackdraw/viewer";
import {
  createCatalogShapeDraft,
  type TrackElementCatalogId,
} from "../packages/viewer/src/lib/track/elements/catalog";
import { scenarios } from "./scenarios";
import { Preview } from "./preview";
import "./showcase.css";
import logoDark from "./assets/trackdraw-logo-color-darkbg.svg";
import logoLight from "./assets/trackdraw-logo-color-lightbg.svg";
import { eventTracks } from "./examples";

declare const __DEMO_DEV__: boolean;
const circuit = scenarios.find((scene) => scene.id === "circuit")!.design;
const items: {
  id: TrackElementCatalogId;
  title: string;
  category: string;
  detail: string;
}[] = [
  {
    id: "multigp-standard-gate-5x5",
    title: "The classic gate",
    category: "PRECISION",
    detail: "A familiar opening. A perfect line.",
  },
  {
    id: "multigp-double-gate-tower-5x5",
    title: "A different level",
    category: "ALTITUDE",
    detail: "Stacked openings, new perspectives.",
  },
  {
    id: "multigp-corner-flag",
    title: "Make the turn",
    category: "FLOW",
    detail: "A small marker with a big role.",
  },
];
const itemDesigns = items.map((item) => ({
  ...circuit,
  title: item.title,
  field: { ...circuit.field, width: 4, height: 4 },
  shapes: [
    {
      ...createCatalogShapeDraft(item.id, {
        x: 2,
        y: 2,
        includeCatalogMetadata: true,
      }),
      id: item.id,
    },
  ],
}));

// Mount only the examples currently in view, so a long showcase does not keep
// several offscreen WebGL scenes and animation loops alive.
function Example({
  options,
  resetRevision = 0,
  onState,
}: {
  options: TrackDrawViewerOptions;
  resetRevision?: number;
  onState: (state: ViewerViewState) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "100px" }
    );
    observer.observe(host.current!);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={host} className="showcase-example">
      {visible && (
        <Preview
          options={options}
          resetRevision={resetRevision}
          onState={onState}
        />
      )}
    </div>
  );
}
const ignoreState = () => {};
export function Showcase() {
  const [eventTrack, setEventTrack] = useState<(typeof eventTracks)[number]>(
    eventTracks[0]
  );
  const [view, setView] = useState<ViewerView>("3d");
  const [heroState, setHeroState] = useState<ViewerViewState | null>(null);
  const [trackState, setTrackState] = useState<ViewerViewState | null>(null);
  const [resetRevision, reset] = useState(0);
  const [night, setNight] = useState(false);
  const [units, setUnits] = useState<MeasurementUnitSystem>("metric");
  const [numbers, setNumbers] = useState(true);
  const [briefingState, setBriefingState] = useState<ViewerViewState | null>(
    null
  );
  const [gateBack, setGateBack] = useState("original");
  useEffect(() => {
    if (!__DEMO_DEV__) return;
    const stream = new EventSource("/__reload");
    stream.onmessage = () => location.reload();
    return () => stream.close();
  }, []);
  const transparent: TrackDrawViewerOptions = {
    design: circuit,
    presentation: "transparent",
    theme: "dark",
    showViewControls: false,
    show3DAxes: false,
    showResetControl: false,
  };
  return (
    <div className="showcase">
      <header className="showcase-nav">
        <a href="/" className="showcase-brand">
          <img src={logoDark} alt="TrackDraw" width={180} height={35} />
        </a>
        <nav aria-label="Showcase">
          <span className="demo-badge">Demo</span>
          <a href="#track">The track</a>
          <a href="#details">The details</a>
          <a href="/develop">Developers</a>
        </nav>
      </header>
      <main>
        <section className="showcase-hero" aria-labelledby="hero-title">
          <div className="hero-orbit" aria-hidden="true" />
          <div className="hero-copy">
            <p className="showcase-eyebrow">
              TRACK VIEWER PACKAGE · DEMO WEBSITE
            </p>
            <h1 id="hero-title">
              The next lap
              <br />
              starts <em>here.</em>
            </h1>
            <p>
              Discover what <code>@trackdraw/viewer</code> can do on your
              website.
              <br />
              Live embeds, practical examples and integration code.
            </p>
            <a className="showcase-cta" href="#track">
              Discover the track <span aria-hidden="true">↘</span>
            </a>
            <div className="hero-footnote">
              <span className="hero-live-dot" /> A live viewer. Go ahead, move
              it.
            </div>
          </div>
          <div className="hero-scene">
            <Example
              options={{ ...transparent, theme: "light" }}
              onState={setHeroState}
              resetRevision={resetRevision}
            />
            <div className="hero-scene-caption">
              <span>
                {heroState?.view === "2d"
                  ? "2D TRACK OVERVIEW"
                  : "DRAG TO ORBIT · SCROLL TO EXPLORE"}
              </span>
              <button
                onClick={() => reset((n) => n + 1)}
                aria-label="Reset hero track overview"
              >
                ↺ <span>Reset view</span>
              </button>
            </div>
            <div className="hero-coordinate" aria-hidden="true">
              01 / FLIGHT CIRCUIT
            </div>
          </div>
        </section>
        <section className="showcase-strip" aria-label="Track features">
          <span>One track. Every perspective.</span>
          <span>
            60 × 40 <small>metres</small>
          </span>
          <span>
            2D <small>meets</small> 3D
          </span>
          <span>
            Made to <small>explore</small> ↗
          </span>
        </section>
        <section
          id="track"
          className="showcase-track"
          aria-labelledby="track-title"
        >
          <div className="track-copy">
            <p className="showcase-eyebrow">EXAMPLE EVENT · CLUB RACE DAY</p>
            <h2 id="track-title">
              Race day.
              <br />
              Know your track.
            </h2>
            <p>
              Check the layout for your session before you line up. Explore the
              turns in 2D, then switch to 3D to inspect the obstacles.
            </p>
            <div className="track-facts">
              <div>
                <span>LAYOUT</span>
                <strong>{eventTrack.design.title}</strong>
              </div>
              <div>
                <span>FOOTPRINT</span>
                <strong>60 × 40 m</strong>
              </div>
              <div>
                <span>SESSION</span>
                <strong>
                  {eventTrack.time} · {eventTrack.label}
                </strong>
              </div>
            </div>
            <p className="track-note">{eventTrack.note}</p>
            <a className="integration-link" href="/develop?recipe=controls">
              Build this integration <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className={`track-embed ${night ? "track-night" : ""}`}>
            <div className="track-embed-header">
              <div>
                <span className="track-live-dot" />{" "}
                {eventTrack.label.toUpperCase()} TRACK
              </div>
              <div className="track-actions">
                <button
                  onClick={() => setNight((v) => !v)}
                  aria-label={
                    night
                      ? "Use light track background"
                      : "Use dark track background"
                  }
                >
                  {night ? "☀" : "☾"}
                </button>
                <div className="track-mode" aria-label="Track view">
                  {(["2d", "3d"] as const).map((mode) => (
                    <button
                      key={mode}
                      aria-pressed={view === mode}
                      onClick={() => setView(mode)}
                    >
                      {mode.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div
              className="event-track-picker"
              role="group"
              aria-label="Race session"
            >
              {eventTracks.map((track) => (
                <button
                  key={track.id}
                  aria-pressed={eventTrack.id === track.id}
                  onClick={() => setEventTrack(track)}
                >
                  <span>{track.label}</span>
                  <small>{track.time}</small>
                </button>
              ))}
            </div>
            <Example
              options={{
                ...transparent,
                design: eventTrack.design,
                theme: night ? "dark" : "light",
                view,
                onViewChange: setView,
              }}
              onState={setTrackState}
            />
            <div className="track-embed-footer">
              <span>
                {trackState?.view === "2d"
                  ? "Pan & zoom to explore the layout"
                  : "Orbit & zoom to find your perspective"}
              </span>
              <span>TRACKDRAW ↗</span>
            </div>
          </div>
        </section>
        <section className="showcase-briefing" aria-labelledby="briefing-title">
          <div className="briefing-heading">
            <div>
              <p className="showcase-eyebrow">IN THE TRACK BRIEFING</p>
              <h2 id="briefing-title">
                A clear view.
                <br />A confident start.
              </h2>
            </div>
            <p>
              Keep the details close. A familiar viewer with its own controls,
              <br />a numbered layout and measurements that work for your
              audience.
            </p>
          </div>
          <div className="briefing-toolbar">
            <div>
              <strong>Flight circuit</strong>
              <span>
                {units === "metric"
                  ? `${circuit.field.width} × ${circuit.field.height} m`
                  : `${Math.round(circuit.field.width / 0.3048)} × ${Math.round(circuit.field.height / 0.3048)} ft`}
              </span>
            </div>
            <div className="briefing-controls">
              <div
                className="briefing-units"
                role="group"
                aria-label="Track measurement units"
              >
                {(["metric", "imperial"] as const).map((unit) => (
                  <button
                    key={unit}
                    aria-pressed={units === unit}
                    onClick={() => setUnits(unit)}
                  >
                    {unit === "metric" ? "Metres" : "Feet"}
                  </button>
                ))}
              </div>
              <button
                className="briefing-numbers"
                aria-pressed={numbers}
                onClick={() => setNumbers((value) => !value)}
              >
                Obstacle numbers{" "}
                <span aria-hidden="true">{numbers ? "✓" : "−"}</span>
              </button>
            </div>
          </div>
          <div className="briefing-viewer">
            <Example
              options={{
                design: circuit,
                presentation: "framed",
                initialView: "2d",
                theme: "light",
                showViewControls: true,
                show3DAxes: true,
                unitSystem: units,
                showObstacleNumbers: numbers,
                labels: {
                  viewerPanZoom: "Drag to explore the track, scroll to zoom",
                  fitToWindow: "Fit track",
                },
              }}
              onState={setBriefingState}
            />
          </div>
          <div className="briefing-caption">
            <span>
              {briefingState?.view === "3d"
                ? "A new perspective, without leaving the briefing."
                : "Read the layout, check the obstacle order, find your line."}
            </span>
            <span>2D + 3D · ONE TRACK</span>
          </div>
          <a className="integration-link" href="/develop?recipe=briefing">
            Build a pilot briefing <span aria-hidden="true">↗</span>
          </a>
        </section>
        <section
          id="details"
          className="showcase-details"
          aria-labelledby="details-title"
        >
          <div className="details-heading">
            <div>
              <p className="showcase-eyebrow">IN THE OBSTACLE COLLECTION</p>
              <h2 id="details-title">
                Every element.
                <br />A closer look.
              </h2>
            </div>
            <p>
              Let the obstacles speak for themselves.
              <br />
              Interactive previews, comfortably at home
              <br />
              in a catalog, a guide or a race briefing.
            </p>
          </div>
          <div className="obstacle-collection">
            {items.map((item, i) => (
              <article className="obstacle-example" key={item.id}>
                <div className={`obstacle-art obstacle-art-${i}`}>
                  <span className="obstacle-index">0{i + 1}</span>
                  <Example
                    options={{
                      ...transparent,
                      design: itemDesigns[i],
                      theme: "light",
                      ...(i === 0 && gateBack !== "original"
                        ? { gateBackColors: { [item.id]: gateBack } }
                        : {}),
                    }}
                    onState={ignoreState}
                  />
                  <span className="obstacle-hint">DRAG TO EXPLORE ↗</span>
                </div>
                <p className="showcase-eyebrow">{item.category}</p>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
                {i === 0 && (
                  <div className="gate-personalisation">
                    <span>Back panel</span>
                    <div role="group" aria-label="Gate back panel colour">
                      {[
                        ["original", "Original", "#939c9c"],
                        ["#f0761d", "Orange", "#f0761d"],
                        ["#1e93db", "Blue", "#1e93db"],
                      ].map(([value, label, colour]) => (
                        <button
                          key={value}
                          aria-label={`${label} gate back`}
                          aria-pressed={gateBack === value}
                          onClick={() => setGateBack(value)}
                          style={{ "--swatch": colour } as CSSProperties}
                        />
                      ))}
                    </div>
                    <small>Orbit to see the back.</small>
                  </div>
                )}
              </article>
            ))}
          </div>
          <a className="integration-link" href="/develop?recipe=product">
            Build an obstacle catalog <span aria-hidden="true">↗</span>
          </a>
        </section>
        <section className="showcase-outro">
          <p className="showcase-eyebrow">YOUR WEBSITE. YOUR PERSPECTIVE.</p>
          <h2>
            A track can be
            <br />
            part of the <em>experience.</em>
          </h2>
          <p>
            A bold opening. A useful overview. A detail worth exploring.
            <br />
            The same viewer, wherever the story takes it.
          </p>
          <a href="#track" className="showcase-cta">
            Explore the track <span aria-hidden="true">↗</span>
          </a>
        </section>
      </main>
      <footer className="showcase-footer">
        <a href="/" className="showcase-brand">
          <img src={logoLight} alt="TrackDraw" width={180} height={35} />
        </a>
        <p>Demo for @trackdraw/viewer · Fictional events and sample tracks</p>
        <a href="#hero-title">Back to top ↑</a>
      </footer>
    </div>
  );
}
