import { useQuery } from '@tanstack/react-query';
import { XCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function SystemAnnouncementsBanner() {
  // Unified query key — shared with App.tsx and GlobalNavActions so all three
  // consumers read from the same React Query cache (single network request).
  const { data: announcements = [] } = useQuery<any[]>({
    queryKey: ["/api/announcements"],
    queryFn: async () => {
      try {
        const res = await fetch('/api/announcements');
        if (!res.ok) return [];
        return res.json();
      } catch { return []; }
    },
    staleTime: 60000,
  });

  const [dismissed, setDismissed] = useState<number[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sansuite_dismissed_announcements');
      if (stored) setDismissed(JSON.parse(stored));
    } catch (e) { }
  }, []);

  const handleDismiss = (id: number) => {
    const newDismissed = [...dismissed, id];
    setDismissed(newDismissed);
    localStorage.setItem('sansuite_dismissed_announcements', JSON.stringify(newDismissed));
  };

  if (!announcements.length) return null;

  const activeAnnouncements = announcements.filter((a: any) => !dismissed.includes(a.id));

  return (
    <div className="w-full flex flex-col items-center no-print">
      {activeAnnouncements.map((a: any) => {
        let Icon = Info;
        let bg = 'bg-blue-600';

        if (a.type === 'warning') { Icon = AlertTriangle; bg = 'bg-amber-500'; }
        if (a.type === 'error') { Icon = XCircle; bg = 'bg-red-600'; }
        if (a.type === 'success') { Icon = CheckCircle; bg = 'bg-emerald-600'; }

        return (
          <div key={a.id} className={`${bg} text-white w-full px-4 py-2.5 flex items-center justify-between text-sm shadow-md z-40 relative`}>
            <div className="flex items-center gap-3 w-full mx-auto flex-1">
              <Icon size={18} className="shrink-0 text-white/90" />
              <div>
                <strong className="font-semibold mr-2 tracking-wide">{a.title}:</strong>
                <span className="text-white/90">{a.message}</span>
              </div>
            </div>
            <button
              onClick={() => handleDismiss(a.id)}
              className="ml-4 shrink-0 hover:bg-black/10 p-1 rounded transition-colors"
            >
              <XCircle size={16} />
            </button>
          </div>
        )
      })}
    </div>
  );
}
