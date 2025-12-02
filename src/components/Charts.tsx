'use client';

import React, { useState } from 'react';
import { useSimulationStore } from '@/store/simulation';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = {
  pvProduction: '#F59E0B',
  demand: '#3B82F6',
  directConsumption: '#10B981',
  batteryCharge: '#22C55E',
  batteryDischarge: '#86EFAC',
  gridInjection: '#9CA3AF',
  gridWithdrawal: '#EF4444',
  soc: '#8B5CF6',
};

export const EnergyFlowChart: React.FC = () => {
  const { results } = useSimulationStore();
  const [selectedDay, setSelectedDay] = useState(180); // Mid-year by default

  if (!results) return null;

  // Get 24 hours for selected day
  const startHour = selectedDay * 24;
  const dayData = results.hourlyResults.slice(startHour, startHour + 24).map((h, i) => ({
    hour: i,
    'Produzione FV': h.pvProduction,
    'Domanda': h.demand,
    'Autoconsumo': h.directConsumption,
    'Carica Batteria': h.batteryCharge,
    'Scarica Batteria': h.batteryDischarge,
    'Immissione Rete': h.gridInjection,
    'Prelievo Rete': h.gridWithdrawal,
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Flussi Energetici Orari</h3>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Giorno:</label>
          <input
            type="range"
            min={0}
            max={364}
            value={selectedDay}
            onChange={(e) => setSelectedDay(parseInt(e.target.value))}
            className="w-32"
          />
          <span className="text-sm font-medium text-gray-700 w-8">{selectedDay + 1}</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={dayData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" label={{ value: 'Ora', position: 'bottom', offset: 0 }} />
          <YAxis label={{ value: 'kW', angle: -90, position: 'insideLeft' }} />
          <Tooltip
            formatter={(value: number) => `${value.toFixed(1)} kW`}
            labelFormatter={(label) => `Ora ${label}:00`}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="Produzione FV"
            stackId="1"
            stroke={COLORS.pvProduction}
            fill={COLORS.pvProduction}
            fillOpacity={0.8}
          />
          <Area
            type="monotone"
            dataKey="Prelievo Rete"
            stackId="2"
            stroke={COLORS.gridWithdrawal}
            fill={COLORS.gridWithdrawal}
            fillOpacity={0.6}
          />
          <Line
            type="monotone"
            dataKey="Domanda"
            stroke={COLORS.demand}
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const SOCChart: React.FC = () => {
  const { results } = useSimulationStore();
  const [selectedDay, setSelectedDay] = useState(180);

  if (!results) return null;

  const startHour = selectedDay * 24;
  const dayData = results.hourlyResults.slice(startHour, startHour + 24).map((h, i) => ({
    hour: i,
    SOC: (h.batterySOC / (results.hourlyResults[0]?.batterySOC * 2 || 100)) * 100,
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Stato di Carica Batteria</h3>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Giorno:</label>
          <input
            type="range"
            min={0}
            max={364}
            value={selectedDay}
            onChange={(e) => setSelectedDay(parseInt(e.target.value))}
            className="w-32"
          />
          <span className="text-sm font-medium text-gray-700 w-8">{selectedDay + 1}</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={dayData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" />
          <YAxis domain={[0, 100]} unit="%" />
          <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
          <Line
            type="monotone"
            dataKey="SOC"
            stroke={COLORS.soc}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export const MonthlyComparisonChart: React.FC = () => {
  const { results } = useSimulationStore();

  if (!results) return null;

  // Aggregate by month
  const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  const monthlyData = monthNames.map((month, i) => {
    const startHour = i * 730;
    const endHour = Math.min((i + 1) * 730, 8760);
    const monthHours = results.hourlyResults.slice(startHour, endHour);

    return {
      month,
      'Produzione FV': monthHours.reduce((sum, h) => sum + h.pvProduction, 0) / 1000,
      'Domanda': monthHours.reduce((sum, h) => sum + h.demand, 0) / 1000,
      'Autoconsumo': monthHours.reduce((sum, h) => sum + h.directConsumption, 0) / 1000,
    };
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Confronto Mensile (MWh)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={monthlyData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(value: number) => `${value.toFixed(1)} MWh`} />
          <Legend />
          <Bar dataKey="Produzione FV" fill={COLORS.pvProduction} />
          <Bar dataKey="Domanda" fill={COLORS.demand} />
          <Bar dataKey="Autoconsumo" fill={COLORS.directConsumption} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const CashFlowChart: React.FC = () => {
  const { results } = useSimulationStore();

  if (!results) return null;

  const data = results.businessPlan.map((year) => ({
    anno: `Anno ${year.year}`,
    'Cash Flow': year.cashFlow / 1000,
    'CF Cumulato': year.cumulativeCashFlow / 1000,
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Cash Flow (k€)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="anno" />
          <YAxis />
          <Tooltip formatter={(value: number) => `${value.toFixed(1)} k€`} />
          <Legend />
          <Bar dataKey="Cash Flow" fill="#3B82F6" />
          <Line
            type="monotone"
            dataKey="CF Cumulato"
            stroke="#10B981"
            strokeWidth={2}
            dot={true}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const EnergySourcePieChart: React.FC = () => {
  const { results } = useSimulationStore();

  if (!results) return null;

  const { charging } = results.technicalKPIs;
  const data = [
    { name: 'FV Diretto', value: charging.energyFromPVDirect, color: COLORS.pvProduction },
    { name: 'Storage', value: charging.energyFromStorage, color: COLORS.batteryCharge },
    { name: 'Rete', value: charging.energyFromGrid, color: COLORS.gridWithdrawal },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Fonti Energia Ricarica</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => `${value.toFixed(1)} MWh`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
