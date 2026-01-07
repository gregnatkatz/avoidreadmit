import { useQuery } from '@tanstack/react-query'
import { Search, Filter } from 'lucide-react'
import { useState } from 'react'
import { patientsApi, Patient } from '../api/client'

export default function Worklist() {
  const [search, setSearch] = useState('')
  
  const { data: patients, isLoading } = useQuery({
    queryKey: ['worklist'],
    queryFn: patientsApi.getWorklist
  })

  const filteredPatients = patients?.filter((p: Patient) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.mrn.toLowerCase().includes(search.toLowerCase()) ||
    p.principal_diagnosis?.toLowerCase().includes(search.toLowerCase())
  ) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Patient Worklist</h2>
          <p className="text-gray-400 text-sm">{filteredPatients.length} patients pending discharge decision</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 w-64"
            />
          </div>
          <button className="btn-secondary flex items-center gap-2">
            <Filter size={16} />
            Filter
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading patients...</div>
        ) : (
          <table className="vision-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>MRN</th>
                <th>Age/Gender</th>
                <th>Diagnosis</th>
                <th>Unit</th>
                <th>LOS</th>
                <th>Insurance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.slice(0, 50).map((patient: Patient) => (
                <tr key={patient.mrn} className="cursor-pointer">
                  <td>
                    <span className="font-medium">{patient.name}</span>
                  </td>
                  <td>
                    <span className="text-gray-400 font-mono text-sm">{patient.mrn}</span>
                  </td>
                  <td>
                    {patient.age}y / {patient.gender?.charAt(0)}
                  </td>
                  <td>
                    <div className="max-w-xs truncate" title={patient.principal_diagnosis}>
                      {patient.principal_diagnosis || 'N/A'}
                    </div>
                  </td>
                  <td>{patient.unit || 'N/A'}</td>
                  <td>{patient.los_days || 0} days</td>
                  <td>
                    <span className="px-2 py-1 rounded-lg bg-white/5 text-xs">
                      {patient.insurance_type || 'Unknown'}
                    </span>
                  </td>
                  <td>
                    <span className={`px-2 py-1 rounded-lg text-xs ${
                      patient.discharge_disposition 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {patient.discharge_disposition || 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
