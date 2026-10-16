import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { familyAPI } from '../api';
import { FamilyMember, FamilyTree } from '../types';
import { Plus, Users, TreePine, RefreshCw, FileDown } from 'lucide-react';
import { FamilyMemberModal } from '../components/FamilyMemberModal';

export const DashboardPage: React.FC = () => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [tree, setTree] = useState<FamilyTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [membersRes, treeRes] = await Promise.all([
        familyAPI.getAll(),
        familyAPI.getTree()
      ]);
      setMembers(membersRes.data.members);
      setTree(treeRes.data.tree);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddMember = () => {
    setEditingMember(null);
    setModalOpen(true);
  };

  const handleEditMember = (member: FamilyMember) => {
    setEditingMember(member);
    setModalOpen(true);
  };

  const handleDeleteMember = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this family member?')) {
      try {
        await familyAPI.deleteMember(id);
        fetchData();
      } catch (err) {
        console.error('Failed to delete member:', err);
      }
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingMember(null);
  };

  const handleSave = async () => {
    await fetchData();
    await handleModalClose();
  };

  const handleExportGedcom = async () => {
    setExporting(true);
    try {
      const response = await familyAPI.exportGedcom();
      const blob = new Blob([response.data], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'family-tree.ged';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting GEDCOM:', err);
    } finally {
      setExporting(false);
    }
  };

  const getRelationshipDisplay = (relationship: string) => {
    const labels: { [key: string]: string } = {
      'self': 'Me',
      'parent': 'Parent',
      'child': 'Child',
      'spouse': 'Spouse',
      'sibling': 'Sibling',
      'grandparent': 'Grandparent',
      'grandchild': 'Grandchild',
      'aunt_uncle': 'Aunt/Uncle',
      'niece_nephew': 'Niece/Nephew',
      'cousin': 'Cousin'
    };
    return labels[relationship] || relationship;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Family Tree Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your genealogy and family relationships</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/family-tree"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <TreePine className="w-4 h-4" />
            Visual Tree
          </Link>
          <button
            onClick={handleAddMember}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Add Family Member
          </button>
          <button
            onClick={handleExportGedcom}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <FileDown className="w-4 h-4" />
            Export GEDCOM
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading family data...</p>
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Users className="w-12 h-12 text-gray-400 mx-auto" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No family members yet</h3>
          <p className="mt-2 text-gray-600">Add your first family member to get started.</p>
          <button
            onClick={handleAddMember}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Add Family Member
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Relationship
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Birth Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {member.firstName} {member.lastName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getRelationshipDisplay(member.relationship)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.birthDate ? new Date(member.birthDate).toLocaleDateString() : 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.deathDate ? 'Deceased' : 'Alive'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEditMember(member)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteMember(member.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FamilyMemberModal
        open={modalOpen}
        onClose={handleModalClose}
        member={editingMember || undefined}
        onSave={handleSave}
      />
    </div>
  );
};