import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SectionHeader } from '../components/ui/SectionHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import {
  UserCheck,
  UserX,
  UserPlus,
  Trash2,
  Plus,
  Upload,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react';

export const PeoplePage: React.FC = () => {
  const { residents, unknownPersons, addResident, deleteResident } = useSecurity();

  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newRole, setNewRole] = useState<'Primary Resident' | 'Family Member' | 'Frequent Visitor'>('Family Member');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [faceBase64, setFaceBase64] = useState<string>('');

  // Delete Confirmation State
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [residentToDelete, setResidentToDelete] = useState<{ id: string; name: string } | null>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setFaceBase64(result);
        setAvatarUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    await addResident({
      name: newName,
      role: newRole,
      avatarUrl: avatarUrl || undefined,
      faceImageBase64: faceBase64 || undefined,
    });

    setNewName('');
    setAvatarUrl('');
    setFaceBase64('');
    setIsAddModalOpen(false);
  };

  const confirmDelete = async () => {
    if (residentToDelete) {
      await deleteResident(residentToDelete.id);
      setResidentToDelete(null);
      setDeleteModalOpen(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Whitelisted Residents Section */}
      <div className="space-y-4">
        <SectionHeader
          title="Whitelisted Residents &amp; Family"
          subtitle="InsightFace ArcFace 512-D normalized biometric vectors. Verified residents suppress dwell alerts automatically."
          icon={<UserCheck className="w-5 h-5 text-emerald-400" />}
          action={
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-md shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Enroll New Resident
            </button>
          }
        />

        {residents.length === 0 ? (
          <EmptyState
            title="No Whitelisted Residents Enrolled"
            description="Add authorized family members or residents with facial reference photos to enable silent biometric alert suppression."
            icon={<UserCheck className="w-8 h-8 text-slate-500" />}
            action={
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition inline-flex items-center gap-1.5 shadow-md shadow-blue-600/20"
              >
                <Plus className="w-4 h-4" /> Enroll First Resident
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {residents.map((res) => (
              <Card
                key={res.id}
                className="space-y-4 relative group hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={
                          res.avatarUrl ||
                          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80'
                        }
                        alt={res.name}
                        className="w-12 h-12 rounded-xl border border-slate-700 object-cover bg-slate-800 shadow-inner"
                      />
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#0d1424]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">{res.name}</h3>
                      <p className="text-[11px] font-mono text-blue-400">{res.residentId}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setResidentToDelete({ id: res.id, name: res.name });
                      setDeleteModalOpen(true);
                    }}
                    title="Remove resident from biometric whitelist"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition border border-transparent hover:border-rose-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-xs text-slate-400 font-mono pt-3 border-t border-slate-800/80">
                  <div className="flex justify-between items-center">
                    <span>Biometric Status:</span>
                    <StatusBadge
                      variant={res.faceStatus === 'VERIFIED' ? 'success' : 'warning'}
                      label={res.faceStatus || 'ENROLLED'}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Role:</span>
                    <span className="text-slate-200">{res.role}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Last Sighted:</span>
                    <span className="text-slate-300">{res.lastDetected || 'Never'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total Passages:</span>
                    <span className="text-blue-400 font-bold">{res.detectionCount}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Unrecognized Subjects Section */}
      <div className="space-y-4 pt-6 border-t border-slate-800/80">
        <SectionHeader
          title="Unrecognized Subjects (Recently Detected)"
          subtitle="Unregistered individuals detected in monitored zones. Review snapshots and whitelist trusted visitors."
          icon={<UserX className="w-5 h-5 text-rose-400" />}
        />

        {unknownPersons.length === 0 ? (
          <EmptyState
            title="No Unrecognized Persons Detected"
            description="No unregistered subjects currently logged in the active detection zones."
            icon={<UserX className="w-8 h-8 text-slate-600" />}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {unknownPersons.map((unk) => (
              <Card
                key={unk.id}
                className="space-y-4 border-rose-500/30 hover:border-rose-500/50 transition"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={unk.snapshotUrl}
                    alt={unk.trackId}
                    className="w-14 h-14 rounded-xl border border-rose-500/50 object-cover bg-slate-800"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white">Track {unk.trackId}</h3>
                      <StatusBadge variant="danger" label="UNKNOWN" />
                    </div>
                    <p className="text-[11px] font-mono text-rose-400">
                      Threat: {unk.threatStatus}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-400 font-mono pt-2 border-t border-slate-800/80">
                  <div className="flex justify-between">
                    <span>Camera:</span>
                    <span className="text-slate-200">{unk.camera}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dwell Duration:</span>
                    <span className="text-amber-400 font-bold">{unk.dwellSeconds} Seconds</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Confidence:</span>
                    <span className="text-slate-200">{Math.round(unk.confidence * 100)}%</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => {
                      addResident({
                        name: `Whitelisted Subject ${unk.trackId}`,
                        role: 'Family Member',
                        avatarUrl: unk.snapshotUrl,
                      });
                    }}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" /> Add to Whitelist
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Resident Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Enroll New Resident Whitelist"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Full Name</label>
            <input
              type="text"
              placeholder="e.g. Sarah Jenkins"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-[#080d1a] border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-white focus:border-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Role / Access Level</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as any)}
              className="w-full bg-[#080d1a] border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-blue-500 outline-none"
            >
              <option value="Primary Resident">Primary Resident</option>
              <option value="Family Member">Family Member</option>
              <option value="Frequent Visitor">Frequent Visitor</option>
            </select>
          </div>

          {/* Photo File Upload Field */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">
              Face Reference Photo (For ArcFace Embedding)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
                id="face-photo-input"
              />
              <label
                htmlFor="face-photo-input"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs cursor-pointer border border-slate-700 flex items-center gap-2 transition"
              >
                <Upload className="w-4 h-4 text-blue-400" /> Choose Photo
              </label>
              {faceBase64 && (
                <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Photo loaded &amp; ready
                </span>
              )}
            </div>
          </div>

          <div className="p-3 bg-blue-950/30 border border-blue-500/20 rounded-xl text-xs text-slate-300">
            <p className="font-semibold text-blue-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400" /> InsightFace Biometrics:
            </p>
            <p className="text-slate-400 mt-0.5 leading-relaxed">
              Upon submission, the backend InsightFace ArcFace engine extracts a 512-D normalized L2 feature vector. This vector is cached in memory for zero-latency resident matching during live video processing.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition shadow-md shadow-blue-600/20"
            >
              Enroll Resident
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Biometric Removal"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 bg-rose-950/40 border border-rose-500/30 rounded-2xl">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300">
              <p className="font-bold text-rose-200">Remove Whitelisted Resident?</p>
              <p className="mt-1 text-slate-400">
                Are you sure you want to remove{' '}
                <strong className="text-white">{residentToDelete?.name}</strong> from the biometric whitelist?
                Their ArcFace facial embedding vector will be permanently deleted from the database.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition shadow-lg shadow-rose-600/20"
            >
              Delete Resident
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
