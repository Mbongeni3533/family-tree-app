import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { familyAPI } from '../api';
import { FamilyMember } from '../types';
import { X, User, Lock, Calendar, Heart } from 'lucide-react';

interface FamilyMemberModalProps {
  open: boolean;
  onClose: () => void;
  member?: FamilyMember;
  onSave: () => void;
}

const relationships = [
  'self', 'parent', 'child', 'spouse', 'sibling', 
  'grandparent', 'grandchild', 'aunt_uncle', 
  'niece_nephew', 'cousin'
];

export const FamilyMemberModal: React.FC<FamilyMemberModalProps> = ({ 
  open, 
  onClose, 
  member,
  onSave 
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    deathDate: '',
    gender: '',
    relationship: 'child',
    notes: '',
    parentId: ''
  });
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (member) {
      setFormData({
        firstName: member.firstName,
        lastName: member.lastName,
        birthDate: member.birthDate ? new Date(member.birthDate).toISOString().split('T')[0] : '',
        deathDate: member.deathDate ? new Date(member.deathDate).toISOString().split('T')[0] : '',
        gender: member.gender,
        relationship: member.relationship,
        notes: member.notes || '',
        parentId: member.parentId || ''
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        birthDate: '',
        deathDate: '',
        gender: '',
        relationship: member?.relationship === 'self' ? 'self' : 'child',
        notes: '',
        parentId: ''
      });
    }
  }, [member, open]);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const res = await familyAPI.getAll();
        setMembers(res.data.members);
      } catch (err) {
        console.error('Failed to load members:', err);
      }
    };
    if (open) {
      loadMembers();
    }
  }, [open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (member) {
        await familyAPI.updateMember(member.id, {
          ...formData,
          birthDate: formData.birthDate || null,
          deathDate: formData.deathDate || null,
          parentId: formData.parentId || null
        });
      } else {
        await familyAPI.createMember(formData);
      }
      onSave();
    } catch (err: any) {
      console.error('Error saving member:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition appear show={open} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex justify-between items-center mb-6">
                  <Dialog.Title className="text-xl font-bold text-gray-900">
                    {member ? 'Edit Family Member' : 'Add Family Member'}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                          <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="First name"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          className="pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Last name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                        <select
                          name="relationship"
                          value={formData.relationship}
                          onChange={handleChange}
                          className="pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          {relationships.map(rel => (
                            <option key={rel} value={rel}>
                              {rel.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Birth Date</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                          <input
                            type="date"
                            name="birthDate"
                            value={formData.birthDate}
                            onChange={handleChange}
                            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Death Date</label>
                        <div className="relative">
                          <Heart className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                          <input
                            type="date"
                            name="deathDate"
                            value={formData.deathDate}
                            onChange={handleChange}
                            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                          className="pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">Select</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      {member && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Parent (optional)</label>
                          <select
                            name="parentId"
                            value={formData.parentId}
                            onChange={handleChange}
                            className="pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="">None (root member)</option>
                            {members.filter(m => m.id !== (member?.id || '')).map(m => (
                              <option key={m.id} value={m.id}>
                                {m.firstName} {m.lastName}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="Any additional notes about this family member..."
                  />
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};