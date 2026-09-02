'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, LogIn, Headphones, AlertCircle } from 'lucide-react';
import { saveSession } from '../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        setErrorMessage(json.error || 'Login gagal. Periksa username dan password Anda.');
        setIsLoading(false);
        return;
      }

      // Save session
      saveSession(json.user);

      // Redirect by role
      const role = json.user.role as string;
      if (role === 'Superadmin') {
        router.push('/superadmin');
      } else if (role === 'Admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setErrorMessage('Tidak dapat terhubung ke server. Coba lagi.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#eaf4fd] flex items-center justify-center p-4 sm:p-8 font-sans">
      
      {/* Main Login Card Container */}
      <div className="bg-[#f9fbfe] border border-white/90 max-w-5xl w-full rounded-[36px] shadow-2xl p-8 sm:p-12 lg:p-14 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-14 relative overflow-hidden">
        
        {/* ====== LEFT COLUMN: BRANDING & CARS ====== */}
        <div className="w-full lg:w-1/2 flex flex-col justify-between space-y-8">
          

          {/* Cars Showcase */}
          <div className="relative w-full h-72 sm:h-84 lg:h-96 my-2 flex items-center justify-center">
            <div className="absolute top-0 left-0 w-[68%] sm:w-[70%] z-10 transition-transform duration-300 hover:scale-105">
              <Image
                src="/image/mobil pelindo hadap kanan.png"
                alt="Mobil Pelindo Hadap Kanan"
                width={440}
                height={270}
                priority
                className="w-full h-auto object-contain drop-shadow-xl"
              />
            </div>
            <div className="absolute bottom-0 right-0 w-[68%] sm:w-[70%] z-20 transition-transform duration-300 hover:scale-105">
              <Image
                src="/image/mobil pelindo hadap kiri.png"
                alt="Mobil Pelindo Hadap Kiri"
                width={440}
                height={270}
                priority
                className="w-full h-auto object-contain drop-shadow-2xl"
              />
            </div>
          </div>

        </div>

        {/* ====== RIGHT COLUMN: LOGIN FORM ====== */}
        <div className="w-full lg:w-1/2 max-w-md space-y-6">
          
          {/* Header */}
          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Selamat Datang
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sistem informasi untuk pengajuan dan pengelolaan<br className="hidden sm:block" />
              peminjaman mobil dinas Pelindo.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">

            {/* Error Message */}
            {errorMessage && (
              <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700 font-medium">
                <AlertCircle size={16} className="shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block text-sm">Username</label>
              <div className="relative flex items-center">
                <Mail size={18} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="Masukkan Username Anda"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#f8fafc] border border-slate-200/80 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block text-sm">Password</label>
              <div className="relative flex items-center">
                <Lock size={18} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Masukkan password Anda"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-[#f8fafc] border border-slate-200/80 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="text-right pt-0.5">
              <a href="#" className="text-xs font-bold text-[#00529c] hover:underline">
                Lupa password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#00529c] hover:bg-[#003e77] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-3"
            >
              {isLoading ? (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <LogIn size={18} />
              )}
              <span>{isLoading ? 'Memverifikasi...' : 'Masuk'}</span>
            </button>

            {/* IT Support Footer */}
            <div className="text-center pt-3 text-xs text-slate-500 flex items-center justify-center gap-1.5">
              <Headphones size={15} className="text-slate-400" />
              <span>
                Butuh bantuan? Hubungi{' '}
                <a href="#" className="font-bold text-[#00529c] hover:underline">
                  IT Support
                </a>
              </span>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}
