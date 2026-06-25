import type { Metadata } from "next";
import PdfTools from "./PdfTools";

export const metadata: Metadata = {
  title: "PDF Tools — Toolium",
};

export default function PdfToolsPage() {
  return <PdfTools />;
}
