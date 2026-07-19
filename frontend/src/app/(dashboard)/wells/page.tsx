'use client';

import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Well, Field } from '@/types';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, getRiskBadgeVariant, getHealthBadgeVariant } from '@/components/ui/badge';
import { Plus, Droplets } from 'lucide-react';

export default function WellsPage() {
  const [wells, setWells] = useState<Well[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [fieldId, setFieldId] = useState('');
  const [apiNumber, setApiNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchWells = () => {
    api.get<Well[]>('/wells')
      .then((res) => setWells(res.data!))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWells();
    api.get<Field[]>('/fields').then((res) => setFields(res.data!)).catch(() => {});
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/wells', { name, fieldId, apiNumber: apiNumber || undefined });
      setName('');
      setFieldId('');
      setApiNumber('');
      setShowForm(false);
      fetchWells();
    } catch (err: any) {
      setError(err.message || 'Failed to create well');
    } finally {
      setSubmitting(false);
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
          <h1 className="text-2xl font-bold text-white">Wells</h1>
          <p className="text-slate-400 mt-1">Monitor ESP-equipped wells</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" /> Add Well
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New Well</CardTitle>
          </CardHeader>
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Well Name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Well A-01" />
              <div className="w-full">
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Field</label>
                <select
                  value={fieldId}
                  onChange={(e) => setFieldId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a field</option>
                  {fields.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <Input label="API Number" value={apiNumber} onChange={(e) => setApiNumber(e.target.value)} placeholder="Optional" />
            </div>
            <div className="flex gap-3">
              <Button type="submit" isLoading={submitting}>Create Well</Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {wells.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Droplets className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">No wells yet. Create a field first, then add wells.</p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Well Name</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Field</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">ESP</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Health Score</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Risk Level</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {wells.map((well) => {
                  const prediction = well.predictions?.[0];
                  return (
                    <tr key={well.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-3 px-4">
                        <Link href={`/wells/${well.id}`} className="text-blue-400 hover:text-blue-300 font-medium">
                          {well.name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{well.field?.name ?? '-'}</td>
                      <td className="py-3 px-4">
                        {well.esp ? (
                          <span className="text-slate-300">{well.esp.manufacturer} {well.esp.model}</span>
                        ) : (
                          <span className="text-slate-500">Not configured</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {prediction ? (
                          <Badge variant={getHealthBadgeVariant(prediction.healthScore)}>
                            {prediction.healthScore.toFixed(0)}
                          </Badge>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {prediction ? (
                          <Badge variant={getRiskBadgeVariant(prediction.riskLevel)}>
                            {prediction.riskLevel}
                          </Badge>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={well.status === 'ACTIVE' ? 'healthy' : 'default'}>
                          {well.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
