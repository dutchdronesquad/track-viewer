import { Component, type ReactNode } from "react";

/** Renderer initialization/asset errors leave the existing 2D viewport usable. */
export class Viewer3DBoundary extends Component<
  {
    children: ReactNode;
    onUnavailable(): void;
  },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onUnavailable();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
