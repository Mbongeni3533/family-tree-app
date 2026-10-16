import React, { useState, useEffect, useRef } from 'react';
import { familyAPI } from '../api';
import { FamilyTree } from '../types';
import { Plus, ArrowLeft, RefreshCw, Download, FileDown } from 'lucide-react';
import { Network } from 'vis-network/standalone';
import 'vis-network/styles/vis-network.css';
import { FamilyMemberModal } from '../components/FamilyMemberModal';

export const FamilyTreePage: React.FC = () => {
  const [tree, setTree] = useState<FamilyTree[]>([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyTree | null>(null);
  const [exporting, setExporting] = useState(false);
  const networkRef = useRef<HTMLDivElement>(null);
  const networkInstanceRef = useRef<Network | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [treeRes, membersRes] = await Promise.all([
        familyAPI.getTree(),
        familyAPI.getAll()
      ]);
      setTree(treeRes.data.tree);
      setMembers(membersRes.data.members);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading && networkRef.current) {
      renderTree();
    }
  }, [tree, loading]);

  const renderTree = () => {
    if (!networkRef.current || tree.length === 0) return;

    const nodes: any[] = [];
    const edges: any[] = [];
    let nodeId = 0;

    const traverseTree = (member: FamilyTree, parentId?: string) => {
      const nodeIdStr = `node-${++nodeId}`;
      
      // Format date
      const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return 'Unknown';
        return new Date(dateStr).toLocaleDateString('en-ZA', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      };

      // Create node label
      const label = `${member.firstName} ${member.lastName}\n(${getRelationshipDisplay(member.relationship)})\nBirth: ${formatDate(member.birthDate)}\n${member.deathDate ? `Death: ${formatDate(member.deathDate)}` : ''}`;

      nodes.push({
        id: nodeIdStr,
        label,
        title: member.firstName,
        shape: 'box',
        color: {
          background: member.gender === 'male' ? '#3b82f6' : member.gender === 'female' ? '#ec4899' : '#10b981',
          border: '#2563eb',
          highlight: {
            background: '#60a5fa',
            border: '#3b82f6'
          }
        },
        font: { color: '#ffffff', size: 14 },
        mass: 1
      });

      if (parentId) {
        edges.push({
          from: parentId,
          to: nodeIdStr,
          arrows: { to: { enabled: true, type: 'arrow' } }
        });
      }

      // Traverse children
      if (member.children && member.children.length > 0) {
        member.children.forEach(child => {
          traverseTree(child, nodeIdStr);
        });
      }
    };

    tree.forEach(member => {
      traverseTree(member);
    });

    const data = { nodes, edges };
    const options = {
      layout: {
        hierarchical: {
          enabled: true,
          direction: 'UD',
          sortMethod: 'directed',
          nodeSpacing: 200,
          levelSeparation: 300
        }
      },
      physics: {
        hierarchicalRepulsion: {
          nodeDistance: 200
        }
      },
      interaction: {
        dragNodes: true,
        dragView: true,
        zoomView: true
      }
    };

    if (networkInstanceRef.current) {
      networkInstanceRef.current.setData(data);
    } else if (networkRef.current) {
      networkInstanceRef.current = new Network(networkRef.current, data, options);
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

  const handleAddMember = () => {
    setEditingMember(null);
    setModalOpen(true);
  };

  const handleEditMember = (member: FamilyTree) => {
    setEditingMember(member);
    setModalOpen(true);
  };

  const handleSave = async () => {
    await fetchData();
    await handleModalClose();
  };

  const handleDownload = () => {
    if (networkInstanceRef.current) {
      const container = networkRef.current;
      const link = document.createElement('a');
      link.download = 'family-tree.svg';
      link.href = container?.querySelector('canvas')?.toDataURL() || '';
      link.click();
    }
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

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingMember(null);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Family Tree Visualization</h1>
          <p className="text-gray-600 mt-1">Interactive view of your genealogy</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fetchData()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleAddMember}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Add Member
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
          <p className="mt-4 text-gray-600">Loading family tree...</p>
        </div>
      ) : tree.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">No family tree data yet</h3>
          <p className="mt-2 text-gray-600">Add family members to see the tree visualization.</p>
          <button
            onClick={handleAddMember}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Add First Family Member
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div
            ref={networkRef}
            className="w-full h-[600px] border border-gray-200 rounded-lg"
            style={{ minHeight: '500px' }}
          />
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