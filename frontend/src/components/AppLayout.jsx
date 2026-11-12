import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { FiMessageCircle } from 'react-icons/fi';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';
import Chatbot from './Chatbot.jsx';

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="app-shell flex">
      <Sidebar open={open} onClose={() => setOpen(false)} onOpenChatbot={() => setChatOpen(true)} />
      <div className="min-w-0 flex-1">
        <Navbar onToggle={() => setOpen(true)} />
        <main className="animate-fade-up mx-auto w-full max-w-[1500px] px-4 pb-28 pt-8 lg:px-6">
          <Outlet />
        </main>
      </div>

      {/* Acces rapide a l'assistant IA, fixe pendant le defilement */}
      {!chatOpen && (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="group fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-[0_12px_30px_-8px_rgba(5,120,70,0.65)] ring-4 ring-white/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-8px_rgba(5,120,70,0.75)] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 sm:bottom-6 sm:right-6"
          aria-label="Ouvrir l’assistant IA Asako"
          title="Assistant IA Asako"
        >
          <FiMessageCircle className="text-2xl transition-transform duration-200 group-hover:scale-110" />
          <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-300" />
        </button>
      )}

      <Chatbot open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
