'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Dock, { DockItemData } from '../components/Dock';
import { VscCheck, VscArchive, VscAccount, VscSettingsGear, VscHome } from 'react-icons/vsc';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Car,
  User,
  Users,
  Search,
  Filter,
  ShieldCheck,
  Building2,
  Phone,
  MapPin,
  FileText,
  Calendar,
  AlertCircle,
  Check,
  X,
  ChevronRight,
  Sliders,
  Settings,
  Bell,
  ArrowUpRight
} from 'lucide-react';

export interface AdminReservation {
  id: string;
  userId?: string;
  borrowerName: string;
  nip: string;
  division: string;
  phone: string;
  carName: string;
  plateNumber: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  duration: string;
  destination: string;
  purpose: string;
  driverOption: string;
  status: 'Menunggu' | 'Disetujui' | 'Selesai' | 'Ditolak';
  requestDate: string;
  notes?: string;
}

const INITIAL_RESERVATIONS: AdminReservation[] = [];

export default function AdminPage() {
  const router = useRouter();
  
  // Active Admin View based on Dock items: 'persetujuan' | 'archive' | 'user' | 'pengaturan'
  const [adminTab, setAdminTab] = useState<'persetujuan' | 'archive' | 'user' | 'pengaturan'>('persetujuan');

  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<AdminReservation | null>(null);

  // Stats message / notification toast state
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Search and status filter state for archive tab
  const [searchQuery, setSearchQuery] = useState('');
  const [archiveStatusFilter, setArchiveStatusFilter] = useState<'Semua' | 'Menunggu' | 'Disetujui' | 'Selesai' | 'Ditolak'>('Semua');

  // Load real-time reservations and registered users from Supabase API
  useEffect(() => {
    async function fetchReservations() {
      try {
        const res = await fetch('/api/peminjaman');
        const json = await res.json();
        if (json.peminjaman && Array.isArray(json.peminjaman)) {
          const mapped: AdminReservation[] = json.peminjaman.map((p: any) => ({
            id: p.id,
            userId: p.user_id,
            borrowerName: p.borrower_name,
            nip: p.nip || '-',
            division: p.division || '-',
            phone: p.phone || '-',
            carName: p.car_name,
            plateNumber: p.plate_number,
            startDate: p.start_date,
            startTime: p.start_time,
            endDate: p.end_date,
            endTime: p.end_time,
            duration: p.duration || '-',
            destination: p.destination,
            purpose: p.purpose || '-',
            driverOption: p.driver_option || 'Saya Sendiri',
            status: p.status,
            requestDate: p.request_date ? new Date(p.request_date).toLocaleString('id-ID') : 'Terbaru',
            notes: p.notes
          }));
          setReservations(mapped);
        }
      } catch (e) {
        console.error('Failed to load reservations:', e);
      }
    }

    async function fetchUsers() {
      try {
        const res = await fetch('/api/users');
        const json = await res.json();
        if (json.users && Array.isArray(json.users)) {
          setUsers(json.users);
        }
      } catch (e) {
        console.error('Failed to load users:', e);
      }
    }

    fetchReservations();
    fetchUsers();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await fetch(`/api/peminjaman/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Disetujui' })
      });
      setReservations(prev =>
        prev.map(r => (r.id === id ? { ...r, status: 'Disetujui' } : r))
      );
      if (selectedDetail && selectedDetail.id === id) {
        setSelectedDetail({ ...selectedDetail, status: 'Disetujui' });
      }
      setAlertMessage({
        type: 'success',
        text: `Permintaan ${id} telah berhasil DISETUJUI.`
      });
      setTimeout(() => setAlertMessage(null), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await fetch(`/api/peminjaman/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Ditolak' })
      });
      setReservations(prev =>
        prev.map(r => (r.id === id ? { ...r, status: 'Ditolak' } : r))
      );
      if (selectedDetail && selectedDetail.id === id) {
        setSelectedDetail({ ...selectedDetail, status: 'Ditolak' });
      }
      setAlertMessage({
        type: 'danger',
        text: `Permintaan ${id} telah DITOLAK.`
      });
      setTimeout(() => setAlertMessage(null), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFinishByAdmin = async (id: string, carName: string) => {
    try {
      await fetch(`/api/peminjaman/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Selesai' })
      });
      setReservations(prev =>
        prev.map(r => (r.id === id ? { ...r, status: 'Selesai' } : r))
      );
      if (selectedDetail && selectedDetail.id === id) {
        setSelectedDetail({ ...selectedDetail, status: 'Selesai' });
      }
      setAlertMessage({
        type: 'success',
        text: `Peminjaman mobil ${carName} (${id}) berhasil diselesaikan oleh Admin!`
      });
      setTimeout(() => setAlertMessage(null), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = reservations.length;
    const pending = reservations.filter(r => r.status === 'Menunggu').length;
    const approved = reservations.filter(r => r.status === 'Disetujui').length;
    const completed = reservations.filter(r => r.status === 'Selesai').length;
    const rejected = reservations.filter(r => r.status === 'Ditolak').length;
    return { total, pending, approved, completed, rejected };
  }, [reservations]);

  // Approval list for Persetujuan tab (Menunggu & Disetujui)
  const approvalList = useMemo(() => {
    return reservations.filter(r => r.status === 'Menunggu' || r.status === 'Disetujui');
  }, [reservations]);

  // Archive list with filters
  const archiveList = useMemo(() => {
    return reservations.filter(r => {
      const matchFilter = archiveStatusFilter === 'Semua' || r.status === archiveStatusFilter;
      const matchSearch =
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.borrowerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.carName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.destination.toLowerCase().includes(searchQuery.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [reservations, archiveStatusFilter, searchQuery]);

  // Admin Dock Items requested: Persetujuan (Centang), Archive, User, Pengaturan
  const adminDockItems: DockItemData[] = [
    {
      icon: (
        <VscCheck
          size={24}
          className={adminTab === 'persetujuan' ? 'text-blue-600 font-bold' : 'text-slate-800'}
        />
      ),
      label: `Persetujuan (${stats.pending})`,
      onClick: () => {
        setAdminTab('persetujuan');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    {
      icon: (
        <VscArchive
          size={22}
          className={adminTab === 'archive' ? 'text-blue-600 font-bold' : 'text-slate-800'}
        />
      ),
      label: 'Archive',
      onClick: () => {
        setAdminTab('archive');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    {
      icon: (
        <VscAccount
          size={22}
          className={adminTab === 'user' ? 'text-blue-600 font-bold' : 'text-slate-800'}
        />
      ),
      label: 'User',
      onClick: () => {
        setAdminTab('user');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    {
      icon: (
        <VscSettingsGear
          size={22}
          className={adminTab === 'pengaturan' ? 'text-blue-600 font-bold' : 'text-slate-800'}
        />
      ),
      label: 'Pengaturan',
      onClick: () => {
        setAdminTab('pengaturan');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  ];

  return (
    <div className="min-h-screen w-full bg-[#eaf4fd] text-slate-900 font-sans pb-36 pt-6 px-4 sm:px-6 lg:px-12 relative overflow-x-hidden">
      
      {/* Top Navbar */}
      <div className="max-w-6xl mx-auto flex items-center justify-between pb-6 border-b border-slate-200/80 mb-6">
        <div className="flex items-center gap-3">
         
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-slate-900 tracking-tight">
                ADMIN
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Sistem Persetujuan & Manajemen Mobil Dinas
            </p>
          </div>
        </div>

        {/* Return to Staff portal button */}
      
      </div>

      {/* Alert Notification Toast */}
      {alertMessage && (
        <div className="max-w-6xl mx-auto mb-6">
          <div
            className={`p-4 rounded-xl flex items-center gap-3 shadow-md text-xs font-semibold ${
              alertMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {alertMessage.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-red-600 shrink-0" />
            )}
            <span>{alertMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ========================================================================= */}
        {/* STATS OVERVIEW CARDS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Menunggu Persetujuan</p>
              <p className="text-lg font-extrabold text-slate-900">{stats.pending} Pengajuan</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Telah Disetujui</p>
              <p className="text-lg font-extrabold text-slate-900">{stats.approved} Pengajuan</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <Car size={20} />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Selesai Berjalan</p>
              <p className="text-lg font-extrabold text-slate-900">{stats.completed} Pengajuan</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold shrink-0">
              <XCircle size={20} />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Permintaan Ditolak</p>
              <p className="text-lg font-extrabold text-slate-900">{stats.rejected} Pengajuan</p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: PERSETUJUAN (Icon Centang) */}
        {/* ========================================================================= */}
        {adminTab === 'persetujuan' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  Persetujuan & Operasional Peminjaman ({approvalList.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Daftar pengajuan peminjaman mobil dinas staf yang perlu disetujui atau diselesaikan.
                </p>
              </div>
            </div>

            {approvalList.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {approvalList.map(req => (
                  <div
                    key={req.id}
                    className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200/80 transition-all hover:border-blue-300"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Car size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-800">{req.id}</span>
                            {req.status === 'Menunggu' ? (
                              <span className="bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                Menunggu Persetujuan
                              </span>
                            ) : (
                              <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                Disetujui / Berjalan
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                            {req.carName} • <span className="font-mono text-blue-600">{req.plateNumber}</span>
                          </h3>
                        </div>
                      </div>

                      <div className="text-left lg:text-right">
                        <span className="text-[11px] text-slate-400 block font-medium">Waktu Pengajuan</span>
                        <span className="text-xs font-semibold text-slate-700">{req.requestDate}</span>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-4 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Peminjam</span>
                        <p className="font-bold text-slate-800">{req.borrowerName}</p>
                        <p className="text-[11px] text-slate-500">{req.division}</p>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Jadwal Perjalanan</span>
                        <p className="font-bold text-slate-800">{req.startDate} ({req.startTime})</p>
                        <p className="text-[11px] text-blue-600 font-semibold">{req.duration}</p>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Destinasi</span>
                        <p className="font-medium text-slate-800 line-clamp-1">{req.destination}</p>
                        <p className="text-[11px] text-slate-500">Layanan: <strong className="text-slate-700">{req.driverOption}</strong></p>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Keperluan</span>
                        <p className="text-slate-600 text-[11px] line-clamp-2">{req.purpose}</p>
                      </div>
                    </div>

                    {/* Action Approval / Complete Buttons */}
                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setSelectedDetail(req)}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Detail Lengkap
                      </button>

                      {req.status === 'Menunggu' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleReject(req.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors cursor-pointer border border-red-200"
                          >
                            <X size={14} strokeWidth={3} />
                            <span>Tolak</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApprove(req.id)}
                            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                          >
                            <Check size={14} strokeWidth={3} />
                            <span>Setujui Peminjaman</span>
                          </button>
                        </>
                      ) : (
                        /* GREEN BUTTON FOR ADMIN TO MANUALLY COMPLETE LOAN ON BEHALF OF STAFF */
                        <button
                          type="button"
                          onClick={() => handleFinishByAdmin(req.id, req.carName)}
                          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer animate-pulse"
                        >
                          <Check size={14} strokeWidth={3} />
                          <span>Selesai Peminjaman</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check size={24} strokeWidth={3} />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Semua Peminjaman Telah Ditinjau & Selesai</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Tidak ada peminjaman yang berstatus menunggu persetujuan atau sedang berjalan saat ini.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ARCHIVE (Icon Archive) */}
        {/* ========================================================================= */}
        {adminTab === 'archive' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Arsip & Riwayat Seluruh Peminjaman
                </h2>
                <p className="text-xs text-slate-500">
                  Rekapitulasi lengkap seluruh pengajuan operasional kendaraan dinas kantor.
                </p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-medium overflow-x-auto pb-0.5">
              {(['Semua', 'Menunggu', 'Disetujui', 'Selesai', 'Ditolak'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setArchiveStatusFilter(tab)}
                  className={`pb-2.5 transition-all relative cursor-pointer font-semibold ${
                    archiveStatusFilter === tab
                      ? 'text-blue-600 font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab}
                  {archiveStatusFilter === tab && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari ID, peminjam, mobil, atau tujuan..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-xs"
              />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-medium">
                      <th className="py-4 px-5 font-semibold">No. Reservasi</th>
                      <th className="py-4 px-5 font-semibold">Peminjam</th>
                      <th className="py-4 px-5 font-semibold">Mobil</th>
                      <th className="py-4 px-5 font-semibold">Jadwal</th>
                      <th className="py-4 px-5 font-semibold">Tujuan</th>
                      <th className="py-4 px-5 font-semibold text-center">Status</th>
                      <th className="py-4 px-5 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {archiveList.length > 0 ? (
                      archiveList.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-4 px-5 font-mono font-medium text-slate-700">{r.id}</td>
                          <td className="py-4 px-5">
                            <p className="font-bold text-slate-800">{r.borrowerName}</p>
                            <p className="text-[11px] text-slate-400">{r.division}</p>
                          </td>
                          <td className="py-4 px-5">
                            <p className="font-semibold text-slate-800">{r.carName}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{r.plateNumber}</p>
                          </td>
                          <td className="py-4 px-5">
                            <p className="font-medium text-slate-800">{r.startDate}</p>
                            <p className="text-[11px] text-blue-600 font-semibold">{r.duration}</p>
                          </td>
                          <td className="py-4 px-5 text-slate-700 max-w-xs truncate">{r.destination}</td>
                          <td className="py-4 px-5 text-center">
                            {r.status === 'Menunggu' && (
                              <span className="bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-amber-200">
                                Menunggu
                              </span>
                            )}
                            {r.status === 'Disetujui' && (
                              <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-emerald-200">
                                Disetujui
                              </span>
                            )}
                            {r.status === 'Selesai' && (
                              <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-blue-200">
                                Selesai
                              </span>
                            )}
                            {r.status === 'Ditolak' && (
                              <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-red-200">
                                Ditolak
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-5 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedDetail(r)}
                              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                            >
                              Detail
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          Tidak ada data peminjaman ditemukan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: USER (Icon User/Account) */}
        {/* ========================================================================= */}
        {adminTab === 'user' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Daftar Pengguna & Staff
                </h2>
                <p className="text-xs text-slate-500">
                  Data pegawai kantor yang memiliki akses peminjaman mobil dinas.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400 font-medium bg-white rounded-2xl border border-slate-200/80">
                  Belum ada pegawai/user yang terdaftar di database.
                </div>
              ) : (
                users.map((u, i) => {
                  const uName = (u.name || u.username || '').toLowerCase();
                  const uDiv = (u.division || u.username || '').toLowerCase();

                  const pinjamCount = reservations.filter(r => {
                    if (r.userId && u.id && r.userId === u.id) return true;
                    const rName = (r.borrowerName || '').toLowerCase();
                    const rDiv = (r.division || '').toLowerCase();

                    const matchName = uName && uName !== '-' && (rName.includes(uName) || uName.includes(rName));
                    const matchDivision = uDiv && uDiv !== '-' && (rDiv.includes(uDiv) || uDiv.includes(rDiv) || rName.includes(uDiv));

                    return matchName || matchDivision;
                  }).length;

                  const roleUpper = (u.role || 'STAFF').toUpperCase();
                  const roleBadgeClass =
                    roleUpper === 'SUPERADMIN'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : roleUpper === 'ADMIN'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                  return (
                    <div key={u.id || i} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5 hover:border-blue-300 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{u.name}</h4>
                            <p className="text-[11px] text-slate-400 font-mono">NIP: {u.nip || '-'}</p>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${roleBadgeClass}`}>
                          {roleUpper}
                        </span>
                      </div>

                      <div className="pt-3 border-t border-slate-100 text-xs space-y-2 text-slate-600">
                        <p className="flex justify-between items-center">
                          <span className="text-slate-400">Divisi Unit:</span>
                          <strong className="text-slate-800 font-semibold">{u.division || u.username || '-'}</strong>
                        </p>
                        <p className="flex justify-between items-center">
                          <span className="text-slate-400">Total Riwayat Pinjam:</span>
                          <strong className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            {pinjamCount}x Peminjaman
                          </strong>
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: PENGATURAN (Icon Settings/Gear) */}
        {/* ========================================================================= */}
        {adminTab === 'pengaturan' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Pengaturan Sistem Peminjaman
              </h2>
              <p className="text-xs text-slate-500">
                Konfigurasi parameter operasional dan kebijakan pool kendaraan kantor.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6 max-w-3xl">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Aturan & Kebijakan Pool
                </h3>

                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Wajib Persetujuan Atasan</p>
                    <p className="text-[11px] text-slate-400">Setiap pengajuan memerlukan persetujuan manual koordinator pool</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded cursor-pointer" />
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Notifikasi Otomatis WhatsApp / SMS</p>
                    <p className="text-[11px] text-slate-400">Kirim tiket konfirmasi langsung ke nomor WhatsApp staf peminjam</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded cursor-pointer" />
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Batas Maksimal Durasi Dinas</p>
                    <p className="text-[11px] text-slate-400">Maksimum hari peminjaman tanpa persetujuan khusus direksi</p>
                  </div>
                  <select defaultValue="7" className="text-xs font-bold px-3 py-1.5 border border-slate-200 rounded-lg bg-white">
                    <option value="3">3 Hari</option>
                    <option value="7">7 Hari</option>
                    <option value="14">14 Hari</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setAlertMessage({ type: 'success', text: 'Pengaturan sistem berhasil disimpan.' });
                    setTimeout(() => setAlertMessage(null), 3000);
                  }}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Simpan Pengaturan
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Detail Modal Dialog */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Detail Reservasi</span>
                <h3 className="text-base font-extrabold text-slate-900">{selectedDetail.id}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Kendaraan</p>
                <p className="font-bold text-slate-900 text-sm">{selectedDetail.carName}</p>
                <p className="font-mono text-blue-600 font-bold">{selectedDetail.plateNumber}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">Peminjam</span>
                  <p className="font-bold text-slate-800">{selectedDetail.borrowerName}</p>
                  <p className="text-[11px] text-slate-500">{selectedDetail.division}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">Kontak</span>
                  <p className="font-bold text-slate-800">{selectedDetail.phone}</p>
                  <p className="text-[11px] text-slate-500 font-mono">{selectedDetail.nip}</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-medium block">Jadwal Peminjaman</span>
                <p className="font-semibold text-slate-800">{selectedDetail.startDate} ({selectedDetail.startTime}) s/d {selectedDetail.endDate} ({selectedDetail.endTime})</p>
                <p className="text-blue-600 font-bold text-[11px]">Durasi: {selectedDetail.duration}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-medium block">Tujuan & Keperluan</span>
                <p className="font-semibold text-slate-800">{selectedDetail.destination}</p>
                <p className="text-slate-600 text-[11px] mt-0.5">{selectedDetail.purpose}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-medium block">Status Saat Ini</span>
                <span className="inline-block mt-1 font-bold text-xs px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  {selectedDetail.status}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Tutup
              </button>
              {selectedDetail.status === 'Menunggu' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleReject(selectedDetail.id)}
                    className="px-4 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold cursor-pointer border border-red-200"
                  >
                    Tolak
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedDetail.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold cursor-pointer shadow-md"
                  >
                    Setujui
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Admin Dock */}
      <div className="fixed bottom-3 left-0 right-0 z-50 flex justify-center pointer-events-auto">
        <Dock
          items={adminDockItems}
          panelHeight={68}
          baseItemSize={50}
          magnification={70}
          distance={200}
        />
      </div>

    </div>
  );
}
