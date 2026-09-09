import React, { useState } from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { Modal } from '../ui/Modal';
import { ShieldAlert, CheckCircle } from 'lucide-react';

const REASON_OPTIONS = [
  { id: 'Wind', label: 'Wind / Breeze' },
  { id: 'Foliage', label: 'Swaying Foliage / Plants' },
  { id: 'Shadow', label: 'Sunlight / Shadow shifts' },
  { id: 'Animal', label: 'Animal / Pet motion' },
  { id: 'Lighting', label: 'IR Night Lighting artifact' },
  { id: 'Camera artifact', label: 'Camera Sensor Artifact' },
  { id: 'Delivery Courier', label: 'Delivery / Courier (Authorized)' },
  { id: 'Other', label: 'Other Environmental Cause' },
];

export const FalsePositiveModal: React.FC = () => {
  const { feedbackModalAlert, setFeedbackModalAlert, markAlertFalsePositive } = useSecurity();
  const [selectedReason, setSelectedReason] = useState<string>('Foliage');
  const [customNote, setCustomNote] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!feedbackModalAlert) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = selectedReason === 'Other' && customNote ? customNote : selectedReason;
    markAlertFalsePositive(feedbackModalAlert.id, finalReason);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFeedbackModalAlert(null);
    }, 1500);
  };

  return (
    <Modal
      isOpen={!!feedbackModalAlert}
      onClose={() => setFeedbackModalAlert(null)}
      title="False Alert Feedback Loop"
    >
      {submitted ? (
        <div className="py-8 text-center space-y-3">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
          <h4 className="text-lg font-bold text-white">Feedback Recorded</h4>
          <p className="text-sm text-slate-300">
            Edge model confidence threshold updated. Future false alerts from this environmental trigger will be suppressed.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-3 p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl text-amber-300 text-xs">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold">Was this alert a false alarm?</p>
              <p className="text-amber-400/80">
                Flagging false alarms trains local edge thresholds to distinguish foliage, wind, and shadows from true human threats.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
              Select Primary Cause of False Positive:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {REASON_OPTIONS.map(opt => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setSelectedReason(opt.id)}
                  className={`p-3 rounded-xl text-left text-xs font-medium border transition-all ${
                    selectedReason === opt.id
                      ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-500/20'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {selectedReason === 'Other' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Specify Details:</label>
              <input
                type="text"
                value={customNote}
                onChange={e => setCustomNote(e.target.value)}
                placeholder="e.g. Car headlight beam flare..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
              />
            </div>
          )}

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setFeedbackModalAlert(null)}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20"
            >
              Submit Feedback
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
