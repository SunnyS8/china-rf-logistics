import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';

/**
 * Снимок DOM-элемента отчёта в многостраничный PDF.
 * Использует html2canvas-pro (поддержка oklch, стилей Tailwind 4).
 */
export async function downloadPdfReport(elementId: string, fileName: string): Promise<void> {
  const el = document.getElementById(elementId);
  if (!el) throw new Error('Элемент отчёта не найден');

  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: '#f1f5f9',
    useCORS: true,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.92);

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;

  const imgW = pageW - margin * 2;
  const imgH = (canvas.height * imgW) / canvas.width;
  const drawableH = pageH - margin * 2;

  let position = margin;
  pdf.addImage(imgData, 'JPEG', margin, position, imgW, imgH);
  position -= drawableH;

  // Multi-page split: each next page starts at negative offset that aligns
  // the next slice of the tall image at the top of the page
  let remaining = imgH - drawableH;
  while (remaining > 0) {
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', margin, margin - imgH + remaining, imgW, imgH);
    remaining -= drawableH;
  }

  pdf.save(fileName);
}