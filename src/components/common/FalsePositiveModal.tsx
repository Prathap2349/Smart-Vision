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
      title="Report false alarm"
    >
      {submitted ? (
        <div className="py-8 text-center space-y-3">
          <CheckCircle className="w-12 h-12 text-brand-success mx-auto animate-bounce" />
          <h4 className="text-lg font-bold text-text-primary">Feedback Recorded</h4>
          <p className="text-sm text-text-secondary">
            Thank you. Future similar alerts will be better filtered based on your feedback.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-3 p-3 bg-brand-warning/10 border border-brand-warning/30 rounded-xl text-amber-300 text-xs">
            <ShieldAlert className="w-5 h-5 text-amber-300 shrink-0" />
            <div>
              <p className="font-semibold">Was this alert a false alarm?</p>
              <p className="text-text-secondary">
                Flagging false alarms helps Smart Vision learn to distinguish real events from environmental motion.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-2">
              What caused the false alert?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {REASON_OPTIONS.map(opt => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setSelectedReason(opt.id)}
                  className={`p-3 rounded-xl text-left text-xs font-medium border transition-all ${
                    selectedReason === opt.id
                      ? 'bg-brand-blue/15 border-brand-blue/40 text-blue-300 shadow-blue-glow'
                      : 'bg-aurora-bg/80 border-white/10 text-text-secondary hover:border-white/20'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {selectedReason === 'Other' && (
            <div>
              <label className="block text-xs text-text-secondary mb-1">Describe what happened:</label>
              <input
                type="text"
                value={customNote}
                onChange={e => setCustomNote(e.target.value)}
                placeholder="e.g. Car headlight beam flare..."
                className="w-full bg-aurora-bg border border-white/15 rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-cyan/50 focus:outline-none"
              />
            </div>
          )}

          <div className="pt-3 border-t border-white/10 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setFeedbackModalAlert(null)}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-text-muted hover:bg-white/10 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-blue hover:bg-blue-600 transition shadow-blue-glow"
            >
              Submit Feedback
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
