import type { Metadata } from "next";
import PdfTools from "./PdfTools";

export const metadata: Metadata = {
  title: "PDF Tools — Toolium",
  description:
    "Merge, split, rotate, reorder, and remove pages from PDFs. All processing happens in your browser.",
};

export default function PdfToolsPage() {
  return <PdfTools />;
}
