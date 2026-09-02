'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { CARS, CarData } from '../data/cars';
import Dock, { DockItemData } from '../components/Dock';
import { VscHome, VscArchive } from 'react-icons/vsc';
import { clearSession, getSession } from '../lib/auth';
import {
  User,
  Phone,
  Building2,
  MapPin,
  FileText,
  Calendar,
  Clock,
  Car,
  Fuel,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  Edit3,
  Check,
  LogOut
} from 'lucide-react';

// Helper function to calculate duration between start and end date/time
function calculateDuration(
  startDateStr: string,
  startTimeStr: string,
  endDateStr: string,
  endTimeStr: string
): string {
  if (!startDateStr || !endDateStr) return '';
  const start = new Date(`${startDateStr}T${startTimeStr || '00:00'}`);
  const end = new Date(`${endDateStr}T${endTimeStr || '00:00'}`);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return 'Waktu kembali harus setelah waktu pinjam';

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(diffMinutes / (60 * 24));
  const remainingHours = Math.floor((diffMinutes % (60 * 24)) / 60);

  if (days > 0) {
    if (remainingHours > 0) {
      return `${days} Hari ${remainingHours} Jam`;
    }
    return `${days} Hari`;
  }
  if (remainingHours > 0) {
    return `${remainingHours} Jam`;
  }
  return `${diffMinutes} Menit`;
}

// Helper to format date for display in Step 2 summary
function formatDisplayDate(dateStr: string, timeStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(`${dateStr}T${timeStr || '00:00'}`);
    if (isNaN(d.getTime())) return `${dateStr} • ${timeStr}`;
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year} • ${timeStr || '00:00'}`;
  } catch {
    return `${dateStr} • ${timeStr}`;
  }
}

function PeminjamanContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read car info from URL params sent by dashboard (carId, carName, plate)
  const carIdParam   = searchParams.get('carId')   || '';
  const carNameParam = searchParams.get('carName') || '';
  const plateParam   = searchParams.get('plate')   || '';

  // Build selectedCar from URL params first, fallback to static CARS
  const fallbackCar = CARS.find(c => c.plateNumber === plateParam || c.id === carIdParam) || CARS[0];
  const initialCar: CarData = carIdParam
    ? {
        id: carIdParam,
        name: carNameParam || fallbackCar.name,
        plateNumber: plateParam || fallbackCar.plateNumber,
        image: fallbackCar.image,
        type: fallbackCar.type,
        transmission: fallbackCar.transmission,
        fuel: fallbackCar.fuel,
        status: fallbackCar.status,
      }
    : fallbackCar;

  const [selectedCar, setSelectedCar] = useState<CarData>(initialCar);

  // Stepper state (1: Detail Peminjaman, 2: Konfirmasi, 3: Selesai)
  const [step, setStep] = useState<number>(1);

  // Default initial state (empty so user can fill it in)
  const [formData, setFormData] = useState({
    namaPeminjam: '',
    nomorTelepon: '',
    divisi: '',
    tujuan: '',
    keperluan: '',
    pengemudi: 'Saya Sendiri' as 'Saya Sendiri' | 'Driver Perusahaan',
    persetujuan: false
  });

  const [ticketId, setTicketId] = useState<string>('RSV-240520-0012');
  const [submissionTime, setSubmissionTime] = useState<string>('');

  // Auto-fill divisi from logged-in user session on mount
  useEffect(() => {
    const session = getSession();
    if (session) {
      const divisiDefault = session.division && session.division !== '-'
        ? session.division
        : session.username || '';
      setFormData(prev => ({
        ...prev,
        divisi: prev.divisi || divisiDefault,
      }));
    }
  }, []);

  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (step === 2) {
      const now = new Date();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const nowStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;
      
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');

      const startDate = `${year}-${month}-${day}`;
      const startTime = `${hours}:${mins}`;

      try {
        const session = getSession();
        const res = await fetch('/api/peminjaman', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: session?.id || null,
            borrower_name: formData.namaPeminjam || session?.name || 'Staff Pelindo',
            nip: session?.nip || '',
            phone: formData.nomorTelepon,
            division: formData.divisi,
            car_id: selectedCar.id || null,
            car_name: selectedCar.name,
            plate_number: selectedCar.plateNumber,
            start_date: startDate,
            start_time: startTime,
            end_date: '-',
            end_time: '-',
            duration: 'Berjalan',
            destination: formData.tujuan,
            purpose: formData.keperluan,
            driver_option: formData.pengemudi
          })
        });

        const json = await res.json();
        if (json.error) {
          console.error('API error:', json.error);
          alert(`Gagal menyimpan peminjaman: ${json.error}`);
          return;
        }
        if (json.peminjaman?.id) {
          setTicketId(json.peminjaman.id);
        } else {
          setTicketId(`RSV-${Math.floor(100000 + Math.random() * 900000)}`);
        }
      } catch (err) {
        console.error('Failed to submit to Supabase:', err);
        setTicketId(`RSV-${Math.floor(100000 + Math.random() * 900000)}`);
      }

      setSubmissionTime(nowStr);
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (step === 1) {
      router.push('/dashboard');
    } else if (step === 2) {
      setStep(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      router.push('/dashboard');
    }
  };

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
      onClick: () => router.push('/riwayat')
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

  return (
    <div className="min-h-screen w-full bg-[#eaf4fd] text-slate-900 font-sans pb-32 pt-8 px-4 sm:px-6 lg:px-12 relative overflow-x-hidden">
      
      {/* Main Container */}
      <div className="max-w-6xl mx-auto">
        
        {/* Header Title (Hidden in Step 3 to match media_1788234782263.png) */}
        {step < 3 && (
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {step === 1 && 'Detail Peminjaman'}
              {step === 2 && 'Konfirmasi Peminjaman'}
            </h1>

            {/* Stepper Wizard Bar */}
            <div className="flex items-center justify-center gap-3 mt-5">
              {/* Step 1 */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step > 1
                      ? 'bg-blue-600 text-white'
                      : step === 1
                      ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {step > 1 ? <Check size={14} strokeWidth={3} /> : '1'}
                </div>
                <span
                  className={`text-[11px] font-semibold mt-1.5 ${
                    step >= 1 ? 'text-blue-600 font-bold' : 'text-slate-400'
                  }`}
                >
                  Detail Peminjaman
                </span>
              </div>

              {/* Line 1-2 */}
              <div
                className={`w-16 sm:w-24 h-0.5 -mt-4 transition-colors ${
                  step >= 2 ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              />

              {/* Step 2 */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step > 2
                      ? 'bg-blue-600 text-white'
                      : step === 2
                      ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {step > 2 ? <Check size={14} strokeWidth={3} /> : '2'}
                </div>
                <span
                  className={`text-[11px] font-semibold mt-1.5 ${
                    step >= 2 ? 'text-blue-600 font-bold' : 'text-slate-400'
                  }`}
                >
                  Konfirmasi
                </span>
              </div>

              {/* Line 2-3 */}
              <div
                className={`w-16 sm:w-24 h-0.5 -mt-4 transition-colors ${
                  step >= 3 ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              />

              {/* Step 3 */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step === 3
                      ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {step === 3 ? '3' : '3'}
                </div>
                <span
                  className={`text-[11px] font-semibold mt-1.5 ${
                    step === 3 ? 'text-blue-600 font-bold' : 'text-slate-400'
                  }`}
                >
                  Selesai
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: FORM DETAIL PEMINJAMAN (Matches media_1788233950346.png) */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Card: Mobil yang Dipilih */}
            <div className="lg:col-span-4 bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col items-center text-center">
              <div className="w-full text-left font-bold text-xs text-slate-800 mb-2">
                Mobil yang Dipilih
              </div>

              {/* Car Image Preview */}
              <div className="relative w-full aspect-[16/10] my-2 flex items-center justify-center">
                <Image
                  src={selectedCar.image}
                  alt={selectedCar.name}
                  fill
                  className="object-contain drop-shadow-md"
                />
              </div>

              <h3 className="text-base font-bold text-slate-900 mt-1">
                {selectedCar.name}
              </h3>
              <p className="text-xs text-slate-500 font-mono font-medium">
                {selectedCar.plateNumber}
              </p>

              {/* Change car selection toggle */}
              <div className="mt-4 pt-4 border-t border-slate-100 w-full flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = CARS.findIndex(c => c.id === selectedCar.id);
                    const nextIndex = (currentIndex + 1) % CARS.length;
                    setSelectedCar(CARS[nextIndex]);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 cursor-pointer py-1 px-3 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Edit3 size={13} />
                  <span>Ubah Pilihan</span>
                </button>
              </div>
            </div>

            {/* Right Card: Informasi Peminjaman Form */}
            <div className="lg:col-span-8 bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
              <h2 className="text-xs font-bold text-slate-800 pb-3 mb-5 border-b border-slate-100">
                Informasi Peminjaman
              </h2>

              <form onSubmit={handleNextStep} className="space-y-4">
                {/* Row 1: Nama & No Telepon */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-slate-600">
                      Nama Peminjam
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nama lengkap peminjam"
                      value={formData.namaPeminjam ?? ''}
                      onChange={e => setFormData({ ...formData, namaPeminjam: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-slate-600">
                      Nomor Telepon
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="0812 3456 7890"
                      value={formData.nomorTelepon ?? ''}
                      onChange={e => setFormData({ ...formData, nomorTelepon: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-white"
                    />
                  </div>
                </div>

                {/* Row 2: Divisi & Tujuan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-slate-600">
                      Divisi
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Operasi Pelabuhan"
                      value={formData.divisi ?? ''}
                      onChange={e => setFormData({ ...formData, divisi: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-slate-600">
                      Tujuan / Lokasi Perjalanan
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Kantor Pelindo Regional 3, Banjarmasin"
                      value={formData.tujuan ?? ''}
                      onChange={e => setFormData({ ...formData, tujuan: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-white"
                    />
                  </div>
                </div>

                {/* Row 3: Keperluan */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-600">
                    Keperluan
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Kunjungan kerja dan koordinasi operasional pelabuhan."
                    value={formData.keperluan ?? ''}
                    onChange={e => setFormData({ ...formData, keperluan: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-white resize-none"
                  />
                </div>

                {/* Row 4: Tanggal & Waktu Peminjaman */}
                {/* Row 4: Pengemudi */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-medium text-slate-600">
                    Pengemudi
                  </label>
                  <div className="flex items-center gap-5 pt-1.5">
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="pengemudi"
                          checked={formData.pengemudi === 'Saya Sendiri'}
                          onChange={() => setFormData({ ...formData, pengemudi: 'Saya Sendiri' })}
                          className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span>Saya Sendiri</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="pengemudi"
                          checked={formData.pengemudi === 'Driver Perusahaan'}
                          onChange={() => setFormData({ ...formData, pengemudi: 'Driver Perusahaan' })}
                          className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span>Driver Perusahaan</span>
                      </label>
                    </div>
                  </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-6 mt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-6 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Kembali
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>Lanjutkan</span>
                    <span className="text-sm">→</span>
                  </button>
                </div>
              </form>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: KONFIRMASI PEMINJAMAN (Matches media_1788234053800.png) */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Main Left Card: Ringkasan Peminjaman */}
            <div className="lg:col-span-8 bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
              
              {/* Header Bar */}
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                <h2 className="text-xs font-bold text-slate-800">
                  Ringkasan Peminjaman
                </h2>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 size={13} />
                  <span>Edit Detail</span>
                </button>
              </div>

              {/* Summary Content Body */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                
                {/* Left Mini Car Card */}
                <div className="sm:col-span-4 bg-slate-50/80 rounded-xl p-4 border border-slate-200/70 flex flex-col items-center text-center">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">
                    Mobil yang Dipilih
                  </span>

                  <div className="relative w-full aspect-[16/10] my-2">
                    <Image
                      src={selectedCar.image}
                      alt={selectedCar.name}
                      fill
                      className="object-contain"
                    />
                  </div>

                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full mb-1">
                    {selectedCar.type}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">
                    {selectedCar.name}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono font-medium">
                    {selectedCar.plateNumber}
                  </p>
                </div>

                {/* Right Details Grid */}
                <div className="sm:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  
                  {/* Nama Peminjam */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <User size={13} />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Nama Peminjam</span>
                      <span className="font-semibold text-slate-800">{formData.namaPeminjam || '-'}</span>
                    </div>
                  </div>

                  {/* Nomor Telepon */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Phone size={13} />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Nomor Telepon</span>
                      <span className="font-semibold text-slate-800">{formData.nomorTelepon || '-'}</span>
                    </div>
                  </div>

                  {/* Divisi */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Building2 size={13} />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Divisi</span>
                      <span className="font-semibold text-slate-800">{formData.divisi || '-'}</span>
                    </div>
                  </div>

                  {/* Tujuan */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin size={13} />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Tujuan / Lokasi Perjalanan</span>
                      <span className="font-semibold text-slate-800">{formData.tujuan || '-'}</span>
                    </div>
                  </div>

                  {/* Keperluan (Full) */}
                  <div className="sm:col-span-2 flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <FileText size={13} />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Keperluan</span>
                      <span className="font-medium text-slate-700 leading-relaxed">{formData.keperluan || '-'}</span>
                    </div>
                  </div>

                  {/* Jenis Pengemudi */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <User size={13} />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Jenis Pengemudi</span>
                      <span className="font-semibold text-slate-800">{formData.pengemudi}</span>
                    </div>
                  </div>

                  {/* Transmisi */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Sliders size={13} />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Transmisi</span>
                      <span className="font-semibold text-slate-800">{selectedCar.transmission}</span>
                    </div>
                  </div>

                  {/* Bahan Bakar */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Fuel size={13} />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Bahan Bakar</span>
                      <span className="font-semibold text-slate-800">{selectedCar.fuel}</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Disclaimer Checkbox */}
              <div className="mt-6 pt-5 border-t border-slate-100 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="persetujuan"
                  checked={formData.persetujuan}
                  onChange={e => setFormData({ ...formData, persetujuan: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded mt-0.5 cursor-pointer"
                />
                <label htmlFor="persetujuan" className="text-[11px] text-slate-600 leading-snug cursor-pointer select-none">
                  Saya menyatakan bahwa data di atas sudah benar dan akan mematuhi peraturan peminjaman mobil dinas.
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-6 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Kembali
                </button>

                <button
                  type="button"
                  disabled={!formData.persetujuan}
                  onClick={handleNextStep}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Ajukan Peminjaman</span>
                  <span className="text-sm">→</span>
                </button>
              </div>
            </div>

            {/* Right Card: Peraturan Peminjaman */}
            <div className="lg:col-span-4 bg-[#f0f7fe] border border-blue-100/90 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-4">
                <ShieldCheck size={16} className="text-blue-600" />
                <span>Peraturan Peminjaman</span>
              </div>

              <ul className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                  <span>Gunakan mobil dinas sesuai keperluan kedinasan.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                  <span>Jaga kebersihan dan kondisi mobil.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                  <span>Pengembalian harus sesuai waktu yang ditentukan.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                  <span>Pelanggaran akan dikenakan sanksi sesuai kebijakan perusahaan.</span>
                </li>
              </ul>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: SELESAI / SUKSES (Exact match with media_1788234782263.png) */}
        {/* ========================================================================= */}
        {step === 3 && (
          <div className="max-w-2xl mx-auto flex flex-col items-center text-center pt-2">
            
            {/* Stepper Wizard Bar on Step 3 */}
            <div className="flex items-center justify-center gap-3 mb-10">
              {/* Step 1 Completed */}
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-[0_0_10px_rgba(37,99,235,0.3)]">
                  <Check size={14} strokeWidth={3} />
                </div>
                <span className="text-[11px] font-semibold mt-1.5 text-blue-600">
                  Detail Peminjaman
                </span>
              </div>

              {/* Line 1-2 */}
              <div className="w-16 sm:w-24 h-0.5 -mt-4 bg-blue-600" />

              {/* Step 2 Completed */}
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-[0_0_10px_rgba(37,99,235,0.3)]">
                  <Check size={14} strokeWidth={3} />
                </div>
                <span className="text-[11px] font-semibold mt-1.5 text-blue-600">
                  Konfirmasi
                </span>
              </div>

              {/* Line 2-3 */}
              <div className="w-16 sm:w-24 h-0.5 -mt-4 bg-blue-600" />

              {/* Step 3 Active */}
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-[0_0_12px_rgba(37,99,235,0.5)]">
                  3
                </div>
                <span className="text-[11px] font-semibold mt-1.5 text-blue-600 font-bold">
                  Selesai
                </span>
              </div>
            </div>

            {/* Green Success Check Icon */}
            <div className="w-16 h-16 rounded-full bg-emerald-100/90 text-emerald-600 flex items-center justify-center shadow-sm mb-5">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <Check size={24} strokeWidth={3} />
              </div>
            </div>

            {/* Headings */}
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2">
              Pengajuan peminjaman mobil dinas berhasil!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-8">
              Permintaan Anda telah diajukan dan sedang menunggu persetujuan atasan.
            </p>

            {/* Horizontal 3-Column Summary Card (Matching screenshot) */}
            <div className="w-full bg-white rounded-2xl p-6 sm:p-7 shadow-sm border border-slate-200/80 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:divide-x sm:divide-slate-100 text-center">
                {/* Col 1: No. Reservasi */}
                <div className="flex flex-col items-center justify-center">
                  <span className="text-[11px] text-slate-400 font-medium mb-1">
                    No. Reservasi
                  </span>
                  <span className="text-sm sm:text-base font-bold text-slate-900 font-mono">
                    {ticketId}
                  </span>
                </div>

                {/* Col 2: Tanggal Pengajuan */}
                <div className="flex flex-col items-center justify-center sm:px-4">
                  <span className="text-[11px] text-slate-400 font-medium mb-1">
                    Tanggal Pengajuan
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800">
                    {submissionTime || '19 Mei 2024 10:30 WIB'}
                  </span>
                </div>

                {/* Col 3: Status */}
                <div className="flex flex-col items-center justify-center sm:pl-4">
                  <span className="text-[11px] text-slate-400 font-medium mb-1">
                    Status
                  </span>
                  <span className="inline-block bg-amber-50 text-amber-600 px-3 py-1 rounded-md text-xs font-semibold border border-amber-200/60">
                    Menunggu Persetujuan
                  </span>
                </div>
              </div>
            </div>

            {/* Notification hint */}
            <p className="text-xs text-slate-400 mb-8">
              Anda akan mendapatkan notifikasi setelah permintaan disetujui atau ditolak.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 w-full">
              <Link
                href="/dashboard"
                className="px-6 py-2.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
              >
                Kembali ke Dashboard
              </Link>

              <Link
                href="/riwayat"
                className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Lihat Riwayat Peminjaman</span>
              </Link>
            </div>

          </div>
        )}

      </div>

      {/* Floating Dock at the bottom — hidden while filling form (step 1 & 2) */}
      {step === 3 && (
        <div className="fixed bottom-3 left-0 right-0 z-50 flex justify-center pointer-events-auto">
          <Dock
            items={dockItems}
            panelHeight={68}
            baseItemSize={50}
            magnification={70}
            distance={200}
          />
        </div>
      )}

    </div>
  );
}

export default function PeminjamanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#eaf4fd] flex items-center justify-center text-xs font-semibold text-slate-600">Memuat halaman peminjaman...</div>}>
      <PeminjamanContent />
    </Suspense>
  );
}
