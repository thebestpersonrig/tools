import type { Metadata } from "next";
import ImageEditor from "./Editor";

export const metadata: Metadata = {
  title: "Image Editor — ToolKit",
  description:
    "Easy image editor — add text, move objects, draw, and export. Runs entirely in your browser.",
};

export default function ImageEditorPage() {
  return <ImageEditor />;
}
