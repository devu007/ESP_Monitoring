'use client';

import { useEffect, useState, FormEvent } from 'react';
import { api } from '@/lib/api';
import { Field } from '@/types';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Landmark, Trash2 } from 'lucide-react';

export default function FieldsPage() {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchFields = () => {
    api.get<Field[]>('/fields')
      .then((res) => setFields(res.data!))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchFields(); }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/fields', { name, location: location || undefined, description: description || undefined });
      setName('');
      setLocation('');
      setDescription('');
      setShowForm(false);
      fetchFields();
    } catch (err: any) {
      setError(err.message || 'Failed to create field');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this field and all its wells?')) return;
    try {
      await api.delete(`/fields/${id}`);
      fetchFields();
    } catch {
      alert('Failed to delete field');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Fields</h1>
          <p className="text-slate-400 mt-1">Manage your oilfield assets</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" /> Add Field
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New Field</CardTitle>
          </CardHeader>
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Field Name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Permian Basin Block A" />
              <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. West Texas" />
            </div>
            <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
            <div className="flex gap-3">
              <Button type="submit" isLoading={submitting}>Create Field</Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {fields.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Landmark className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">No fields yet. Create your first field to get started.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fields.map((field) => (
            <Card key={field.id} className="hover:border-slate-600 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{field.name}</h3>
                  {field.location && <p className="text-sm text-slate-400 mt-1">{field.location}</p>}
                  {field.description && <p className="text-sm text-slate-500 mt-2">{field.description}</p>}
                </div>
                <button onClick={() => handleDelete(field.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-sm text-slate-400">
                  <span className="text-white font-medium">{field._count?.wells ?? 0}</span> wells
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
