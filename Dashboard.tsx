import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { RiskEvent } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Reports: React.FC = () => {
  const [events, setEvents] = useState<RiskEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'riskEvents'), orderBy('netLoss', 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, (querySnap) => {
      const eventsData = querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RiskEvent));
      setEvents(eventsData);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Risk Matrix Data (5x5)
  const matrix = Array.from({ length: 5 }, (_, i) => 
    Array.from({ length: 5 }, (_, j) => {
      const impact = 5 - i;
      const likelihood = j + 1;
      const count = events.filter(e => e.impact === impact && e.likelihood === likelihood).length;
      return { impact, likelihood, count };
    })
  );

  const getMatrixColor = (impact: number, likelihood: number) => {
    const score = impact * likelihood;
    if (score >= 15) return 'bg-red-500/20 text-red-500 border-red-500/30';
    if (score >= 8) return 'bg-amber-500/20 text-amber-500 border-amber-500/30';
    return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30';
  };

  return (
    <div className="p-8 space-y-12">
      <div>
        <h1 className="text-3xl font-bold text-zinc-100">Analytical Reports</h1>
        <p className="text-zinc-500 mt-1">Visual insights into operational risk data.</p>
      </div>

      {/* Top 20 Risks by Loss */}
      <section className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8 shadow-xl">
        <h2 className="text-xl font-bold text-zinc-100 mb-8 flex items-center gap-3">
          <div className="w-2 h-8 bg-emerald-500 rounded-full" />
          Top 20 Risk Events by Net Loss
        </h2>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={events.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis 
                dataKey="idCode" 
                stroke="#71717a" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                stroke="#71717a" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(value) => `${value}M`}
              />
              <Tooltip 
                cursor={{ fill: '#27272a' }}
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px' }}
                itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
              />
              <Bar dataKey="netLoss" radius={[6, 6, 0, 0]}>
                {events.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.riskLevel === 'High' ? '#ef4444' : entry.riskLevel === 'Medium' ? '#f59e0b' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Risk Matrix */}
        <section className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8 shadow-xl">
          <h2 className="text-xl font-bold text-zinc-100 mb-8 flex items-center gap-3">
            <div className="w-2 h-8 bg-amber-500 rounded-full" />
            Risk Heatmap (Impact vs Likelihood)
          </h2>
          <div className="grid grid-cols-6 gap-2">
            <div className="col-span-1" />
            {[1, 2, 3, 4, 5].map(l => (
              <div key={l} className="text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest pb-2">L{l}</div>
            ))}
            {matrix.map((row, i) => (
              <React.Fragment key={i}>
                <div className="flex items-center justify-end pr-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">I{5 - i}</div>
                {row.map((cell, j) => (
                  <div 
                    key={j} 
                    className={cn(
                      "aspect-square rounded-xl border flex items-center justify-center text-xl font-bold transition-all hover:scale-105 cursor-default",
                      getMatrixColor(cell.impact, cell.likelihood)
                    )}
                  >
                    {cell.count > 0 ? cell.count : ''}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
          <div className="mt-8 flex justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">High</span>
            </div>
          </div>
        </section>

        {/* Distribution by Division */}
        <section className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8 shadow-xl">
          <h2 className="text-xl font-bold text-zinc-100 mb-8 flex items-center gap-3">
            <div className="w-2 h-8 bg-blue-500 rounded-full" />
            Events by Division
          </h2>
          <div className="space-y-6">
            {['Retail Banking', 'SME', 'CIB', 'IT', 'OPS'].map(div => {
              const count = events.filter(e => e.occurringDivision === div).length;
              const percentage = events.length > 0 ? (count / events.length) * 100 : 0;
              return (
                <div key={div}>
                  <div className="flex justify-between text-sm font-medium mb-2">
                    <span className="text-zinc-100">{div}</span>
                    <span className="text-zinc-500">{count} events</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      className="h-full bg-blue-500 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Reports;
