import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';

export default function AppLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="app-shell flex">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="min-w-0 flex-1">
        <Navbar onToggle={() => setOpen(true)} />
        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 lg:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
