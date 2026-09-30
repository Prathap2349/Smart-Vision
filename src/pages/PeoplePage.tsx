import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SectionHeader } from '../components/ui/SectionHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Trash2,
  Plus,
  Upload,
  AlertTriangle,
  ShieldCheck,
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
      {/* Household Members Section */}
      <div className="space-y-4">
        <SectionHeader
          title="Household Members"
          subtitle="Registered family members and trusted frequent visitors who bypass loitering alarms"
          icon={<Users className="w-5 h-5" />}
          action={
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500/100 text-white font-semibold text-xs transition shadow-xs flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Household Member
            </button>
          }
        />

        {residents.length === 0 ? (
          <EmptyState
            title="No Household Members Added"
            description="Add your family members or roommates so Smart Vision recognizes them and never sends unnecessary false alarms when they are at home."
            icon={<UserCheck className="w-8 h-8 text-text-muted" />}
            action={
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500/100 text-white font-semibold text-xs rounded-xl transition inline-flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" /> Add First Member
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {residents.map((res) => (
              <Card
                key={res.id}
                className="space-y-4 relative group bg-aurora-surface/90 border-white/10 shadow-xs hover:shadow-md transition"
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
                        className="w-12 h-12 rounded-full border border-white/10 object-cover bg-white/5 shadow-xs"
                      />
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500/100 border-2 border-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-text-primary">{res.name}</h3>
                      <p className="text-xs text-blue-300 font-medium">{res.role}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setResidentToDelete({ id: res.id, name: res.name });
                      setDeleteModalOpen(true);
                    }}
                    title="Remove household member"
                    className="p-1.5 rounded-lg text-text-muted hover:text-rose-300 hover:bg-rose-500/10 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-xs text-text-muted pt-3 border-t border-white/10">
                  <div className="flex justify-between items-center">
                    <span>Status:</span>
                    <StatusBadge
                      variant="success"
                      label="Recognized"
                      size="sm"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Last seen at home:</span>
                    <span className="text-text-primary font-medium">{res.lastDetected || 'Recently'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Visits recorded:</span>
                    <span className="text-text-primary font-bold">{res.detectionCount} times</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Unrecognized People Section */}
      <div className="space-y-4 pt-6 border-t border-white/10">
        <SectionHeader
          title="Unrecognized People (Recent Visitors)"
          subtitle="Visitors or strangers detected around your home who are not currently on your household list"
          icon={<UserX className="w-5 h-5" />}
        />

        {unknownPersons.length === 0 ? (
          <EmptyState
            title="No Unrecognized Persons"
            description="No unfamiliar people have been spotted in your protected areas."
            icon={<UserCheck className="w-8 h-8 text-emerald-300" />}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {unknownPersons.map((unk) => (
              <Card
                key={unk.id}
                className="space-y-4 bg-aurora-surface/90 border-white/10 shadow-xs hover:shadow-md transition"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={unk.snapshotUrl}
                    alt={unk.trackId}
                    className="w-14 h-14 rounded-2xl border border-white/10 object-cover bg-white/5"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-text-primary">Unrecognized Visitor</h3>
                      <StatusBadge variant="danger" label="Unknown" size="sm" />
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      Seen at {unk.camera}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-text-muted pt-2 border-t border-white/10">
                  <div className="flex justify-between">
                    <span>Stay duration:</span>
                    <span className="text-amber-300 font-bold">{unk.dwellSeconds} seconds</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Camera location:</span>
                    <span className="text-text-primary font-medium">{unk.camera}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10">
                  <button
                    onClick={() => {
                      addResident({
                        name: `Trusted Visitor`,
                        role: 'Frequent Visitor',
                        avatarUrl: unk.snapshotUrl,
                      });
                    }}
                    className="w-full py-2 bg-blue-500/10 text-blue-300 hover:bg-blue-500/15 border border-blue-400/20 font-semibold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" /> Add as Household Member
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Household Member Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Household Member"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Full Name</label>
            <input
              type="text"
              placeholder="e.g. Sarah Jenkins"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-aurora-elevated/70 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-text-primary focus:border-blue-500 focus:bg-aurora-surface/90 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Household Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as any)}
              className="w-full bg-aurora-elevated/70 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-text-primary focus:border-blue-500 focus:bg-aurora-surface/90 outline-none"
            >
              <option value="Primary Resident">Primary Resident</option>
              <option value="Family Member">Family Member</option>
              <option value="Frequent Visitor">Frequent Visitor / Guest</option>
            </select>
          </div>

          {/* Photo File Upload Field */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Face Photo for Recognition
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
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-text-secondary font-semibold text-xs cursor-pointer border border-white/10 flex items-center gap-2 transition"
              >
                <Upload className="w-4 h-4 text-blue-300" /> Choose Photo
              </label>
              {faceBase64 && (
                <span className="text-xs text-emerald-300 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-300" /> Photo selected
                </span>
              )}
            </div>
          </div>

          <div className="p-3.5 bg-blue-500/10 border border-blue-400/20/80 rounded-xl text-xs text-text-secondary">
            <p className="font-semibold text-blue-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-300" /> How recognition works:
            </p>
            <p className="text-text-secondary mt-1 leading-relaxed">
              When this person appears on your security cameras, Smart Vision recognizes them immediately and suppresses false alarms so your notifications stay quiet and relevant.
            </p>
          </div>

          <div className="pt-3 border-t border-white/10 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500/100 transition shadow-xs"
            >
              Save Member
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Remove Member"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-400/20 rounded-2xl">
            <AlertTriangle className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
            <div className="text-xs text-text-secondary">
              <p className="font-bold text-rose-900 text-sm">Remove from Household?</p>
              <p className="mt-1 text-text-secondary leading-relaxed">
                Are you sure you want to remove{' '}
                <strong className="text-text-primary">{residentToDelete?.name}</strong>?
                Smart Vision will treat them as an unfamiliar visitor if they stay near your home entrances.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex justify-end gap-3">
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500/100 transition shadow-xs"
            >
              Remove Member
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
