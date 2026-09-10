'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Dock, { DockItemData } from '../components/Dock';
import { VscHome, VscArchive } from 'react-icons/vsc';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Car,
  Calendar,
  Clock,
  MapPin,
  FileText,
  FileSpreadsheet,
  LogOut,
  User
} from 'lucide-react';
import { getSession, clearSession } from '../lib/auth';
import { exportToExcel, exportToPDF } from '../lib/exportUtils';

export interface RiwayatItem {
  id: string;
  borrowerName: string;
  division: string;
  carName: string;
  plateNumber: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  destination: string;
  status: 'Menunggu' | 'Disetujui' | 'Selesai' | 'Ditolak';
}

export default function RiwayatPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'Semua' | 'Menunggu' | 'Disetujui' | 'Selesai' | 'Ditolak'>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<RiwayatItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Load session user and all peminjaman history from API
  useEffect(() => {
    const session = getSession();
    if (session) {
      setUserRole(session.role);
    }

    async function fetchRiwayat() {
      try {
        const res = await fetch('/api/peminjaman');
        const json = await res.json();
        if (json.peminjaman && Array.isArray(json.peminjaman)) {
          const mapped: RiwayatItem[] = json.peminjaman.map((p: any) => ({
            id: p.id,
            borrowerName: p.borrower_name || 'Staff',
            division: p.division || '-',
            carName: p.car_name,
            plateNumber: p.plate_number,
            startDate: p.start_date,
            startTime: p.start_time,
            endDate: p.end_date,
            endTime: p.end_time,
            destination: p.destination,
            status: p.status
          }));
          setItems(mapped);
        }
      } catch (e) {
        console.error('Failed to load riwayat:', e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchRiwayat();
  }, []);

  // Filtered records based on active tab and search query (name, division, car, plate, destination)
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchTab = activeTab === 'Semua' || item.status === activeTab;
      const matchSearch =
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.borrowerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.division.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.carName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.destination.toLowerCase().includes(searchQuery.toLowerCase());
      return matchTab && matchSearch;
    });
  }, [items, activeTab, searchQuery]);

  // Dock items (Home, Archive, Keluar with door icon)
  const dockItems: DockItemData[] = [
    {
      icon: <VscHome size={22} className="text-slate-800" />,
      label: 'Home',
      onClick: () => router.push('/dashboard')
    },
    {
      icon: <VscArchive size={22} className="text-slate-800" />,
      label: 'Archive',
      onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    {
      icon: <LogOut size={22} className="text-slate-800" />,
      label: 'Keluar',
      onClick: () => {
        clearSession();
        router.push('/login');
      }
    }
  ];

  const getStatusBadge = (status: RiwayatItem['status']) => {
    switch (status) {
      case 'Menunggu':
        return (
          <span className="inline-block bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-xs font-semibold border border-amber-200/60">
            Menunggu
          </span>
        );
      case 'Disetujui':
        return (
          <span className="inline-block bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-200/60">
            Disetujui
          </span>
        );
      case 'Selesai':
        return (
          <span className="inline-block bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold border border-blue-200/60">
            Selesai
          </span>
        );
      case 'Ditolak':
        return (
          <span className="inline-block bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-semibold border border-red-200/60">
            Ditolak
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#eaf4fd] text-slate-900 font-sans pb-32 pt-8 px-4 sm:px-6 lg:px-12 relative overflow-x-hidden">
      
      {/* Main Container */}
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="text-left space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            Riwayat Peminjaman
          </h1>
          <p className="text-xs text-slate-500">
            Berikut adalah riwayat pengajuan dan peminjaman mobil dinas Anda.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-medium overflow-x-auto pb-0.5">
          {(['Semua', 'Menunggu', 'Disetujui', 'Selesai', 'Ditolak'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2.5 transition-all relative cursor-pointer font-semibold ${
                activeTab === tab
                  ? 'text-blue-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Search Bar & Export Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari ID, mobil, atau tujuan..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all shadow-xs"
            />
          </div>

          {/* Export Buttons - Hanya muncul untuk role Admin / Superadmin */}
          {(userRole === 'Admin' || userRole === 'Superadmin') && (
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => exportToExcel(filteredItems, 'Riwayat_Peminjaman')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                title="Export riwayat ke Microsoft Excel (.xlsx)"
              >
                <FileSpreadsheet size={15} className="text-emerald-600" />
                <span>Export Excel</span>
              </button>

              <button
                type="button"
                onClick={() => exportToPDF(filteredItems, 'Riwayat_Peminjaman', 'Laporan Riwayat Peminjaman Kendaraan Dinas')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                title="Export riwayat ke dokumen PDF"
              >
                <FileText size={15} className="text-red-600" />
                <span>Export PDF</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="py-20 text-center text-slate-500 text-xs font-medium bg-white rounded-2xl border border-slate-200/80">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
            Memuat riwayat peminjaman...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <FileText size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Belum Ada Riwayat Peminjaman</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Anda belum memiliki riwayat pengajuan peminjaman mobil dinas. Silakan ajukan melalui halaman utama.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue-600">{item.id}</span>
                  </div>
                  {getStatusBadge(item.status)}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                      <User size={14} />
                      <span>Peminjam</span>
                    </div>
                    <p className="font-bold text-slate-800">{item.borrowerName}</p>
                    <p className="text-[11px] text-blue-600 font-semibold">{item.division}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                      <Car size={14} />
                      <span>Kendaraan</span>
                    </div>
                    <p className="font-bold text-slate-800">{item.carName}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{item.plateNumber}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                      <Calendar size={14} />
                      <span>Waktu Pinjam</span>
                    </div>
                    <p className="font-semibold text-slate-700">{item.startDate} ({item.startTime})</p>
                    <p className="text-[11px] text-slate-500">s/d {item.endDate} ({item.endTime})</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                      <MapPin size={14} />
                      <span>Tujuan</span>
                    </div>
                    <p className="font-medium text-slate-700 leading-snug">{item.destination}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Floating Bottom Dock */}
      <div className="fixed bottom-3 left-0 right-0 z-50 flex justify-center pointer-events-auto">
        <Dock items={dockItems} />
      </div>
    </div>
  );
}
