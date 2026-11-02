/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { DashboardPreview } from './components/DashboardPreview';
import { AboutSection } from './components/AboutSection';
import { KeunggulanSection } from './components/KeunggulanSection';
import { FiturUtamaSection } from './components/FiturUtamaSection';
import { VipSection } from './components/VipSection';
import { CtaSection } from './components/CtaSection';
import { Footer } from './components/Footer';
import { LoginModal } from './components/auth/LoginModal';
import { InfoModals } from './components/public/InfoModals';
import { ProtectedDashboard } from './components/dashboard/ProtectedDashboard';
import AdminApp from './admin/AdminApp';
import { Megaphone, AlertTriangle, ShieldCheck, ExternalLink } from 'lucide-react';

function MainAppContent() {
  const { user, loading } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [infoModalType, setInfoModalType] = useState<'terms' | 'privacy' | 'faq' | 'contact' | null>(null);
  const [viewState, setViewState] = useState<'landing' | 'dashboard'>('landing');

  // Dynamic public system settings
  const [publicSettings, setPublicSettings] = useState<{
    siteName?: string;
    announcementActive?: boolean;
    announcementText?: string;
    announcementType?: 'info' | 'warning' | 'promo';
    maintenanceMode?: boolean;
    maintenanceMessage?: string;
    customerServiceUrl?: string;
    adminWhatsappUrl?: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/public/settings')
      .then((res) => res.json())
      .then((data) => setPublicSettings(data))
      .catch(() => {});
  }, []);

  const handleOpenLogin = () => {
    if (user) {
      setViewState('dashboard');
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const handleGoToDashboard = () => {
    if (user) {
      setViewState('dashboard');
    } else {
      setIsLoginModalOpen(true);
    }
  };

  // Maintenance Mode Screen
  if (publicSettings?.maintenanceMode) {
    return (
      <div className="min-h-screen bg-[#070a13] text-slate-100 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-xl">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-white">Sedang Dalam Pemeliharaan Sistem</h1>
        <p className="mt-2 text-sm text-slate-400 max-w-md leading-relaxed">
          {publicSettings.maintenanceMessage ||
            'Platform ZynderJhnzV1Beta sedang dalam pemeliharaan berkala untuk peningkatan kecepatan jaringan.'}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {publicSettings.customerServiceUrl && (
            <a
              href={publicSettings.customerServiceUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors inline-flex items-center gap-1.5"
            >
              <span>Hubungi Layanan CS</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <a
            href="/ZIN"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            Masuk Portal /ZIN
          </a>
        </div>
      </div>
    );
  }

  // If user is logged in and on dashboard view, render Protected Dashboard
  if (user && viewState === 'dashboard') {
    return (
      <ProtectedDashboard
        onReturnToLanding={() => setViewState('landing')}
      />
    );
  }

  // Otherwise, render Public Landing Page
  return (
    <div className="min-h-screen bg-[#070a13] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Dynamic Announcement Banner */}
      {publicSettings?.announcementActive && publicSettings.announcementText && (
        <div className="bg-gradient-to-r from-cyan-950 via-purple-950 to-cyan-950 border-b border-cyan-500/20 px-4 py-2 text-center text-xs text-cyan-200 flex items-center justify-center gap-2">
          <Megaphone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="font-medium">{publicSettings.announcementText}</span>
        </div>
      )}

      {/* Top Navigation */}
      <Navbar
        onOpenLogin={handleOpenLogin}
        onOpenFaq={() => setInfoModalType('faq')}
        onOpenContact={() => setInfoModalType('contact')}
        onGoToDashboard={handleGoToDashboard}
      />

      <main className="flex-1">
        {/* Hero Section */}
        <HeroSection onOpenModal={handleOpenLogin} />

        {/* Live Interactive Dashboard Preview Showcase */}
        <DashboardPreview />

        {/* About Section */}
        <AboutSection />

        {/* Keunggulan Platform */}
        <KeunggulanSection />

        {/* Fitur Utama */}
        <FiturUtamaSection />

        {/* VIP Membership Tiers */}
        <VipSection onOpenModal={handleOpenLogin} />

        {/* Call to Action */}
        <CtaSection onOpenModal={handleOpenLogin} />
      </main>

      {/* Quiet Footer with Public Policy Modals */}
      <Footer
        onOpenTerms={() => setInfoModalType('terms')}
        onOpenPrivacy={() => setInfoModalType('privacy')}
        onOpenFaq={() => setInfoModalType('faq')}
        onOpenContact={() => setInfoModalType('contact')}
      />

      {/* Google Authentication Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onOpenPrivacy={() => setInfoModalType('privacy')}
        onOpenTerms={() => setInfoModalType('terms')}
      />

      {/* Public Pages: Terms, Privacy, FAQ, Contact Modals */}
      <InfoModals
        type={infoModalType}
        onClose={() => setInfoModalType(null)}
      />
    </div>
  );
}

export default function App() {
  const isAdminRoute = window.location.pathname.toLowerCase().startsWith('/zin');

  // Dedicated isolated admin panel
  if (isAdminRoute) {
    return <AdminApp />;
  }

  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
