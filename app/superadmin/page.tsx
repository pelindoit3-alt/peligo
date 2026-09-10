'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSession, clearSession } from '../lib/auth';
import { INITIAL_CARS, CarData } from '../data/cars';
import {
  LayoutDashboard,
  Car,
  Users,
  FileSpreadsheet,
  Settings,
  LogOut,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Search,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Layers,
  Sparkles,
  Phone,
  Building2,
  AlertCircle,
  Home,
  Upload,
  ArrowLeft,
  GripVertical,
  FileText
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '../lib/exportUtils';

export interface UserData {
  id: string;
  name: string;
  nip: string;
  division: string;
  phone: string;
  role: 'Staff' | 'Admin' | 'Superadmin';
  status: 'Aktif' | 'Nonaktif';
}

const INITIAL_USERS: UserData[] = [];

// Pure client-side Corner Sampling & BFS Flood-Fill Canvas helper to automatically remove ANY background color
function removeImageBackground(imageSrc: string, tolerance: number = 60): Promise<string> {
  if (!imageSrc) return Promise.resolve(imageSrc);

  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const origWidth = img.naturalWidth || img.width;
      const origHeight = img.naturalHeight || img.height;
      if (origWidth === 0 || origHeight === 0) return resolve(imageSrc);

      // Downscale high-resolution images to max 800px width to keep database payload lightweight & super fast
      const MAX_WIDTH = 800;
      let width = origWidth;
      let height = origHeight;
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(imageSrc);

      ctx.drawImage(img, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Check if image is ALREADY transparent PNG/SVG (alpha < 30 at corners)
      const cornerIndices = [
        0,
        (width - 1) * 4,
        (height - 1) * width * 4,
        ((height - 1) * width + (width - 1)) * 4
      ];

      const isAlreadyTransparent = cornerIndices.some(idx => data[idx + 3] < 30);
      if (isAlreadyTransparent) {
        // Image already has a transparent background — preserve as-is without altering
        return resolve(imageSrc);
      }

      const bgColors = cornerIndices.map(idx => ({
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2]
      }));

      const isBgColor = (r: number, g: number, b: number) => {
        return bgColors.some(bg => {
          const dist = Math.sqrt(
            (r - bg.r) ** 2 + (g - bg.g) ** 2 + (b - bg.b) ** 2
          );
          return dist < tolerance * 1.8;
        });
      };

      const visited = new Uint8Array(width * height);
      const queue: number[] = [];

      // Seed BFS queue with all border edge pixels
      for (let x = 0; x < width; x++) {
        queue.push(x);
        queue.push((height - 1) * width + x);
      }
      for (let y = 0; y < height; y++) {
        queue.push(y * width);
        queue.push(y * width + (width - 1));
      }

      let head = 0;
      while (head < queue.length) {
        const pixelIdx = queue[head++];
        if (visited[pixelIdx]) continue;
        visited[pixelIdx] = 1;

        const dataIdx = pixelIdx * 4;
        const r = data[dataIdx];
        const g = data[dataIdx + 1];
        const b = data[dataIdx + 2];

        if (isBgColor(r, g, b)) {
          data[dataIdx + 3] = 0; // Make pixel fully transparent

          const x = pixelIdx % width;
          const y = Math.floor(pixelIdx / width);

          if (x > 0 && !visited[pixelIdx - 1]) queue.push(pixelIdx - 1);
          if (x < width - 1 && !visited[pixelIdx + 1]) queue.push(pixelIdx + 1);
          if (y > 0 && !visited[pixelIdx - width]) queue.push(pixelIdx - width);
          if (y < height - 1 && !visited[pixelIdx + width]) queue.push(pixelIdx + width);
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

export default function SuperadminPage() {
  const router = useRouter();

  // Active Menu / Submenu: 'manajemen-mobil' | 'layout-mobil' | 'users' | 'history' | 'settings'
  const [activeMenu, setActiveMenu] = useState<'manajemen-mobil' | 'layout-mobil' | 'users' | 'history' | 'settings'>('manajemen-mobil');
  
  // Subview for Manajemen Mobil: 'list' (tabel daftar) | 'form' (halaman input data & foto inline)
  const [carSubView, setCarSubView] = useState<'list' | 'form'>('list');

  // Dashboard Dropdown Open State in Sidebar
  const [isDashboardDropdownOpen, setIsDashboardDropdownOpen] = useState(true);

  // Cars State (CRUD & Layout Reordering for Home Page)
  const [cars, setCars] = useState<CarData[]>([]);

  // Users State (Add & Delete Users)
  const [users, setUsers] = useState<UserData[]>([]);

  // Toast Notification
  const [toast, setToast] = useState<{ type: 'success' | 'danger'; message: string } | null>(null);

  // Drag and Drop Reordering State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Search State
  const [carSearch, setCarSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Image Processing State
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Car Form State (Create / Edit inline on page)
  const [editingCarId, setEditingCarId] = useState<string | null>(null);
  const [carFormData, setCarFormData] = useState<CarData>({
    id: '',
    name: '',
    plateNumber: '',
    image: '',
    type: 'SUV',
    transmission: 'Automatic',
    fuel: 'Bensin',
    status: 'Tersedia'
  });

  // User Modal State (Create / Edit)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userFormRole, setUserFormRole] = useState<'Staff' | 'Admin' | 'Superadmin'>('Staff');
  const [userDivisionInput, setUserDivisionInput] = useState('');
  const [userNameInput, setUserNameInput] = useState('');
  const [userPasswordInput, setUserPasswordInput] = useState('');
  const [userConfirmPasswordInput, setUserConfirmPasswordInput] = useState('');

  // Load cars & users from Supabase API on mount
  const refreshCars = async () => {
    try {
      const res = await fetch('/api/cars');
      const json = await res.json();
      if (json.cars && Array.isArray(json.cars)) {
        const mapped: CarData[] = json.cars.map((c: any) => ({
          id: c.id,
          name: c.name,
          plateNumber: c.plate_number,
          image: c.image || '/image/DA 1150 NF.png',
          type: c.type || 'SUV',
          transmission: c.transmission || 'Automatic',
          fuel: c.fuel || 'Bensin',
          status: c.status || 'Tersedia'
        }));
        setCars(mapped);
      }
    } catch (e) {
      console.error('Failed to load cars from Supabase:', e);
    }
  };

  const refreshUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const json = await res.json();
      if (json.users && Array.isArray(json.users)) {
        const mapped: UserData[] = json.users.map((u: any) => ({
          id: u.id,
          name: u.name,
          nip: u.nip || '-',
          division: u.division || '-',
          phone: u.phone || '-',
          role: u.role,
          status: u.status || 'Aktif'
        }));
        setUsers(mapped);
      }
    } catch (e) {
      console.error('Failed to load users from Supabase:', e);
    }
  };

  // Log Peminjaman State
  const [peminjamanLogs, setPeminjamanLogs] = useState<any[]>([]);

  const refreshLogs = async () => {
    try {
      const res = await fetch('/api/peminjaman');
      const json = await res.json();
      if (json.peminjaman && Array.isArray(json.peminjaman)) {
        setPeminjamanLogs(json.peminjaman);
      }
    } catch (e) {
      console.error('Failed to load logs:', e);
    }
  };

  useEffect(() => {
    refreshCars();
    refreshUsers();
    refreshLogs();
  }, []);

  // Auth guard: redirect if not logged in or not Superadmin
  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== 'Superadmin') {
      router.replace('/login');
    }
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

  // Safe state update without crashing on browser localStorage quota limits
  const saveCarsToStorage = (updatedCars: CarData[]) => {
    setCars(updatedCars);
    try {
      localStorage.setItem('superadmin_cars', JSON.stringify(updatedCars));
    } catch (e) {
      // Safely catch QuotaExceededError when base64 images exceed 5MB quota
      console.warn('LocalStorage quota exceeded for base64 image data, state safely managed in memory/database:', e);
    }
  };

  // Save users to localStorage safely
  const saveUsersToStorage = (updatedUsers: UserData[]) => {
    setUsers(updatedUsers);
    try {
      localStorage.setItem('superadmin_users', JSON.stringify(updatedUsers));
    } catch (e) {
      console.warn('LocalStorage quota exceeded:', e);
    }
  };

  // Persist layout display order to Supabase database
  const updateCarOrderInDb = async (updatedCars: CarData[]) => {
    saveCarsToStorage(updatedCars);
    try {
      await Promise.all(
        updatedCars.map((car, idx) =>
          fetch(`/api/cars/${car.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ display_order: idx + 1 })
          })
        )
      );
    } catch (e) {
      console.error('Failed to update car order in Supabase:', e);
    }
  };

  const showToast = (message: string, type: 'success' | 'danger' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Automated File Upload Handler (Auto remove background)
  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawDataUrl = event.target?.result as string;
      if (rawDataUrl) {
        // Automatically remove ANY background color using Flood Fill
        const cleanedDataUrl = await removeImageBackground(rawDataUrl, 60);
        setCarFormData(prev => ({ ...prev, image: cleanedDataUrl }));
        showToast('Foto berhasil diupload & background otomatis dihapus!');
      }
      setIsProcessingImage(false);
    };
    reader.readAsDataURL(file);
  };

  // ================= REORDER LAYOUT HANDLERS (DRAG & DROP) =================
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newCars = [...cars];
    const [draggedCar] = newCars.splice(draggedIndex, 1);
    newCars.splice(dropIndex, 0, draggedCar);

    setCars(newCars);
    updateCarOrderInDb(newCars);
    setDraggedIndex(null);
    setDragOverIndex(null);
    showToast(`Urutan tampilan mobil ${draggedCar.name} (${draggedCar.plateNumber}) berhasil digeser ke Posisi #${dropIndex + 1}!`);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // ================= CAR CRUD INLINE PAGE HANDLERS (NO POPUP) =================
  const handleOpenCarForm = (car?: CarData) => {
    if (car) {
      setEditingCarId(car.id);
      setCarFormData({ ...car });
    } else {
      setEditingCarId(null);
      setCarFormData({
        id: `CAR-${Math.floor(100 + Math.random() * 900)}`,
        name: '',
        plateNumber: '',
        image: '',
        type: 'SUV',
        transmission: 'Automatic',
        fuel: 'Bensin',
        status: 'Tersedia'
      });
    }
    setCarSubView('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carFormData.name || !carFormData.plateNumber) return;

    try {
      if (editingCarId) {
        const res = await fetch(`/api/cars/${editingCarId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: carFormData.name,
            plate_number: carFormData.plateNumber,
            image: carFormData.image,
            type: carFormData.type,
            transmission: carFormData.transmission,
            fuel: carFormData.fuel,
            status: carFormData.status
          })
        });
        if (res.ok) {
          showToast(`Data mobil ${carFormData.name} (${carFormData.plateNumber}) berhasil diperbarui!`);
          await refreshCars();
        }
      } else {
        const res = await fetch('/api/cars', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: carFormData.name,
            plate_number: carFormData.plateNumber,
            image: carFormData.image,
            type: carFormData.type,
            transmission: carFormData.transmission,
            fuel: carFormData.fuel,
            status: carFormData.status
          })
        });
        if (res.ok) {
          showToast(`Mobil baru ${carFormData.name} (${carFormData.plateNumber}) berhasil ditambahkan ke Supabase!`);
          await refreshCars();
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal menyimpan data mobil', 'danger');
    }

    setCarSubView('list');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteCar = async (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus ${name} dari Supabase?`)) {
      try {
        const res = await fetch(`/api/cars/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast(`Mobil ${name} telah dihapus!`, 'danger');
          await refreshCars();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // ================= USER CRUD HANDLERS =================
  const handleOpenUserModal = () => {
    setUserFormRole('Staff');
    setUserDivisionInput('');
    setUserNameInput('');
    setUserPasswordInput('');
    setUserConfirmPasswordInput('');
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (userPasswordInput !== userConfirmPasswordInput) {
      showToast('Konfirmasi password tidak cocok dengan password!', 'danger');
      return;
    }

    let finalUsername = '';
    let finalName = '';
    let finalDivision = '';

    if (userFormRole === 'Staff') {
      if (!userDivisionInput.trim()) {
        showToast('Divisi wajib diisi!', 'danger');
        return;
      }
      finalDivision = userDivisionInput.trim();
      finalUsername = finalDivision; // Divisi sama dengan Username untuk Staff (misal: "Umum")
      finalName = `Staff - ${finalDivision}`;
    } else {
      if (!userNameInput.trim()) {
        showToast('Nama wajib diisi!', 'danger');
        return;
      }
      finalName = userNameInput.trim();
      finalUsername = finalName.toLowerCase().replace(/\s+/g, '_');
      finalDivision = userFormRole === 'Admin' ? 'Admin Pool' : 'Divisi IT & Master';
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: finalUsername,
          password_hash: userPasswordInput,
          name: finalName,
          division: finalDivision,
          role: userFormRole
        })
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        showToast(json.error || 'Gagal menambahkan user', 'danger');
        return;
      }

      showToast(`User ${finalName} (${userFormRole}) berhasil ditambahkan ke Supabase!`);
      await refreshUsers();
      setIsUserModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan saat menambahkan user', 'danger');
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus user ${name}?`)) {
      try {
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (!res.ok || json.error) {
          showToast(json.error || 'Gagal menghapus user', 'danger');
          return;
        }
        showToast(`User ${name} telah dihapus dari Supabase!`, 'danger');
        await refreshUsers();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Filtered Lists
  const filteredCars = cars.filter(c =>
    c.name.toLowerCase().includes(carSearch.toLowerCase()) ||
    c.plateNumber.toLowerCase().includes(carSearch.toLowerCase()) ||
    c.type.toLowerCase().includes(carSearch.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.nip.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.division.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen w-full bg-[#eaf4fd] text-slate-900 font-sans flex overflow-x-hidden">
      
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border text-xs font-bold transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-red-600 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEFT SIDEBAR (No Dock for Superadmin! Light Admin Theme) */}
      {/* ========================================================================= */}
      <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between p-4 shrink-0 min-h-screen shadow-sm">
        <div className="space-y-6">
          
          {/* Logo & Brand Header */}
          <div className="p-3.5 bg-[#f0f7fe] rounded-2xl border border-blue-100 flex items-center gap-3">
           
            <div>
              <h1 className="text-xs font-extrabold tracking-wider uppercase text-slate-900">
                SUPER<span className="text-blue-600">ADMIN</span>
              </h1>
             
            </div>
          </div>

          {/* Navigation Menu Links */}
          <nav className="space-y-1 text-xs font-semibold">
            
            {/* Dashboard Dropdown Group */}
            <div>
              <button
                onClick={() => setIsDashboardDropdownOpen(!isDashboardDropdownOpen)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeMenu === 'manajemen-mobil' || activeMenu === 'layout-mobil'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard size={17} className="text-blue-600" />
                  <span>Dashboard Master</span>
                </div>
                {isDashboardDropdownOpen ? (
                  <ChevronUp size={15} className="text-blue-600" />
                ) : (
                  <ChevronDown size={15} className="text-slate-400" />
                )}
              </button>

              {/* Submenu Dropdown Container */}
              {isDashboardDropdownOpen && (
                <div className="mt-1 ml-3 pl-3 border-l-2 border-blue-200 space-y-1 py-1">
                  
                  {/* Submenu 1: Manajemen Mobil */}
                  <button
                    onClick={() => {
                      setActiveMenu('manajemen-mobil');
                      setCarSubView('list');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] transition-all cursor-pointer ${
                      activeMenu === 'manajemen-mobil'
                        ? 'bg-blue-600 text-white font-bold shadow-sm'
                        : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Car size={14} />
                      <span>Manajemen Mobil</span>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                        activeMenu === 'manajemen-mobil'
                          ? 'bg-blue-700 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {cars.length}
                    </span>
                  </button>

                  {/* Submenu 2: Layout Mobil (Urutan Home) */}
                  <button
                    onClick={() => setActiveMenu('layout-mobil')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] transition-all cursor-pointer ${
                      activeMenu === 'layout-mobil'
                        ? 'bg-blue-600 text-white font-bold shadow-sm'
                        : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Layers size={14} />
                      <span>Layout Mobil Home</span>
                    </div>
                    <span className="text-[9px] font-bold uppercase text-amber-600 bg-amber-50 px-1 rounded border border-amber-200">
                      Urutan
                    </span>
                  </button>

                </div>
              )}
            </div>

            {/* Menu 2: Manajemen User */}
            <button
              onClick={() => setActiveMenu('users')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeMenu === 'users'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users size={17} />
                <span>Manajemen User</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                  activeMenu === 'users' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {users.length}
              </span>
            </button>

            {/* Menu 3: Log Peminjaman */}
            <button
              onClick={() => setActiveMenu('history')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeMenu === 'history'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet size={17} />
              <span>Log Peminjaman</span>
            </button>

            {/* Menu 4: Pengaturan System */}
            <button
              onClick={() => setActiveMenu('settings')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeMenu === 'settings'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Settings size={17} />
              <span>Pengaturan System</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer User Info & Exit */}
        <div className="space-y-3 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200/60">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
              SA
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-xs font-bold text-slate-900 truncate">Super Administrator</p>
             
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-300 hover:bg-red-50 text-slate-700 hover:text-red-600 text-xs font-semibold transition-all cursor-pointer bg-white shadow-xs"
          >
            <LogOut size={15} />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA */}
      {/* ========================================================================= */}
      <main className="flex-1 p-6 sm:p-8 space-y-6 overflow-y-auto">

        {/* Top Header Bar */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
            
               </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
              {activeMenu === 'manajemen-mobil' && (carSubView === 'form' ? (editingCarId ? 'Halaman Edit Detail Mobil' : 'Halaman Tambah Mobil Baru') : 'Manajemen Mobil ')}
              {activeMenu === 'layout-mobil' && 'Layout Mobil'}
              {activeMenu === 'users' && 'Manajemen User (Tambah & Hapus Pegawai)'}
              {activeMenu === 'history' && 'Log Peminjaman Armada Dinas'}
              {activeMenu === 'settings' && 'Pengaturan Master Sistem'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
         

            {activeMenu === 'users' && (
              <button
                onClick={() => handleOpenUserModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
               
                <span>Tambah User Baru</span>
              </button>
            )}
          </div>
        </header>

        {/* ========================================================================= */}
        {/* SUBMENU 1: MANAJEMEN MOBIL (DAFTAR TABEL & HALAMAN FORM INLINE) */}
        {/* ========================================================================= */}
        {activeMenu === 'manajemen-mobil' && (
          <div className="space-y-5">
            
            {/* SUBVIEW 1.1: TABEL DAFTAR MOBIL */}
            {carSubView === 'list' && (
              <>
                {/* Search & Action Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="relative w-full sm:w-80">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari judul mobil, plat nomor, atau jenis..."
                      value={carSearch}
                      onChange={e => setCarSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button
                    onClick={() => handleOpenCarForm()}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>Tambahkan Mobil Baru </span>
                  </button>
                </div>

                {/* Cars Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-semibold bg-slate-50/70">
                          <th className="py-4 px-5">Foto Mobil</th>
                          <th className="py-4 px-5">Judul Mobil & Plat</th>
                          <th className="py-4 px-5">Spesifikasi Unit</th>
                          <th className="py-4 px-5 text-center">Status di Home</th>
                          <th className="py-4 px-5 text-right">Aksi CRUD</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredCars.length > 0 ? (
                          filteredCars.map((car) => (
                            <tr key={car.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* Foto Mobil */}
                              <td className="py-3.5 px-5">
                                <div
                                  className="relative w-20 h-12 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden"
                                  style={{
                                    backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                                    backgroundSize: '6px 6px'
                                  }}
                                >
                                  <Image
                                    src={car.image}
                                    alt={car.name}
                                    fill
                                    unoptimized={car.image.startsWith('data:')}
                                    className="object-contain p-1"
                                  />
                                </div>
                              </td>

                              {/* Judul Mobil & Plat */}
                              <td className="py-3.5 px-5">
                                <p className="font-bold text-slate-900">{car.name}</p>
                                <p className="text-[11px] font-mono text-blue-600 font-bold">{car.plateNumber}</p>
                              </td>

                              {/* Spesifikasi */}
                              <td className="py-3.5 px-5">
                                <span className="font-semibold text-slate-800">{car.type}</span> • <span className="text-slate-600">{car.transmission}</span> • <span className="text-slate-600">{car.fuel}</span>
                              </td>

                              {/* Status di Home */}
                              <td className="py-3.5 px-5 text-center">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${
                                    car.status === 'Tersedia'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-red-50 text-red-700 border-red-200'
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${car.status === 'Tersedia' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                  {car.status}
                                </span>
                              </td>

                              {/* Aksi CRUD */}
                              <td className="py-3.5 px-5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleOpenCarForm(car)}
                                    className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 transition-colors cursor-pointer"
                                    title="Edit Foto & Detail Mobil"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCar(car.id, car.name)}
                                    className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors cursor-pointer"
                                    title="Hapus Mobil Dari Home"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-400">
                              Tidak ada mobil ditemukan.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* SUBVIEW 1.2: HALAMAN FORM INPUT MOBIL (INLINE PAGE VIEW - TANPA POPUP!) */}
            {carSubView === 'form' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm max-w-3xl mx-auto space-y-6">
                
                {/* Form Navigation Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCarSubView('list')}
                      className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div>
                      <span className="text-[10px] font-mono font-bold text-blue-600 uppercase tracking-wider">
                        {editingCarId ? 'EDIT DATA MOBIL' : 'INPUT MOBIL BARU KE HOME'}
                      </span>
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                        {editingCarId ? 'Edit Detail & Foto Mobil' : 'Halaman Formulir Unit Baru'}
                      </h3>
                    </div>
                  </div>

                  <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                    Auto Remove BG Active
                  </span>
                </div>

                <form onSubmit={handleSaveCar} className="space-y-5 text-xs">
                  
                  {/* Judul Mobil */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">Judul / Nama Mobil</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Toyota Innova Zenix"
                      value={carFormData.name}
                      onChange={e => setCarFormData({ ...carFormData, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 text-xs"
                    />
                  </div>

                  {/* Plat Nomor */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">Plat Nomor</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: DA 1150 NF"
                      value={carFormData.plateNumber}
                      onChange={e => setCarFormData({ ...carFormData, plateNumber: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 font-mono text-xs"
                    />
                  </div>

                  {/* Upload Foto Mobil dari Computer (Auto Remove BG Fully Automated) */}
                  <div className="space-y-3 pt-1">
                    <label className="font-semibold text-slate-700">Foto Mobil (Upload File dari Computer)</label>
                    
                    <div className="border-2 border-dashed border-blue-200 hover:border-blue-500 rounded-2xl p-6 bg-blue-50/40 hover:bg-blue-50 transition-all text-center space-y-2 relative cursor-pointer group">
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                        onChange={handleImageFileSelect}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                      />

                      <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto transition-transform group-hover:scale-110 shadow-xs">
                        <Upload size={22} />
                      </div>

                      <div>
                        <p className="text-xs sm:text-sm font-bold text-slate-800">
                          {isProcessingImage ? 'Memproses & Menghapus Background...' : 'Pilih / Tarik File Gambar dari Computer (JPG, PNG, SVG, WEBP)'}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Segala warna background (biru, merah, hitam, putih) otomatis langsung dihapus & transparan!
                        </p>
                      </div>
                    </div>

                    {/* Checkerboard Image Preview Box */}
                    {carFormData.image && (
                      <div className="mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-4">
                        <div
                          className="w-28 h-18 rounded-xl border border-slate-300 relative flex items-center justify-center shrink-0 overflow-hidden"
                          style={{
                            backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                            backgroundSize: '8px 8px'
                          }}
                        >
                          <Image
                            src={carFormData.image}
                            alt="Preview Mobil"
                            fill
                            unoptimized={carFormData.image.startsWith('data:')}
                            className="object-contain p-1"
                          />
                        </div>

                        <div className="text-xs space-y-1">
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full text-[10px] border border-emerald-200">
                            <Sparkles size={12} />
                            <span>Hasil Background Transparan Otomatis</span>
                          </span>
                          <p className="text-slate-600 text-xs font-semibold">
                            {carFormData.name || 'Mobil Dinas'} {carFormData.plateNumber}
                          </p>
                          <p className="text-slate-400 text-[11px]">Siap ditampilkan di Beranda Utama Home!</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Jenis, Transmisi, Bahan Bakar */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-700">Jenis</label>
                      <select
                        value={carFormData.type}
                        onChange={e => setCarFormData({ ...carFormData, type: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900"
                      >
                        <option value="SUV">SUV</option>
                        <option value="Sedan">Sedan</option>
                        <option value="MPV">MPV</option>
                        <option value="Hatchback">Hatchback</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-700">Transmisi</label>
                      <select
                        value={carFormData.transmission}
                        onChange={e => setCarFormData({ ...carFormData, transmission: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900"
                      >
                        <option value="Automatic">Automatic</option>
                        <option value="Manual">Manual</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-700">Bahan Bakar</label>
                      <select
                        value={carFormData.fuel}
                        onChange={e => setCarFormData({ ...carFormData, fuel: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900"
                      >
                        <option value="Bensin">Bensin</option>
                        <option value="Diesel">Diesel</option>
                        <option value="Hybrid">Hybrid</option>
                        <option value="Listrik">Listrik</option>
                      </select>
                    </div>
                  </div>

                  {/* Status di Home */}
                  <div className="space-y-1.5 pt-1">
                    <label className="font-semibold text-slate-700">Status di Home</label>
                    <div className="flex items-center gap-6 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-emerald-700 font-semibold">
                        <input
                          type="radio"
                          name="status"
                          checked={carFormData.status === 'Tersedia'}
                          onChange={() => setCarFormData({ ...carFormData, status: 'Tersedia' })}
                          className="w-4 h-4 text-emerald-600 cursor-pointer"
                        />
                        <span>🟢 Tersedia (Bulatan Hijau)</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-red-700 font-semibold">
                        <input
                          type="radio"
                          name="status"
                          checked={carFormData.status === 'Tidak Tersedia'}
                          onChange={() => setCarFormData({ ...carFormData, status: 'Tidak Tersedia' })}
                          className="w-4 h-4 text-red-600 cursor-pointer"
                        />
                        <span>🔴 Tidak Tersedia (Bulatan Merah)</span>
                      </label>
                    </div>
                  </div>

                  {/* Form Action Buttons */}
                  <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setCarSubView('list')}
                      className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Batal / Kembali
                    </button>
                    
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-2"
                    >
                      <span>Simpan Mobil Ke Home</span>
                      <span>→</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUBMENU 2: LAYOUT MOBIL (MENGATUR MOBIL MANA DULU YANG DITAROH TAMPILAN ATAS) */}
        {/* ========================================================================= */}
        {activeMenu === 'layout-mobil' && (
          <div className="space-y-5">
            {/* Guide Info */}
            <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-blue-800">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <GripVertical size={18} />
              </div>
              <div>
                <p className="font-bold">Fitur Geser & Tarik (Drag & Drop)</p>
                <p className="text-[11px] text-blue-600">
                  Klik dan tahan kartu mobil menggunakan kursor untuk menggeser/mengatur urutan tampilan kendaraan di Halaman Utama (Home).
                </p>
              </div>
            </div>

            {/* List Reorder Items */}
            <div className="space-y-3">
              {cars.map((car, index) => {
                const isTop = index === 0;
                const isEvenBg = index % 2 === 0;
                const isBeingDragged = draggedIndex === index;
                const isBeingDraggedOver = dragOverIndex === index && !isBeingDragged;

                return (
                  <div
                    key={car.id || index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={e => handleDragOver(e, index)}
                    onDrop={e => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white rounded-2xl p-5 shadow-xs border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-grab active:cursor-grabbing group select-none ${
                      isBeingDragged
                        ? 'opacity-40 border-dashed border-blue-500 scale-[0.99] bg-slate-50'
                        : isBeingDraggedOver
                        ? 'border-blue-500 ring-2 ring-blue-400/40 bg-blue-50/30'
                        : isTop
                        ? 'border-blue-400 ring-2 ring-blue-500/20'
                        : 'border-slate-200/80 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Drag Handle Grip Icon */}
                      <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600 text-slate-400 transition-colors shrink-0">
                        <GripVertical size={20} />
                      </div>

                      {/* Position Number Pill */}
                      <div className="flex flex-col items-center justify-center shrink-0">
                        <span
                          className={`w-9 h-9 rounded-xl font-black text-sm flex items-center justify-center ${
                            isTop
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          #{index + 1}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                          {isEvenBg ? 'Bg Biru' : 'Bg Putih'}
                        </span>
                      </div>

                      {/* Car Image Preview */}
                      <div
                        className="relative w-24 h-14 rounded-xl border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden"
                        style={{
                          backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                          backgroundSize: '6px 6px'
                        }}
                      >
                        <Image
                          src={car.image}
                          alt={car.name}
                          fill
                          unoptimized={car.image.startsWith('data:')}
                          className="object-contain p-1 pointer-events-none"
                        />
                      </div>

                      {/* Car Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          {isTop && (
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200">
                              Tampilan Paling Atas (Top 1)
                            </span>
                          )}
                          <span className="text-xs font-mono font-bold text-blue-600">{car.plateNumber}</span>
                        </div>
                        <h4 className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5">
                          {car.name}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {car.type} • {car.transmission} • {car.fuel} • Status: <strong className={car.status === 'Tersedia' ? 'text-emerald-600' : 'text-red-600'}>{car.status}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Drag Badge Info */}
                    <div className="shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 text-right">
                      
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: MANAJEMEN USER (TAMBAH & HAPUS USER) */}
        {/* ========================================================================= */}
        {activeMenu === 'users' && (
          <div className="space-y-5">
            
            {/* Search & Action Bar */}
           

            {/* Users Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold bg-slate-50/70">
                      <th className="py-4 px-5">Nama Staff</th>
                      <th className="py-4 px-5">NIP / ID Staff</th>
                      <th className="py-4 px-5">Divisi & Kontak</th>
                      <th className="py-4 px-5 text-center">Role Hak Akses</th>
                      <th className="py-4 px-5 text-right">Aksi Hapus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                                {user.name.charAt(0)}
                              </div>
                              <span className="font-bold text-slate-900">{user.name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 font-mono text-slate-700">{user.nip}</td>
                          <td className="py-3.5 px-5">
                            <p className="text-slate-800 font-semibold">{user.division}</p>
                            <p className="text-[11px] text-slate-500">{user.phone}</p>
                          </td>
                          <td className="py-3.5 px-5 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider ${
                                user.role === 'Superadmin'
                                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                  : user.role === 'Admin'
                                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {user.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <button
                              onClick={() => handleDeleteUser(user.id, user.name)}
                              className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors cursor-pointer"
                              title="Hapus User Ini"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          Tidak ada user ditemukan.
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
        {/* VIEW 4: LOG PEMINJAMAN */}
        {/* ========================================================================= */}
        {activeMenu === 'history' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet size={18} className="text-blue-600" />
                  Global Audit & Activity Log Peminjaman
                </h3>
                <p className="text-xs text-slate-500">
                  Menampilkan log histori lengkap pengajuan dari seluruh pegawai kantor (Supabase Database).
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const mapped = peminjamanLogs.map((p: any) => ({
                      id: p.id,
                      borrowerName: p.borrower_name || '-',
                      nip: p.nip || '-',
                      division: p.division || '-',
                      phone: p.phone || '-',
                      carName: p.car_name || '-',
                      plateNumber: p.plate_number || '-',
                      startDate: p.start_date || '-',
                      startTime: p.start_time || '-',
                      endDate: p.end_date || '-',
                      endTime: p.end_time || '-',
                      duration: p.duration || '-',
                      destination: p.destination || '-',
                      purpose: p.purpose || '-',
                      driverOption: p.driver_option || 'Saya Sendiri',
                      status: p.status || '-',
                      requestDate: p.request_date ? new Date(p.request_date).toLocaleString('id-ID') : '-'
                    }));
                    exportToExcel(mapped, 'Global_Audit_Peminjaman_Superadmin');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-all cursor-pointer shadow-2xs"
                  title="Export seluruh log audit ke Microsoft Excel (.xlsx)"
                >
                  <FileSpreadsheet size={14} className="text-emerald-600" />
                  <span>Export Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const mapped = peminjamanLogs.map((p: any) => ({
                      id: p.id,
                      borrowerName: p.borrower_name || '-',
                      nip: p.nip || '-',
                      division: p.division || '-',
                      phone: p.phone || '-',
                      carName: p.car_name || '-',
                      plateNumber: p.plate_number || '-',
                      startDate: p.start_date || '-',
                      startTime: p.start_time || '-',
                      endDate: p.end_date || '-',
                      endTime: p.end_time || '-',
                      duration: p.duration || '-',
                      destination: p.destination || '-',
                      purpose: p.purpose || '-',
                      driverOption: p.driver_option || 'Saya Sendiri',
                      status: p.status || '-',
                      requestDate: p.request_date ? new Date(p.request_date).toLocaleString('id-ID') : '-'
                    }));
                    exportToPDF(mapped, 'Global_Audit_Peminjaman_Superadmin', 'Laporan Global Audit Log Peminjaman Mobil Dinas');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-bold hover:bg-red-100 transition-all cursor-pointer shadow-2xs"
                  title="Export seluruh log audit ke format PDF"
                >
                  <FileText size={14} className="text-red-600" />
                  <span>Export PDF</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (peminjamanLogs.length === 0) {
                      showToast('Tidak ada data riwayat peminjaman untuk dihapus', 'danger');
                      return;
                    }
                    if (!confirm('⚠️ PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA riwayat peminjaman mobil dari database?\n\nSemua riwayat peminjaman akan dihapus dan status mobil akan direset ke Tersedia.')) {
                      return;
                    }
                    try {
                      const res = await fetch('/api/peminjaman', { method: 'DELETE' });
                      if (res.ok) {
                        showToast('Seluruh riwayat peminjaman berhasil dibersihkan dari database!');
                        await refreshLogs();
                        await refreshCars();
                      } else {
                        showToast('Gagal menghapus riwayat peminjaman', 'danger');
                      }
                    } catch (err) {
                      console.error(err);
                      showToast('Terjadi kesalahan saat menghapus data', 'danger');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition-all cursor-pointer shadow-2xs"
                  title="Hapus seluruh log riwayat peminjaman"
                >
                  <Trash2 size={14} className="text-rose-600" />
                  <span>Hapus Riwayat</span>
                </button>

                <button
                  type="button"
                  onClick={refreshLogs}
                  className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold hover:bg-blue-100 transition-all cursor-pointer shadow-2xs"
                >
                  Refresh Data
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 space-y-2">
              <div className="flex justify-between border-b border-slate-200 pb-2 text-slate-400 font-bold">
                <span className="w-1/4">TIMESTAMP</span>
                <span className="w-2/4">DESKRIPSI AKTIVITAS</span>
                <span className="w-1/4 text-right">STATUS</span>
              </div>

              {peminjamanLogs.length === 0 ? (
                <div className="py-8 text-center text-slate-400 font-sans">
                  Belum ada log histori peminjaman di database.
                </div>
              ) : (
                peminjamanLogs.map((log: any) => (
                  <div key={log.id} className="flex justify-between py-2 border-b border-slate-200/60 text-[11px] items-center">
                    <span className="w-1/4 text-slate-400">
                      {log.request_date ? new Date(log.request_date).toLocaleString('id-ID') : '-'}
                    </span>
                    <span className="w-2/4 font-sans text-slate-800">
                      User <strong>{log.borrower_name}</strong> mengajukan peminjaman <strong>{log.car_name} ({log.plate_number})</strong>
                    </span>
                    <span
                      className={`w-1/4 text-right font-bold ${
                        log.status === 'Disetujui'
                          ? 'text-emerald-600'
                          : log.status === 'Ditolak'
                          ? 'text-red-600'
                          : log.status === 'Selesai'
                          ? 'text-blue-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {log.status?.toUpperCase() || 'PENDING'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 5: PENGATURAN SUPERADMIN */}
        {/* ========================================================================= */}
        {activeMenu === 'settings' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 max-w-2xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Settings size={18} className="text-blue-600" />
              Konfigurasi Master Superadmin
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <p className="font-bold text-slate-800">Reset Semua Data Home ke Default</p>
                  <p className="text-[11px] text-slate-500">Kembalikan daftar mobil ke 3 unit default Innova Zenix</p>
                </div>
                <button
                  onClick={() => {
                    saveCarsToStorage(INITIAL_CARS);
                    showToast('Data mobil Home telah direset ke 3 unit default!');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-bold hover:bg-red-100 cursor-pointer"
                >
                  Reset Data
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* MODAL CRUD USER (TAMBAH USER BARU WITH CONDITIONAL ROLE FIELDS) */}
      {/* ========================================================================= */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 my-8 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-emerald-600 uppercase">
                  TAMBAH USER BARU
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Input Data Hak Akses & Akun
                </h3>
              </div>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              
              {/* Role Hak Akses Select */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Role Hak Akses</label>
                <select
                  value={userFormRole}
                  onChange={e => setUserFormRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                >
                  <option value="Staff">Staff</option>
                  <option value="Admin">Admin Pool</option>
                  <option value="Superadmin">Superadmin Master</option>
                </select>
              </div>

              {/* Dynamic Form Fields based on Role */}
              {userFormRole === 'Staff' ? (
                /* Fields for Staff: Divisi, Password, Konfirmasi Password */
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">Divisi</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Operasi Pelabuhan"
                      value={userDivisionInput}
                      onChange={e => setUserDivisionInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Masukkan Password"
                      value={userPasswordInput}
                      onChange={e => setUserPasswordInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">Konfirmasi Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Ulangi Password"
                      value={userConfirmPasswordInput}
                      onChange={e => setUserConfirmPasswordInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              ) : (
                /* Fields for Admin & Superadmin: Nama, Password, Konfirmasi Password */
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">Nama</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Ahmad Fauzi"
                      value={userNameInput}
                      onChange={e => setUserNameInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Masukkan Password"
                      value={userPasswordInput}
                      onChange={e => setUserPasswordInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">Konfirmasi Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Ulangi Password"
                      value={userConfirmPasswordInput}
                      onChange={e => setUserConfirmPasswordInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md cursor-pointer"
                >
                  Simpan User Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
