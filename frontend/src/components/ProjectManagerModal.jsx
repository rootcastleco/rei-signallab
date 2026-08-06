import React, { useState, useEffect } from 'react';
import { Folder, Save, Trash2, Download, Upload, Play, Clock, Layers, X, FileText, CheckCircle2 } from 'lucide-react';
import {
  fetchUserProjects,
  saveUserProject,
  deleteUserProject
} from '../firebaseAuth';

export default function ProjectManagerModal({ user, currentGraphState, onLoadProject, onClose }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState(null);

  useEffect(() => {
    loadProjects();
  }, [user]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const list = await fetchUserProjects(user);
      setProjects(list);
    } catch (e) {
      console.warn('Failed to load user projects:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCurrentProject = async () => {
    if (!newProjectTitle.trim()) {
      alert('Please enter a project title.');
      return;
    }

    const payload = {
      title: newProjectTitle.trim(),
      formatVersion: '2.1',
      graph: currentGraphState || { nodes: [], connections: [] },
      nodeCount: currentGraphState?.nodes?.length || 0,
      connectionCount: currentGraphState?.connections?.length || 0
    };

    try {
      const saved = await saveUserProject(user, payload);
      setSaveStatus(`Project "${saved.title}" saved successfully!`);
      setNewProjectTitle('');
      await loadProjects();
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (e) {
      alert('Failed to save project: ' + e.message);
    }
  };

  const handleDelete = async (projectId, projectTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${projectTitle}"?`)) return;
    try {
      await deleteUserProject(user, projectId);
      await loadProjects();
    } catch (e) {
      alert('Failed to delete project: ' + e.message);
    }
  };

  const handleExportJSON = (proj) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(proj, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${proj.title.replace(/\s+/g, '_')}_v2.1.rei-signal.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.graph) {
          const saved = await saveUserProject(user, {
            title: parsed.title || file.name.replace('.json', ''),
            graph: parsed.graph
          });
          await loadProjects();
          alert(`Imported project "${saved.title}" successfully!`);
        } else {
          alert('Invalid .rei-signal JSON file structure.');
        }
      } catch (err) {
        alert('JSON parse error: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 select-none">
      <div className="win98-outset w-full max-w-3xl bg-[#C0C0C0] p-3 flex flex-col gap-3 max-h-[85vh] shadow-2xl">
        {/* Titlebar */}
        <div className="win98-titlebar flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Folder size={14} className="text-[#FFFF00]" />
            <span className="font-bold text-xs">Project Manager & Cloud Persistence (.rei-signal 2.1)</span>
          </div>
          <button onClick={onClose} className="win98-btn p-0.5 text-xs font-bold text-[#FF0000]">
            <X size={14} />
          </button>
        </div>

        {/* Save Current Project Section */}
        <div className="win98-outset p-2.5 bg-[#E0E0E0] flex flex-col gap-2">
          <div className="font-bold text-xs text-[#000080] flex items-center gap-1">
            <Save size={14} /> Save Active Canvas State ({currentGraphState?.nodes?.length || 0} Nodes Connected)
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Project Title (e.g. Bearing Fault Diagnostic Pipeline)"
              value={newProjectTitle}
              onChange={e => setNewProjectTitle(e.target.value)}
              className="flex-1 text-xs font-mono p-1 border border-[#808080] bg-white"
            />
            <button
              onClick={handleSaveCurrentProject}
              className="win98-btn text-xs font-bold bg-[#00AA00] text-white px-3 py-1 flex items-center gap-1"
            >
              <Save size={12} /> Save to Cloud / Local
            </button>
          </div>
          {saveStatus && (
            <div className="text-xs text-[#008800] font-bold flex items-center gap-1">
              <CheckCircle2 size={12} /> {saveStatus}
            </div>
          )}
        </div>

        {/* Saved Projects List Toolbar */}
        <div className="flex items-center justify-between gap-2 bg-[#DFDFDF] p-2 border border-[#808080]">
          <span className="font-bold text-xs text-[#000080]">
            Saved Projects List ({projects.length} files found for {user ? user.email || 'Guest' : 'Guest'}):
          </span>

          <label className="win98-btn text-xs font-bold bg-[#FFFFFF] cursor-pointer flex items-center gap-1">
            <Upload size={12} className="text-[#0000FF]" /> Import .json File
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>
        </div>

        {/* Projects List Container */}
        <div className="win98-inset bg-[#FFFFFF] p-2.5 overflow-y-auto max-h-[50vh] flex flex-col gap-2">
          {loading ? (
            <div className="text-center py-6 text-xs font-mono text-[#808080]">
              Loading user projects...
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-6 text-xs font-mono text-[#808080]">
              No saved projects found. Create or save your graph pipeline above.
            </div>
          ) : (
            projects.map(proj => (
              <div key={proj.id} className="win98-outset p-2 bg-[#F8F8F8] border border-[#808080] flex items-center justify-between gap-2 hover:bg-[#FFFFEE]">
                <div>
                  <div className="font-bold text-xs text-[#000080] flex items-center gap-1.5">
                    <FileText size={14} /> {proj.title}
                  </div>
                  <div className="text-[10px] text-[#555555] font-mono flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Layers size={10} /> {proj.nodeCount || proj.graph?.nodes?.length || 0} Nodes
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} /> {proj.updatedAt ? new Date(proj.updatedAt).toLocaleString() : 'Recent'}
                    </span>
                    <span className="text-[#00AA00]">
                      {proj.userId === 'guest' ? '[Local Storage]' : '[Firestore Cloud]'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => { onLoadProject(proj); onClose(); }}
                    className="win98-btn text-xs font-bold bg-[#000080] text-white px-2.5 py-1 flex items-center gap-1"
                  >
                    <Play size={10} /> Open in Canvas
                  </button>
                  <button
                    onClick={() => handleExportJSON(proj)}
                    className="win98-btn text-xs font-bold bg-[#FFFFFF] text-[#333333] px-2 py-1 flex items-center gap-1"
                    title="Export as .rei-signal JSON file"
                  >
                    <Download size={10} />
                  </button>
                  <button
                    onClick={() => handleDelete(proj.id, proj.title)}
                    className="win98-btn text-xs font-bold bg-[#FF5555] text-white px-2 py-1"
                    title="Delete project"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end border-t border-[#808080] pt-2">
          <button onClick={onClose} className="win98-btn text-xs px-4 font-bold">
            Close Manager
          </button>
        </div>
      </div>
    </div>
  );
}
