import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportItem {
  id: string;
  borrowerName: string;
  nip?: string;
  division?: string;
  phone?: string;
  carName: string;
  plateNumber: string;
  startDate: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  duration?: string;
  destination: string;
  purpose?: string;
  driverOption?: string;
  status: string;
  requestDate?: string;
  notes?: string;
}

export function exportToExcel(data: ExportItem[], fileNamePrefix = 'Riwayat_Peminjaman_Mobil') {
  if (!data || data.length === 0) {
    alert('Tidak ada data untuk diekspor ke Excel.');
    return;
  }

  const rows = data.map((item, index) => ({
    'No': index + 1,
    'No. Reservasi': item.id,
    'Nama Peminjam': item.borrowerName,
    'NIP': item.nip || '-',
    'Divisi': item.division || '-',
    'Kontak / HP': item.phone || '-',
    'Mobil': item.carName,
    'Plat Nomor': item.plateNumber,
    'Tgl Mulai': item.startDate,
    'Jam Mulai': item.startTime || '-',
    'Tgl Selesai': item.endDate || '-',
    'Jam Selesai': item.endTime || '-',
    'Durasi': item.duration || '-',
    'Destinasi / Tujuan': item.destination,
    'Keperluan': item.purpose || '-',
    'Layanan Pengemudi': item.driverOption || 'Saya Sendiri',
    'Status': item.status,
    'Waktu Pengajuan': item.requestDate || '-'
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet['!cols'] = [
    { wch: 5 },
    { wch: 18 },
    { wch: 22 },
    { wch: 16 },
    { wch: 18 },
    { wch: 15 },
    { wch: 20 },
    { wch: 14 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 25 },
    { wch: 25 },
    { wch: 18 },
    { wch: 14 },
    { wch: 20 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Riwayat Peminjaman');

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${fileNamePrefix}_${today}.xlsx`);
}

export function exportToPDF(data: ExportItem[], fileNamePrefix = 'Riwayat_Peminjaman_Mobil', title = 'Laporan Riwayat Peminjaman Kendaraan Dinas') {
  if (!data || data.length === 0) {
    alert('Tidak ada data untuk diekspor ke PDF.');
    return;
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header Pelindo style
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(0, 91, 170);
  doc.text('PT PELABUHAN INDONESIA (PERSERO)', 14, 15);

  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.text(title.toUpperCase(), 14, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  const now = new Date().toLocaleString('id-ID');
  doc.text(`Dicetak pada: ${now} | Total: ${data.length} data transaksi`, 14, 27);

  // Line divider
  doc.setDrawColor(0, 91, 170);
  doc.setLineWidth(0.6);
  doc.line(14, 29, 283, 29);

  const tableRows = data.map((item, index) => [
    index + 1,
    item.id,
    `${item.borrowerName}
(${item.division || '-'})`,
    `${item.carName}
${item.plateNumber}`,
    `${item.startDate} ${item.startTime || ''}`,
    `${item.endDate || '-'} ${item.endTime || ''}`,
    item.destination,
    item.purpose || '-',
    item.status
  ]);

  autoTable(doc, {
    startY: 32,
    head: [[
      'No',
      'No. Reservasi',
      'Peminjam & Divisi',
      'Mobil & Plat',
      'Mulai',
      'Selesai',
      'Tujuan',
      'Keperluan',
      'Status'
    ]],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [0, 91, 170],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [50, 50, 50]
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 26, fontStyle: 'bold' },
      2: { cellWidth: 35 },
      3: { cellWidth: 35 },
      4: { cellWidth: 26 },
      5: { cellWidth: 26 },
      6: { cellWidth: 40 },
      7: { cellWidth: 45 },
      8: { cellWidth: 22, halign: 'center', fontStyle: 'bold' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    didParseCell: (cellData: any) => {
      if (cellData.section === 'body' && cellData.column.index === 8) {
        const val = String(cellData.cell.raw);
        if (val === 'Disetujui') {
          cellData.cell.styles.textColor = [16, 185, 129];
        } else if (val === 'Selesai') {
          cellData.cell.styles.textColor = [37, 99, 235];
        } else if (val === 'Ditolak') {
          cellData.cell.styles.textColor = [239, 68, 68];
        } else if (val === 'Menunggu') {
          cellData.cell.styles.textColor = [217, 119, 6];
        }
      }
    },
    margin: { left: 14, right: 14 }
  });

  const today = new Date().toISOString().slice(0, 10);
  doc.save(`${fileNamePrefix}_${today}.pdf`);
}
