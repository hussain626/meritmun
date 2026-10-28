import type { PDFDocument, PDFFont, PDFPage } from "pdf-lib";
import type { ProofSheet } from "@/lib/admin/actions";

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 32;
const BOX_HEIGHT = 62;
const GAP = 14;

/** Standard PDF fonts only cover Latin-1; anything else prints as "?". */
function printable(text: string): string {
  return text.replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

function fit(text: string, font: PDFFont, size: number, maxWidth: number): string {
  let out = printable(text);
  if (font.widthOfTextAtSize(out, size) <= maxWidth) return out;
  while (out.length > 1 && font.widthOfTextAtSize(`${out}...`, size) > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}...`;
}

async function toPngOrJpeg(blob: Blob): Promise<{ bytes: ArrayBuffer; png: boolean }> {
  if (blob.type === "image/png" || blob.type === "image/jpeg") {
    return { bytes: await blob.arrayBuffer(), png: blob.type === "image/png" };
  }
  // WEBP (and HEIC where the browser can decode it) is redrawn as JPEG.
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = objectUrl;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No canvas");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const jpeg = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    if (!jpeg) throw new Error("Could not encode");
    return { bytes: await jpeg.arrayBuffer(), png: false };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * One PDF with every payment screenshot, one per page, each under a box with
 * the MUN code and payer so the printout can be matched to a registration.
 * PDF proofs keep all their pages, each stamped with the same box.
 */
export async function buildProofPdf(sheets: ProofSheet[]): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc: PDFDocument = await PDFDocument.create();
  doc.setTitle("MERITMUN payment screenshots");
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);

  const green = rgb(15 / 255, 67 / 255, 12 / 255);
  const cream = rgb(247 / 255, 255 / 255, 220 / 255);
  const muted = rgb(0.32, 0.36, 0.32);

  const innerWidth = A4.width - MARGIN * 2;
  const content = {
    x: MARGIN,
    y: MARGIN,
    width: innerWidth,
    height: A4.height - MARGIN * 2 - BOX_HEIGHT - GAP,
  };

  function header(page: PDFPage, sheet: ProofSheet, part?: string) {
    const top = A4.height - MARGIN;
    page.drawRectangle({
      x: MARGIN,
      y: top - BOX_HEIGHT,
      width: innerWidth,
      height: BOX_HEIGHT,
      color: cream,
      borderColor: green,
      borderWidth: 1.2,
    });
    const pad = 12;
    const codeWidth = (innerWidth - pad * 3) * 0.36;
    const payerWidth = innerWidth - pad * 3 - codeWidth;
    // Long payer names shrink before they are cut short.
    let payerSize = 13;
    while (payerSize > 9 && bold.widthOfTextAtSize(printable(sheet.payer), payerSize) > payerWidth) {
      payerSize -= 0.5;
    }
    page.drawText("MUN CODE", { x: MARGIN + pad, y: top - 18, size: 7.5, font: bold, color: muted });
    page.drawText(fit(sheet.munCode, bold, 17, codeWidth), {
      x: MARGIN + pad,
      y: top - 38,
      size: 17,
      font: bold,
      color: green,
    });
    const right = MARGIN + pad * 2 + codeWidth;
    page.drawText("PAYER", { x: right, y: top - 18, size: 7.5, font: bold, color: muted });
    page.drawText(fit(sheet.payer, bold, payerSize, payerWidth), {
      x: right,
      y: top - 36,
      size: payerSize,
      font: bold,
      color: green,
    });
    const amount = sheet.received ?? sheet.quoted;
    const details = [
      sheet.reference !== sheet.munCode ? sheet.reference : null,
      sheet.typeLabel,
      `PKR ${amount.toLocaleString("en-US")}${sheet.received == null ? " quoted" : " received"}`,
      sheet.confirmedBy ? `Confirmed by ${sheet.confirmedBy}` : null,
      part,
    ]
      .filter(Boolean)
      .join("  |  ");
    page.drawText(fit(details, regular, 8.5, innerWidth - pad * 2), {
      x: MARGIN + pad,
      y: top - BOX_HEIGHT + 10,
      size: 8.5,
      font: regular,
      color: muted,
    });
  }

  function notice(page: PDFPage, message: string) {
    page.drawText(printable(message), {
      x: MARGIN,
      y: A4.height - MARGIN - BOX_HEIGHT - GAP - 16,
      size: 11,
      font: regular,
      color: muted,
      maxWidth: innerWidth,
      lineHeight: 15,
    });
  }

  function scaled(width: number, height: number) {
    const scale = Math.min(content.width / width, content.height / height, 1.5);
    const w = width * scale;
    const h = height * scale;
    return {
      x: content.x + (content.width - w) / 2,
      y: content.y + content.height - h,
      width: w,
      height: h,
    };
  }

  for (const sheet of sheets) {
    try {
      if (!sheet.url) throw new Error("missing");
      const response = await fetch(sheet.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();

      if (sheet.isPdf || blob.type === "application/pdf") {
        const source = await PDFDocument.load(await blob.arrayBuffer(), {
          ignoreEncryption: true,
        });
        const count = source.getPageCount();
        const embedded = await doc.embedPdf(
          source,
          Array.from({ length: count }, (_, i) => i),
        );
        embedded.forEach((p, i) => {
          const page = doc.addPage([A4.width, A4.height]);
          header(page, sheet, count > 1 ? `Page ${i + 1} of ${count}` : undefined);
          page.drawPage(p, scaled(p.width, p.height));
        });
        continue;
      }

      const { bytes, png } = await toPngOrJpeg(blob);
      const image = png ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
      const page = doc.addPage([A4.width, A4.height]);
      header(page, sheet);
      page.drawImage(image, scaled(image.width, image.height));
    } catch {
      const page = doc.addPage([A4.width, A4.height]);
      header(page, sheet);
      notice(
        page,
        "This screenshot could not be added to the PDF (missing, expired, or a format this browser cannot read, such as HEIC). Open it from the registration's transcript instead.",
      );
    }
  }

  const bytes = await doc.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}
