export async function downloadReceiptPDF(element: HTMLElement, filename: string): Promise<void> {
  // Dynamically import heavy libraries only when user clicks "Unduh PDF"
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  // Capture element at 2x scale for sharp receipt rendering
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth,
  });

  const imgData = canvas.toDataURL('image/png');
  // Thermal / standard mobile receipt slip width in mm (80mm standard receipt or 100mm slip)
  // 80mm width creates a compact, realistic 1-page receipt slip without excess empty space
  const pdfWidth = 80;
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  
  // Custom exact-fit page dimensions: exactly 1 single continuous page matching receipt height!
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pdfWidth, pdfHeight],
  });

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}
