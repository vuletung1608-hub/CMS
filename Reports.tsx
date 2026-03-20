import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { RiskEvent, MitigationAction, RiskEventStatus } from '../types';
import { useAuth } from '../App';
import { auth } from '../firebase';
import { ChevronLeft, Edit, Plus, CheckCircle2, Clock, AlertTriangle, MessageSquare, Trash2, User as UserIcon, FileText, Paperclip, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const RiskEventDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [event, setEvent] = useState<RiskEvent | null>(null);
  const [actions, setActions] = useState<MitigationAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showActionForm, setShowActionForm] = useState(false);

  useEffect(() => {
    if (!id) return;

    const eventRef = doc(db, 'riskEvents', id);
    const unsubscribeEvent = onSnapshot(eventRef, (docSnap) => {
      if (docSnap.exists()) {
        setEvent({ id: docSnap.id, ...docSnap.data() } as RiskEvent);
      } else {
        setError('Event not found');
      }
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `riskEvents/${id}`);
      setError('Failed to fetch event');
      setLoading(false);
    });

    const actionsQuery = query(collection(db, 'mitigationActions'), where('riskEventId', '==', id));
    const unsubscribeActions = onSnapshot(actionsQuery, (querySnap) => {
      const actionsData = querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MitigationAction));
      setActions(actionsData);
    });

    return () => {
      unsubscribeEvent();
      unsubscribeActions();
    };
  }, [id]);

  const handleStatusChange = async (newStatus: RiskEventStatus, comment?: string) => {
    if (!event) return;
    try {
      const updateData: any = { 
        status: newStatus,
        updatedAt: serverTimestamp(),
      };
      
      // Add to history (simplified for now)
      const historyEntry = {
        status: newStatus,
        user: profile?.displayName,
        role: profile?.role,
        date: new Date().toISOString(),
        comment: comment || ''
      };
      
      const newHistory = [...(event as any).history || [], historyEntry];
      updateData.history = newHistory;

      await updateDoc(doc(db, 'riskEvents', event.id), updateData);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `riskEvents/${event.id}`);
    }
  };

  const renderWorkflowButtons = () => {
    if (!event || !profile) return null;

    const role = profile.role;
    const status = event.status;

    return (
      <div className="flex flex-wrap gap-3 mt-6 p-6 bg-zinc-800/30 rounded-3xl border border-zinc-800">
        {/* Coordinator Actions */}
        {role === 'Coordinator' && status === 'Initiated' && (
          <button
            onClick={() => handleStatusChange('Submitted')}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-2xl transition-all flex items-center gap-2"
          >
            <CheckCircle2 size={18} />
            Submit to Line Manager
          </button>
        )}

        {/* Occurring Coordinator Actions */}
        {role === 'Occurring Coordinator' && status === 'Waiting for Coordinator of Occurring Unit Update' && (
          <button
            onClick={() => handleStatusChange('Under Review by Line Manager of Occurring Unit')}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-2xl transition-all flex items-center gap-2"
          >
            <CheckCircle2 size={18} />
            Submit to Line Manager (Occurring)
          </button>
        )}

        {/* Line Manager (Occurring) Actions */}
        {role === 'Line Manager' && status === 'Under Review by Line Manager of Occurring Unit' && (
          <button
            onClick={() => handleStatusChange('Under Review by ORM for Update')}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-2xl transition-all flex items-center gap-2"
          >
            <CheckCircle2 size={18} />
            Approve Update
          </button>
        )}

        {/* Line Manager Actions */}
        {role === 'Line Manager' && status === 'Submitted' && (
          <>
            <button
              onClick={() => handleStatusChange('Waiting for ORM Assignment')}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-2xl transition-all flex items-center gap-2"
            >
              <CheckCircle2 size={18} />
              Approve Event
            </button>
            <button
              onClick={() => handleStatusChange('Initiated', 'Need more details')}
              className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-bold rounded-2xl transition-all flex items-center gap-2"
            >
              <AlertTriangle size={18} />
              Request More Info
            </button>
          </>
        )}

        {/* ORM Leader Actions - Assignment */}
        {role === 'ORM Leader' && status === 'Waiting for ORM Assignment' && (
          <button
            onClick={() => handleStatusChange('Under Review by ORM for initial')}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-400 text-zinc-950 font-bold rounded-2xl transition-all flex items-center gap-2"
          >
            <UserIcon size={18} />
            Assign to ORM Staff
          </button>
        )}

        {/* ORM Staff Actions */}
        {role === 'ORM Staff' && status === 'Under Review by ORM for initial' && (
          <>
            <button
              onClick={() => handleStatusChange('Under Review by ORM leader')}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-2xl transition-all flex items-center gap-2"
            >
              <CheckCircle2 size={18} />
              Submit for Approval
            </button>
            <button
              onClick={() => handleStatusChange('Waiting for Coordinator of Occurring Unit Update')}
              className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-bold rounded-2xl transition-all flex items-center gap-2"
            >
              <AlertTriangle size={18} />
              Request Coordinator Update
            </button>
          </>
        )}

        {/* ORM Leader Actions - Final Approval */}
        {role === 'ORM Leader' && status === 'Under Review by ORM leader' && (
          <>
            <button
              onClick={() => handleStatusChange('In Progress')}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-2xl transition-all flex items-center gap-2"
            >
              <CheckCircle2 size={18} />
              Final Approve
            </button>
            <button
              onClick={() => handleStatusChange('Under Review by ORM for initial', 'Rejected by Leader')}
              className="px-6 py-3 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-zinc-950 font-bold rounded-2xl transition-all flex items-center gap-2"
            >
              <Trash2 size={18} />
              Reject to Staff
            </button>
          </>
        )}

        {/* General Cancel Action for ORM roles */}
        {(role === 'ORM Leader' || role === 'ORMD Header') && status !== 'Cancelled' && status !== 'Done' && (
          <button
            onClick={() => handleStatusChange('Cancelled')}
            className="px-6 py-3 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-zinc-950 font-bold rounded-2xl transition-all flex items-center gap-2"
          >
            <Trash2 size={18} />
            Cancel Event
          </button>
        )}
      </div>
    );
  };

  if (loading) return <div className="p-8 text-zinc-400">Loading details...</div>;
  if (error || !event) return <div className="p-8 text-red-500">{error || 'Event not found'}</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate('/events')} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-100 transition-colors font-medium">
          <ChevronLeft size={20} />
          Back to Events
        </button>
        <div className="flex gap-3">
          <Link
            to={`/events/${event.id}/edit`}
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold rounded-2xl transition-all flex items-center gap-2"
          >
            <Edit size={18} />
            Edit Event
          </Link>
          {profile?.role === 'ORM Staff' && event.status === 'Submitted' && (
            <button
              onClick={() => handleStatusChange('Under Review by ORM for initial')}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-2xl transition-all"
            >
              Start Review
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Event Details */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-bold font-mono mb-2 inline-block">
                  {event.idCode}
                </span>
                <h1 className="text-3xl font-bold text-zinc-100">{event.summary}</h1>
              </div>
              <div className={cn(
                "px-4 py-2 rounded-2xl text-sm font-bold",
                event.status === 'In Progress' ? 'bg-emerald-500/10 text-emerald-500' :
                event.status === 'Cancelled' ? 'bg-red-500/10 text-red-500' :
                'bg-amber-500/10 text-amber-500'
              )}>
                {event.status}
              </div>
            </div>

            <p className="text-zinc-400 leading-relaxed mb-8">{event.description || 'No description provided.'}</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-y border-zinc-800">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono mb-1">Risk Level</p>
                <p className={cn(
                  "font-bold",
                  event.riskLevel === 'High' ? 'text-red-500' :
                  event.riskLevel === 'Medium' ? 'text-amber-500' : 'text-emerald-500'
                )}>{event.riskLevel}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono mb-1">Net Loss</p>
                <p className="font-bold text-zinc-100">{event.netLoss} mil VND</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono mb-1">Detection Date</p>
                <p className="font-bold text-zinc-100">{event.dateOfDetection}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono mb-1">Occurrence Date</p>
                <p className="font-bold text-zinc-100">{event.dateOfOccurrence}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-zinc-700 rounded-full" />
                  Detecting Unit
                </h3>
                <div className="space-y-2">
                  <p className="text-sm text-zinc-400"><span className="text-zinc-500">Division:</span> {event.detectingDivision}</p>
                  <p className="text-sm text-zinc-400"><span className="text-zinc-500">Coordinator:</span> {event.coordinatorDetecting || 'N/A'}</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-100 mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-zinc-700 rounded-full" />
                  Occurring Unit
                </h3>
                <div className="space-y-2">
                  <p className="text-sm text-zinc-400"><span className="text-zinc-500">Division:</span> {event.occurringDivision}</p>
                  <p className="text-sm text-zinc-400"><span className="text-zinc-500">Coordinator:</span> {event.coordinatorOccurring || 'N/A'}</p>
                </div>
              </div>
            </div>

            {renderWorkflowButtons()}
          </section>

          {/* Attachments Section */}
          {event.attachments && event.attachments.length > 0 && (
            <section className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8">
              <h2 className="text-xl font-bold text-zinc-100 mb-6 flex items-center gap-3">
                <Paperclip className="text-emerald-500" />
                Attachments
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {event.attachments.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-4 bg-zinc-800/50 border border-zinc-800 rounded-2xl group hover:border-zinc-700 transition-all">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-500">
                        <FileText size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-zinc-100 truncate">{file.name}</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{(file.size / 1024).toFixed(1)} KB • {file.type.split('/')[1]}</p>
                      </div>
                    </div>
                    <a 
                      href={file.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 text-zinc-500 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all"
                    >
                      <Download size={18} />
                    </a>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Mitigation Actions Section */}
          <section className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-3">
                <CheckCircle2 className="text-emerald-500" />
                Mitigation Actions
              </h2>
              <button
                onClick={() => setShowActionForm(true)}
                className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-zinc-950 rounded-xl transition-all"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {actions.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-3xl">
                  <p className="text-zinc-500">No mitigation actions defined yet.</p>
                </div>
              ) : (
                actions.map((action) => (
                  <div key={action.id} className="p-6 bg-zinc-800/50 rounded-2xl border border-zinc-700/50 hover:border-zinc-700 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-zinc-100 group-hover:text-emerald-500 transition-colors">{action.summary}</h4>
                        <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-mono">{action.actionType}</p>
                      </div>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                        action.actualStatus === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                        action.actualStatus === 'deleted' ? 'bg-red-500/10 text-red-500' :
                        'bg-amber-500/10 text-amber-500'
                      )}>
                        {action.actualStatus}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{action.description}</p>
                    <div className="flex items-center gap-6 text-xs text-zinc-500">
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} />
                        Due: {action.dueDate}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <UserIcon size={14} />
                        {action.divisionInCharge}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Sidebar Info */}
        <div className="space-y-8">
          <section className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8">
            <h3 className="text-sm font-bold text-zinc-100 mb-6 uppercase tracking-widest font-mono">Workflow History</h3>
            <div className="space-y-6">
              {((event as any).history || [
                { status: 'Initiated', date: event.createdAt, user: 'System', role: 'System' }
              ]).map((step: any, i: number, arr: any[]) => (
                <div key={i} className="flex gap-4 relative">
                  {i < arr.length - 1 && <div className="absolute left-[11px] top-6 bottom-[-24px] w-px bg-zinc-800" />}
                  <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center z-10">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      step.status === 'In Progress' ? 'bg-emerald-500' :
                      step.status === 'Cancelled' ? 'bg-red-500' :
                      'bg-emerald-500'
                    )} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-100">{step.status}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mt-0.5">{step.user} ({step.role})</p>
                    <p className="text-[10px] text-zinc-600 mt-1">{new Date(step.date).toLocaleString()}</p>
                    {step.comment && (
                      <p className="text-xs text-zinc-400 mt-2 p-2 bg-zinc-800/50 rounded-lg italic">"{step.comment}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8">
            <h3 className="text-sm font-bold text-zinc-100 mb-6 uppercase tracking-widest font-mono">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-bold rounded-xl transition-all flex items-center gap-3">
                <MessageSquare size={18} className="text-zinc-500" />
                Add Comment
              </button>
              <button className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-bold rounded-xl transition-all flex items-center gap-3">
                <FileText size={18} className="text-zinc-500" />
                Attach Document
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Action Form Modal */}
      <AnimatePresence>
        {showActionForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowActionForm(false)}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-zinc-900 rounded-3xl border border-zinc-800 p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-zinc-100 mb-6">Add Mitigation Action</h2>
              <ActionForm riskEventId={event.id} onClose={() => setShowActionForm(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ActionForm: React.FC<{ riskEventId: string; onClose: () => void }> = ({ riskEventId, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    summary: '',
    actionType: 'Action handing event: Short-term action',
    description: '',
    divisionInCharge: '',
    dueDate: new Date().toISOString().split('T')[0],
    actualStatus: 'in progress' as const,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'mitigationActions'), {
        ...formData,
        riskEventId,
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser?.uid,
      });
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'mitigationActions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Summary</label>
        <input
          required
          value={formData.summary}
          onChange={e => setFormData({ ...formData, summary: e.target.value })}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Action Type</label>
        <select
          value={formData.actionType}
          onChange={e => setFormData({ ...formData, actionType: e.target.value })}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
        >
          <option>Action handing event: Short-term action</option>
          <option>Action handing for cause: Long-term action</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Due Date</label>
        <input
          type="date"
          required
          value={formData.dueDate}
          onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>
      <div className="flex gap-4 pt-6">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold rounded-2xl transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-2xl transition-all disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Add Action'}
        </button>
      </div>
    </form>
  );
};

export default RiskEventDetail;
