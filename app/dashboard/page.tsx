'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Dock, { DockItemData } from '../components/Dock';
import { VscHome, VscArchive } from 'react-icons/vsc';
import { LogOut } from 'lucide-react';
import { INITIAL_CARS, CarData } from '../data/cars';
import { useRouter } from 'next/navigation';
import { getSession, clearSession } from '../lib/auth';

// Custom SVG Icons matching the reference design
function CarOutlineIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11 2 11.5 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

function TransmissionIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="18" r="3" />
      <path d="M6 9v6M18 9v6M9 6h6M9 18h6" />
    </svg>
  );
}

function FuelPumpIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 22V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
      <path d="M15 10h2a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9l-3-3" />
      <path d="M7 11h4" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}



function parseDateTime(dateStr: string, timeStr: string = '17:00'): Date | null {
  if (!dateStr) return null;
  try {
    let formattedDate = dateStr.trim();
    if (formattedDate.includes('/')) {
      const parts = formattedDate.split('/');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          formattedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else {
          formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    }
    const time = timeStr ? timeStr.trim() : '17:00';
    const isoString = `${formattedDate}T${time}:00`;
    const parsed = new Date(isoString);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  // Initialize with INITIAL_CARS for instant 0ms layout rendering
  const [cars, setCars] = useState<CarData[]>(INITIAL_CARS);
  const [peminjaman, setPeminjaman] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load cars & peminjaman data silently from Supabase API in background
  const fetchDashboardData = async () => {
    try {
      const userSession = getSession();
      setSession(userSession);

      const [carsRes, peminjamanRes] = await Promise.all([
        fetch('/api/cars'),
        fetch('/api/peminjaman')
      ]);

      const carsJson = await carsRes.json();
      const peminjamanJson = await peminjamanRes.json();

      if (carsJson.cars && Array.isArray(carsJson.cars) && carsJson.cars.length > 0) {
        const mapped: CarData[] = carsJson.cars.map((c: any) => ({
          id: c.id,
          name: c.name,
          plateNumber: c.plate_number,
          image: c.image || (
            c.plate_number?.includes('1152') ? '/image/DA 1152 NF.png' :
            c.plate_number?.includes('1153') ? '/image/DA 1153 NF.png' :
            '/image/DA 1150 NF.png'
          ),
          type: c.type || 'SUV',
          transmission: c.transmission || 'Automatic',
          fuel: c.fuel || 'Bensin',
          status: c.status || 'Tersedia'
        }));
        setCars(mapped);
      }

      if (peminjamanJson.peminjaman && Array.isArray(peminjamanJson.peminjaman)) {
        setPeminjaman(peminjamanJson.peminjaman);
      }
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setIsDataLoaded(true);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Re-check auto-expiration & 30-min warnings every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter loans expiring within 30 minutes
  const expiringLoans = peminjaman.filter((p: any) => {
    if (p.status !== 'Menunggu' && p.status !== 'Disetujui') return false;
    if (!p.end_date || p.end_date === '-') return false;
    const endDateTime = parseDateTime(p.end_date, p.end_time);
    if (!endDateTime) return false;
    const now = new Date();
    const diffMs = endDateTime.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return diffMins >= 0 && diffMins <= 30;
  });

  // Handle manual loan completion by borrower division
  const handleFinishLoan = async (peminjamanId: string, carName: string) => {
    if (!confirm(`Selesaikan peminjaman mobil ${carName}?`)) return;

    try {
      const res = await fetch(`/api/peminjaman/${peminjamanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Selesai' })
      });

      if (res.ok) {
        setToastMessage(`Peminjaman mobil ${carName} telah berhasil diselesaikan!`);
        setTimeout(() => setToastMessage(null), 3500);
        await fetchDashboardData();
      } else {
        alert('Gagal menyelesaikan peminjaman.');
      }
    } catch (e) {
      console.error('Error completing loan:', e);
    }
  };

  // Items for Dock component (Home, Archive, Keluar with door icon)
  const dockItems: DockItemData[] = [
    {
      icon: <VscHome size={22} className="text-slate-800" />,
      label: 'Home',
      onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' })
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
    <div className="min-h-screen bg-[#eaf4fd] text-slate-900 font-sans pb-32">
      {/* 30-Minute Expiration Warning Alert Banner */}
      {expiringLoans.length > 0 && (
        <div className="bg-amber-500 text-white px-6 py-3 shadow-md text-xs font-bold flex items-center justify-center gap-3 relative z-40 animate-pulse">
          <span className="text-base">⚠️</span>
          <span>
            PERINGATAN: Masa peminjaman {expiringLoans.map(l => `${l.car_name} (${l.plate_number})`).join(', ')} tersisa kurang dari 30 menit! Harap persiapkan pengembalian kendaraan.
          </span>
        </div>
      )}

      {/* Floating Toast Alert Banner */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 animate-bounce">
          <span className="text-base">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Car Fleet Sections with Slanted (Miring) Diagonal Dividers matching reference design */}
      <main className="py-0 space-y-0 overflow-hidden">

        {/* Car sections — rendered instantly on page load */}
        {cars.map((car, index) => {
          const isEven = index % 2 === 0;
          const isFirst = index === 0;
          const isLast = index === cars.length - 1;

          // Find active loan for this car (Menunggu or Disetujui)
          const activeLoan = peminjaman.find((p: any) =>
            (p.car_id === car.id || (p.plate_number && p.plate_number.toLowerCase() === car.plateNumber.toLowerCase())) &&
            (p.status === 'Menunggu' || p.status === 'Disetujui')
          );

          // Check if current user / division borrowed this car
          const isBorrowedByMe = !!activeLoan && !!session && (
            (activeLoan.user_id && session.id && activeLoan.user_id === session.id) ||
            (session.division && activeLoan.division && session.division.toLowerCase() === activeLoan.division.toLowerCase()) ||
            (session.username && activeLoan.division && session.username.toLowerCase() === activeLoan.division.toLowerCase()) ||
            (session.name && activeLoan.borrower_name && session.name.toLowerCase() === activeLoan.borrower_name.toLowerCase())
          );

          // Slanted polygon clip-path calculation for diagonal miring background divider
          let clipPathStyle = 'polygon(0 0, 100% 0, 100% 100%, 0 100%)';
          let customMargin = '0px';
          let customPadding = '5rem 0';

          if (isFirst && !isLast) {
            clipPathStyle = 'polygon(0 0, 100% 0, 100% calc(100% - 4vw), 0 100%)';
            customMargin = '0 0 -4vw 0';
            customPadding = '5rem 0 calc(5rem + 4vw) 0';
          } else if (!isFirst && !isLast) {
            clipPathStyle = 'polygon(0 4vw, 100% 0, 100% calc(100% - 4vw), 0 100%)';
            customMargin = '-4vw 0 -4vw 0';
            customPadding = 'calc(5rem + 4vw) 0 calc(5rem + 4vw) 0';
          } else if (!isFirst && isLast) {
            clipPathStyle = 'polygon(0 4vw, 100% 0, 100% 100%, 0 100%)';
            customMargin = '-4vw 0 0 0';
            customPadding = 'calc(5rem + 4vw) 0 6rem 0';
          }

          // Determine if car is effectively available (no active loan in DB and not in maintenance)
          const isAvailable = !activeLoan && car.status !== 'Perawatan';

          return (
            <section
              key={car.id || index}
              style={{
                clipPath: clipPathStyle,
                margin: customMargin,
                padding: customPadding
              }}
              className={`transition-colors relative z-10 ${
                isEven ? 'bg-[#eaf4fd]' : 'bg-white'
              }`}
            >
              <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                
                {/* Car Image (Left on Even index, Right on Odd index) */}
                <div
                  className={`relative flex justify-center items-center group ${
                    isEven ? 'lg:order-1' : 'lg:order-2'
                  }`}
                >
                  <div className="relative w-full max-w-lg h-64 sm:h-80 flex items-center justify-center">
                    <Image
                      src={car.image}
                      alt={`${car.name} ${car.plateNumber}`}
                      fill
                      unoptimized={car.image.startsWith('data:')}
                      priority={index === 0}
                      className="object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                </div>

                {/* Car Details Info (Right on Even index, Left on Odd index) */}
                <div
                  className={`space-y-6 ${
                    isEven ? 'lg:order-2' : 'lg:order-1'
                  }`}
                >
                  {/* Category Subtext & Combined Title */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold tracking-wider text-blue-600 uppercase block">
                      MOBIL DINAS
                    </span>

                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                      {car.name} {car.plateNumber}
                    </h2>
                  </div>

                  {/* Inline Minimal Specs (Jenis, Transmisi, Bahan Bakar) */}
                  <div className="flex flex-wrap items-center gap-6 sm:gap-10 py-2">
                    {/* Jenis */}
                    <div className="flex items-center gap-2.5">
                      <CarOutlineIcon />
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Jenis</span>
                        <span className="text-xs sm:text-sm font-bold text-slate-900">{car.type}</span>
                      </div>
                    </div>

                    {/* Transmisi */}
                    <div className="flex items-center gap-2.5">
                      <TransmissionIcon />
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Transmisi</span>
                        <span className="text-xs sm:text-sm font-bold text-slate-900">{car.transmission}</span>
                      </div>
                    </div>

                    {/* Bahan Bakar */}
                    <div className="flex items-center gap-2.5">
                      <FuelPumpIcon />
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Bahan Bakar</span>
                        <span className="text-xs sm:text-sm font-bold text-slate-900">{car.fuel}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status + Action Button */}
                  <div className="pt-2 flex items-center gap-4 flex-wrap">
                    {!isDataLoaded ? (
                      /* CLEAN LOADING SKELETON BUTTON WHILE FETCHING REAL-TIME STATUS */
                      <div className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs animate-pulse">
                        <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                        <span>Memuat Status...</span>
                      </div>
                    ) : isAvailable ? (
                      /* BLUE BUTTON: Available to borrow */
                      <Link
                        href={`/peminjaman?carId=${encodeURIComponent(car.id)}&carName=${encodeURIComponent(car.name)}&plate=${encodeURIComponent(car.plateNumber)}`}
                        className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] cursor-pointer"
                      >
                        <DocumentIcon />
                        <span>Ajukan Peminjaman</span>
                        <span className="text-sm">→</span>
                      </Link>
                    ) : isBorrowedByMe && activeLoan ? (
                      /* GREEN BUTTON for borrower division to complete loan manually */
                      <button
                        type="button"
                        onClick={() => handleFinishLoan(activeLoan.id, car.name)}
                        className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] cursor-pointer"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                        <span>Selesai Peminjaman</span>
                      </button>
                    ) : (
                      /* GREY DISABLED BUTTON for other divisions when car is borrowed or in maintenance */
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-slate-200 text-slate-400 font-bold text-xs sm:text-sm shadow-none cursor-not-allowed"
                      >
                        <DocumentIcon />
                        <span>Ajukan Peminjaman</span>
                      </button>
                    )}

                    {/* Status Indicator */}
                    <div className="flex items-center gap-1.5">
                      {!isDataLoaded ? (
                        <span className="text-xs text-slate-400 font-medium animate-pulse">Memeriksa ketersediaan...</span>
                      ) : (
                        <>
                          <span className="relative flex h-2.5 w-2.5">
                            {isAvailable ? (
                              <>
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                              </>
                            ) : isBorrowedByMe ? (
                              <>
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                              </>
                            ) : (
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                            )}
                          </span>

                          <span className={`text-xs font-semibold ${
                            isAvailable
                              ? 'text-green-600'
                              : isBorrowedByMe
                              ? 'text-emerald-600 font-bold'
                              : 'text-red-500'
                          }`}>
                            {isAvailable
                              ? 'Tersedia'
                              : isBorrowedByMe
                              ? `Sedang Anda Pinjam (${activeLoan?.division || 'Divisi Anda'})`
                              : activeLoan?.division
                              ? `Dipakai oleh Divisi ${activeLoan.division}`
                              : car.status}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                </div>

              </div>
            </section>
          );
        })}
      </main>

      {/* Floating Bottom Dock */}
      <div className="fixed bottom-3 left-0 right-0 z-50 flex justify-center pointer-events-auto">
        <Dock items={dockItems} />
      </div>
    </div>
  );
}
