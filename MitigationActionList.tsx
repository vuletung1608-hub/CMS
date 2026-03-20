import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { RiskEvent } from '../types';
import { Plus, ChevronRight, Search, Filter } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const RiskEventList: React.FC = () => {
  const [events, setEvents] = useState<RiskEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'riskEvents'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnap) => {
      const eventsData = querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RiskEvent));
      setEvents(eventsData);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'riskEvents');
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const filteredEvents = events.filter(e => 
    e.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.idCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Risk Events</h1>
          <p className="text-zinc-500 mt-1">Manage and track all operational risk events.</p>
        </div>
        <Link to="/events/new" className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-2xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20">
          <Plus size={20} />
          Report Event
        </Link>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
          <input
            type="text"
            placeholder="Search by ID or summary..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        <button className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-zinc-100 transition-colors flex items-center gap-2">
          <Filter size={20} />
          Filter
        </button>
      </div>

      <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-800/50 text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-bold">
              <tr>
                <th className="px-8 py-5">ID Code</th>
                <th className="px-8 py-5">Summary</th>
                <th className="px-8 py-5 text-center">Status</th>
                <th className="px-8 py-5 text-center">Risk Level</th>
                <th className="px-8 py-5">Detection Date</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-zinc-500">Loading events...</td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-zinc-500">No events found.</td>
                </tr>
              ) : (
                filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-zinc-800/30 transition-colors cursor-pointer group">
                    <td className="px-8 py-5 font-mono text-emerald-500 text-sm font-bold">{event.idCode}</td>
                    <td className="px-8 py-5">
                      <p className="text-zinc-100 font-bold group-hover:text-emerald-500 transition-colors">{event.summary}</p>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{event.detectingDivision}</p>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex justify-center">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                          event.status === 'In Progress' ? 'bg-emerald-500/10 text-emerald-500' :
                          event.status === 'Cancelled' ? 'bg-red-500/10 text-red-500' :
                          'bg-amber-500/10 text-amber-500'
                        )}>
                          {event.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex justify-center">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                          event.riskLevel === 'High' ? 'bg-red-500/10 text-red-500' :
                          event.riskLevel === 'Medium' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-emerald-500/10 text-emerald-500'
                        )}>
                          {event.riskLevel}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-zinc-400 text-sm">{event.dateOfDetection}</td>
                    <td className="px-8 py-5 text-zinc-500 group-hover:text-zinc-100 transition-colors">
                      <Link to={`/events/${event.id}`}>
                        <ChevronRight size={20} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RiskEventList;
