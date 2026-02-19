'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Build {
  id: number;
  filename: string;
  filesize: number;
  package_name: string | null;
  version: string | null;
  version_code: number | null;
  status: string;
  uploaded_at: string;
  file_path: string;
}

export default function BuildsPage() {
  const router = useRouter();
  const [builds, setBuilds] = useState<Build[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [testResults, setTestResults] = useState<Record<number, any>>({});
  const [testing, setTesting] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchBuilds();
  }, []);

  const fetchBuilds = async () => {
    try {
      const res = await fetch('/api/builds');
      if (res.ok) {
        const data = await res.json();
        setBuilds(data);
      }
    } catch (error) {
      console.error('Failed to fetch builds:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('apk', selectedFile);

      const res = await fetch('/api/builds/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const newBuild = await res.json();
        setBuilds([newBuild, ...builds]);
        setSelectedFile(null);
        // Reset file input
        const fileInput = document.getElementById('apk-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        const error = await res.json();
        alert(error.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this build?')) return;

    try {
      const res = await fetch(`/api/builds/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setBuilds(builds.filter(b => b.id !== id));
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleTest = async (build: Build, action: 'install' | 'launch' | 'uninstall' | 'test') => {
    setTesting(prev => ({ ...prev, [build.id]: true }));
    
    try {
      const res = await fetch(`/api/builds/${build.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const result = await res.json();
      setTestResults(prev => ({ ...prev, [build.id]: result }));

      if (res.ok) {
        // Refresh builds to get updated status
        fetchBuilds();
      } else {
        alert(result.error || 'Test failed');
      }
    } catch (error) {
      console.error('Test error:', error);
    } finally {
      setTesting(prev => ({ ...prev, [build.id]: false }));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      uploaded: 'bg-gray-100 text-gray-800',
      installing: 'bg-yellow-100 text-yellow-800',
      installed: 'bg-green-100 text-green-800',
      testing: 'bg-blue-100 text-blue-800',
      completed: 'bg-emerald-100 text-emerald-800',
      failed: 'bg-red-100 text-red-800',
      uninstalled: 'bg-purple-100 text-purple-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">APK Builds</h1>
          <p className="text-gray-600">Upload and test Android APK files</p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Upload APK</h2>
        <div className="flex items-center gap-4">
          <input
            id="apk-input"
            type="file"
            accept=".apk"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload APK'}
          </button>
        </div>
        {selectedFile && (
          <p className="mt-2 text-sm text-gray-600">
            Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
          </p>
        )}
      </div>

      {/* Builds List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Your Builds ({builds.length})</h2>
        </div>
        
        {builds.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No builds yet. Upload an APK to get started.
          </div>
        ) : (
          <div className="divide-y">
            {builds.map(build => (
              <div key={build.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{build.filename}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(build.status)}`}>
                        {build.status}
                      </span>
                    </div>
                    
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Package:</span> {build.package_name || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Version:</span> {build.version || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Size:</span> {formatFileSize(build.filesize)}
                      </div>
                      <div>
                        <span className="font-medium">Uploaded:</span> {new Date(build.uploaded_at).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Test Results */}
                    {testResults[build.id] && (
                      <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(testResults[build.id], null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleTest(build, 'install')}
                      disabled={testing[build.id]}
                      className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      Install
                    </button>
                    <button
                      onClick={() => handleTest(build, 'launch')}
                      disabled={testing[build.id]}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Launch
                    </button>
                    <button
                      onClick={() => handleTest(build, 'test')}
                      disabled={testing[build.id]}
                      className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
                    >
                      {testing[build.id] ? 'Testing...' : 'Full Test'}
                    </button>
                    <button
                      onClick={() => handleTest(build, 'uninstall')}
                      disabled={testing[build.id]}
                      className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      Uninstall
                    </button>
                    <button
                      onClick={() => handleDelete(build.id)}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
