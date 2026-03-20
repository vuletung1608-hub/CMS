import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { RiskEvent, RiskEventStatus, Attachment } from '../types';
import { useAuth } from '../App';
import { ChevronLeft, Save, AlertCircle, Paperclip, X, FileText } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const RiskEventForm: React.FC<{ isEdit?: boolean }> = ({ isEdit }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(isEdit ? true : false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<RiskEvent>>({
    summary: '',
    description: '',
    detectingDivision: '',
    detectingDept: '',
    occurringDivision: '',
    occurringDept: '',
    dateOfDetection: new Date().toISOString().split('T')[0],
    dateOfOccurrence: new Date().toISOString().split('T')[0],
    status: 'Initiated',
    riskLevel: 'Medium',
    criticalRisk: false,
    lossAmount: 0,
    additionalExpense: 0,
    recoveryInsurance: 0,
    recoveryStaff: 0,
    recoveryOther: 0,
    netLoss: 0,
    likelihood: 3,
    impact: 3,
  });

  useEffect(() => {
    if (isEdit && id) {
      const fetchEvent = async () => {
        try {
          const docRef = doc(db, 'riskEvents', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setFormData(docSnap.data() as RiskEvent);
          } else {
            setError('Event not found');
          }
        } catch (err) {
          setError('Failed to fetch event');
        } finally {
          setLoading(false);
        }
      };
      fetchEvent();
    }
  }, [id, isEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => {
      const updated = { ...prev, [name]: val };
      
      // Auto-calculate net loss
      if (['lossAmount', 'additionalExpense', 'recoveryInsurance', 'recoveryStaff', 'recoveryOther'].includes(name)) {
        const loss = Number(updated.lossAmount || 0);
        const expense = Number(updated.additionalExpense || 0);
        const recIns = Number(updated.recoveryInsurance || 0);
        const recStaff = Number(updated.recoveryStaff || 0);
        const recOther = Number(updated.recoveryOther || 0);
        updated.netLoss = (loss + expense) - (recIns + recStaff + recOther);
      }

      // Auto-calculate risk level based on matrix
      if (name === 'likelihood' || name === 'impact') {
        const l = Number(updated.likelihood || 3);
        const i = Number(updated.impact || 3);
        const score = l * i;
        if (score >= 15) updated.riskLevel = 'High';
        else if (score >= 8) updated.riskLevel = 'Medium';
        else updated.riskLevel = 'Low';
      }

      return updated;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = Array.from(files).map((file: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      url: '#', // Mock URL
      type: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString()
    }));

    setFormData(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), ...newAttachments]
    }));
  };

  const removeAttachment = (id: string) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments?.filter(a => a.id !== id)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const eventId = isEdit ? id! : `ORM-${Date.now()}`;
      const data = {
        ...formData,
        id: eventId,
        idCode: isEdit ? formData.idCode : eventId,
        createdBy: isEdit ? formData.createdBy : auth.currentUser?.uid,
        createdAt: isEdit ? formData.createdAt : new Date().toISOString(),
        updatedAt: serverTimestamp(),
      };

      if (isEdit) {
        await updateDoc(doc(db, 'riskEvents', eventId), data);
      } else {
        await setDoc(doc(db, 'riskEvents', eventId), data);
      }
      navigate(`/events/${eventId}`);
    } catch (err) {
      handleFirestoreError(err, isEdit ? OperationType.UPDATE : OperationType.CREATE, 'riskEvents');
      setError('Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-zinc-400">Loading form...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-100 mb-6 transition-colors font-medium">
        <ChevronLeft size={20} />
        Back
      </button>

      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">{isEdit ? 'Edit Risk Event' : 'Report Risk Event'}</h1>
          <p className="text-zinc-500 mt-1">Fill in the details of the operational risk event.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500">
          <AlertCircle size={20} />
          <p className="font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section: Basic Info */}
        <section className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8">
          <h2 className="text-lg font-bold text-zinc-100 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-400 mb-2">Summary</label>
              <input
                required
                name="summary"
                value={formData.summary}
                onChange={handleChange}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="Brief summary of the event"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-400 mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="Detailed description of what happened"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Date of Detection</label>
              <input
                type="date"
                required
                name="dateOfDetection"
                value={formData.dateOfDetection}
                onChange={handleChange}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Date of Occurrence</label>
              <input
                type="date"
                required
                name="dateOfOccurrence"
                value={formData.dateOfOccurrence}
                onChange={handleChange}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>
        </section>

        {/* Section: Division Info */}
        <section className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8">
          <h2 className="text-lg font-bold text-zinc-100 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            Division & Department
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Detecting Division</label>
              <select
                required
                name="detectingDivision"
                value={formData.detectingDivision}
                onChange={handleChange}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="">Select Division</option>
                <option value="Retail Banking">Retail Banking</option>
                <option value="SME">SME</option>
                <option value="CIB">CIB</option>
                <option value="IT">IT</option>
                <option value="OPS">OPS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Occurring Division</label>
              <select
                required
                name="occurringDivision"
                value={formData.occurringDivision}
                onChange={handleChange}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="">Select Division</option>
                <option value="Retail Banking">Retail Banking</option>
                <option value="SME">SME</option>
                <option value="CIB">CIB</option>
                <option value="IT">IT</option>
                <option value="OPS">OPS</option>
              </select>
            </div>
          </div>
        </section>

        {/* Section: Financial Impact */}
        <section className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8">
          <h2 className="text-lg font-bold text-zinc-100 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            Financial Impact (mil VND)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Loss Amount</label>
              <input
                type="number"
                name="lossAmount"
                value={formData.lossAmount}
                onChange={handleChange}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Additional Expense</label>
              <input
                type="number"
                name="additionalExpense"
                value={formData.additionalExpense}
                onChange={handleChange}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Net Loss</label>
              <input
                readOnly
                type="number"
                name="netLoss"
                value={formData.netLoss}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-emerald-500 font-bold focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* Section: Risk Assessment */}
        <section className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8">
          <h2 className="text-lg font-bold text-zinc-100 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            Risk Assessment
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Likelihood (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                name="likelihood"
                value={formData.likelihood}
                onChange={handleChange}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Impact (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                name="impact"
                value={formData.impact}
                onChange={handleChange}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Risk Level</label>
              <div className={cn(
                "w-full rounded-xl px-4 py-3 font-bold text-center",
                formData.riskLevel === 'High' ? 'bg-red-500/10 text-red-500' :
                formData.riskLevel === 'Medium' ? 'bg-amber-500/10 text-amber-500' :
                'bg-emerald-500/10 text-emerald-500'
              )}>
                {formData.riskLevel}
              </div>
            </div>
          </div>
        </section>

        {/* Section: Attachments */}
        <section className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8">
          <h2 className="text-lg font-bold text-zinc-100 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            Attachments
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl transition-colors text-sm font-bold border border-zinc-700">
                <Paperclip size={18} />
                Add Files
                <input type="file" multiple className="hidden" onChange={handleFileChange} />
              </label>
              <p className="text-xs text-zinc-500">Upload any supporting documents (PDF, Images, etc.)</p>
            </div>

            {formData.attachments && formData.attachments.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {formData.attachments.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-zinc-800/50 border border-zinc-700 rounded-xl group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-100 truncate">{file.name}</p>
                        <p className="text-[10px] text-zinc-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => removeAttachment(file.id)}
                      className="p-1.5 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="flex justify-end gap-4 pt-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold rounded-2xl transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-2xl transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={20} />
            {isEdit ? 'Update Event' : 'Submit Event'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RiskEventForm;
