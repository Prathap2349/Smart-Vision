import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { UserCheck, UserX, UserPlus, ShieldCheck, Clock, Camera, Plus } from 'lucide-react';

export const PeoplePage: React.FC = () => {
  const { residents, unknownPersons, addResident } = useSecurity();

  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newRole, setNewRole] = useState<'Primary Resident' | 'Family Member' | 'Frequent Visitor'>('Family Member');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    addResident({
      name: newName,
      residentId: `RES-${Math.floor(1000 + Math.random() * 9000)}`,
      faceStatus: 'VERIFIED',
      lastDetected: 'Just now',
      detectionCount: 1,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80',
      role: newRole,
    });

    setNewName('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Whitelisted Residents Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" /> Whitelisted Residents &amp; Family
            </h2>
            <p className="text-xs text-slate-400">
              InsightFace biometric vector embeddings. Recognized residents bypass loitering alerts automatically.
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-emerald-glow flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Resident
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {residents.map(res => (
            <Card key={res.id} className="space-y-4 border-slate-800 hover:border-emerald-500/40">
              <div className="flex items-center gap-3">
                <img
                  src={res.avatarUrl}
                  alt={res.name}
                  className="w-12 h-12 rounded-full border-2 border-emerald-500/40 object-cover"
                />
                <div>
                  <h3 className="font-bold text-sm text-white">{res.name}</h3>
                  <p className="text-[11px] font-mono text-cyan-400">{res.residentId}</p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-400 font-mono pt-2 border-t border-slate-800">
                <div className="flex justify-between">
                  <span>Biometric Status:</span>
                  <Badge variant="emerald">VERIFIED</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Role:</span>
                  <span className="text-slate-200">{res.role}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Detected:</span>
                  <span className="text-slate-200">{res.lastDetected}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Passages:</span>
                  <span className="text-emerald-400 font-bold">{res.detectionCount}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Unknown Subjects Section */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <UserX className="w-5 h-5 text-rose-400" /> Unrecognized Subjects (Recently Detected)
          </h2>
          <p className="text-xs text-slate-400">
            Unregistered faces detected in protected zones. Review or whitelist as resident.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {unknownPersons.map(unk => (
            <Card key={unk.id} glow="rose" className="space-y-4 border-rose-500/30">
              <div className="flex items-center gap-3">
                <img
                  src={unk.snapshotUrl}
                  alt={unk.trackId}
                  className="w-14 h-14 rounded-xl border-2 border-rose-500/50 object-cover"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white">Track {unk.trackId}</h3>
                    <Badge variant="rose">UNKNOWN</Badge>
                  </div>
                  <p className="text-[11px] font-mono text-rose-400">Threat Level: {unk.threatStatus}</p>
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-400 font-mono pt-2 border-t border-slate-800">
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
                <div className="flex justify-between">
                  <span>First Seen / Last Seen:</span>
                  <span className="text-slate-300">{unk.firstSeen} – {unk.lastSeen}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    addResident({
                      name: `Whitelisted Track ${unk.trackId}`,
                      residentId: `RES-${Math.floor(1000 + Math.random() * 9000)}`,
                      faceStatus: 'VERIFIED',
                      lastDetected: 'Just now',
                      detectionCount: 1,
                      avatarUrl: unk.snapshotUrl,
                      role: 'Family Member',
                    });
                  }}
                  className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Add to Whitelist
                </button>
              </div>
            </Card>
          ))}
        </div>
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
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Role / Relationship</label>
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 outline-none"
            >
              <option value="Primary Resident">Primary Resident</option>
              <option value="Family Member">Family Member</option>
              <option value="Frequent Visitor">Frequent Visitor</option>
            </select>
          </div>

          <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-xs text-slate-300">
            <p className="font-semibold text-cyan-200">Biometric Vector Generation:</p>
            <p className="text-slate-400">
              InsightFace will extract 512-d feature embeddings for silent resident verification.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-emerald-glow"
            >
              Generate Vector &amp; Whitelist
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
