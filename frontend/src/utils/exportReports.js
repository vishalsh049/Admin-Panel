import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/* ---------------- PDF EXPORT ---------------- */
export function exportToPDF(title, columns, rows) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 15);

  doc.autoTable({
    startY: 25,
    head: [columns],
    body: rows,
    theme: "striped",
    styles: { fontSize: 10 },
    headStyles: { fillColor: [79, 70, 229] }, // indigo
  });

  doc.save(`${title}.pdf`);
}

/* ---------------- EXCEL EXPORT ---------------- */
export function exportToExcel(sheetName, columns, rows) {
  const worksheetData = [columns, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const fileData = new Blob([excelBuffer], {
    type: "application/octet-stream",
  });

  saveAs(fileData, `${sheetName}.xlsx`);
}
