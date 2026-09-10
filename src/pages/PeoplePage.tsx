import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { UserCheck, UserX, UserPlus, Trash2, Plus, Upload, AlertTriangle, ShieldCheck } from 'lucide-react';

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" /> Whitelisted Residents &amp; Family
            </h2>
            <p className="text-xs text-slate-400">
              Prototype 512-d feature vector biometrics. Recognized residents bypass loitering alerts automatically.
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Resident
          </button>
        </div>

        {residents.length === 0 ? (
          <Card className="p-8 text-center border-dashed border-slate-800 bg-slate-900/30 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
              <UserCheck className="w-6 h-6 text-slate-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">No Whitelisted Residents Enrolled</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Add residents or upload face photos to generate 512-d prototype biometric embeddings for silent alert suppression.
              </p>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Enroll First Resident
            </button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {residents.map(res => (
              <Card key={res.id} className="space-y-4 border-slate-800/80 hover:border-slate-700 relative group bg-slate-900/90">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={res.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80'}
                      alt={res.name}
                      className="w-12 h-12 rounded-full border-2 border-emerald-500/40 object-cover bg-slate-800"
                    />
                    <div>
                      <h3 className="font-bold text-sm text-white">{res.name}</h3>
                      <p className="text-[11px] font-mono text-indigo-400">{res.residentId}</p>
                    </div>
                  </div>

                  {/* Delete Button (Issue 1 Fix) */}
                  <button
                    onClick={() => {
                      setResidentToDelete({ id: res.id, name: res.name });
                      setDeleteModalOpen(true);
                    }}
                    title="Remove resident from biometric whitelist"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition border border-transparent hover:border-rose-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-xs text-slate-400 font-mono pt-3 border-t border-slate-800/80">
                  <div className="flex justify-between items-center">
                    <span>Biometric Status:</span>
                    <Badge variant={res.faceStatus === 'VERIFIED' ? 'emerald' : 'amber'}>
                      {res.faceStatus || 'PENDING'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Role:</span>
                    <span className="text-slate-200">{res.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Detected:</span>
                    <span className="text-slate-300">{res.lastDetected || 'Never'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Passages:</span>
                    <span className="text-emerald-400 font-bold">{res.detectionCount}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Unknown Subjects Section */}
      <div className="space-y-4 pt-6 border-t border-slate-800/80">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <UserX className="w-5 h-5 text-rose-400" /> Unrecognized Subjects (Recently Detected)
          </h2>
          <p className="text-xs text-slate-400">
            Unregistered faces detected in protected zones. Review or whitelist as resident.
          </p>
        </div>

        {unknownPersons.length === 0 ? (
          <Card className="p-6 text-center border-dashed border-slate-800 bg-slate-900/30">
            <p className="text-xs text-slate-400">No unrecognized persons currently logged in protected zones.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {unknownPersons.map(unk => (
              <Card key={unk.id} glow="rose" className="space-y-4 border-rose-500/30 bg-slate-900/90">
                <div className="flex items-center gap-3">
                  <img
                    src={unk.snapshotUrl}
                    alt={unk.trackId}
                    className="w-14 h-14 rounded-xl border-2 border-rose-500/50 object-cover bg-slate-800"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white">Track {unk.trackId}</h3>
                      <Badge variant="rose">UNKNOWN</Badge>
                    </div>
                    <p className="text-[11px] font-mono text-rose-400">Threat Level: {unk.threatStatus}</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-400 font-mono pt-2 border-t border-slate-800">
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

                {/* High Contrast Add to Whitelist Button */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      addResident({
                        name: `Whitelisted Subject ${unk.trackId}`,
                        role: 'Family Member',
                        avatarUrl: unk.snapshotUrl,
                      });
                    }}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5"
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
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Whitelist New Resident">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Full Name</label>
            <input
              type="text"
              placeholder="e.g. Anitha Kumar"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Role / Relationship</label>
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:border-indigo-500 outline-none"
            >
              <option value="Primary Resident">Primary Resident</option>
              <option value="Family Member">Family Member</option>
              <option value="Frequent Visitor">Frequent Visitor</option>
            </select>
          </div>

          {/* Photo Base64 / File Upload Field */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Face Photo (For Biometric Embedding)</label>
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
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer border border-slate-700 flex items-center gap-2"
              >
                <Upload className="w-4 h-4 text-indigo-400" /> Choose Photo
              </label>
              {faceBase64 && <span className="text-xs text-emerald-400 font-mono">✓ Photo selected</span>}
            </div>
          </div>

          <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs text-slate-300">
            <p className="font-semibold text-indigo-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" /> Biometric Embedding:
            </p>
            <p className="text-slate-400 mt-0.5">
              If a photo is provided, InsightFace extracts a 512-d vector for whitelisting. If omitted, resident is enrolled as PENDING_ENROLLMENT.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-indigo-glow"
            >
              Whitelist Resident
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal (Issue 1 Fix) */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Confirm Biometric Removal">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 bg-rose-950/40 border border-rose-500/30 rounded-2xl">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300">
              <p className="font-bold text-rose-200">Remove Whitelisted Resident?</p>
              <p className="mt-1 text-slate-400">
                Are you sure you want to remove <strong className="text-white">{residentToDelete?.name}</strong> from the biometric whitelist?
                Their facial embedding vector will be permanently deleted from the database.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/20"
            >
              Delete Resident
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

