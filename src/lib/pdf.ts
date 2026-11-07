import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function downloadReceiptPDF(element: HTMLElement, filename: string): Promise<void> {
  // Capture high-dpi canvas
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/png');
  const pdfWidth = 210; // A4 width in mm
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  
  // Create single continuous PDF page matching exact rendered height (ideal for receipts of any length)
  // or standard A4 if smaller
  const pageHeight = Math.max(297, pdfHeight);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pdfWidth, pageHeight],
  });

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}
