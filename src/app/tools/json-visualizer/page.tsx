import type { Metadata } from "next";
import JsonVisualizer from "./JsonVisualizer";

export const metadata: Metadata = {
  title: "JSON Visualizer — Toolium",
};

export default function JsonVisualizerPage() {
  return <JsonVisualizer />;
}
