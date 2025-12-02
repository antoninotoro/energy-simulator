'use client';

import React from 'react';
import { useSimulationStore } from '@/store/simulation';
import { formatNumber, formatPercent, formatCurrency } from '@/lib/financial';
import { Sun, Battery, Plug, Zap, Leaf } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, subtitle, icon, color = 'blue' }) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]} transition-all hover:shadow-md`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium opacity-80">{title}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && <div className="text-xs mt-1 opacity-70">{subtitle}</div>}
    </div>
  );
};

interface SectionHeaderProps {
  title: string;
  icon: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, icon }) => (
  <div className="flex items-center gap-2 mb-4 mt-6 first:mt-0">
    {icon}
    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
  </div>
);

export const TechnicalResults: React.FC = () => {
  const { results } = useSimulationStore();

  if (!results) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <Zap size={48} className="mx-auto mb-4 opacity-30" />
          <p>Esegui la simulazione per vedere i risultati tecnici</p>
        </div>
      </div>
    );
  }

  const { pv, storage, charging, system } = results.technicalKPIs;

  return (
    <div className="p-6 overflow-y-auto">
      {/* PV Results */}
      <SectionHeader title="Impianto Fotovoltaico" icon={<Sun className="text-yellow-500" size={24} />} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard
          title="Producibilità annua"
          value={`${formatNumber(pv.annualProduction, 1)} MWh`}
          icon={<Sun size={16} />}
          color="yellow"
        />
        <KPICard
          title="Producibilità specifica"
          value={`${formatNumber(pv.specificProduction, 0)} kWh/kWp`}
          icon={<Sun size={16} />}
          color="yellow"
        />
        <KPICard
          title="Fattore di capacità"
          value={formatPercent(pv.capacityFactor)}
          icon={<Sun size={16} />}
          color="yellow"
        />
        <KPICard
          title="Energia autoconsumata"
          value={`${formatNumber(pv.selfConsumedEnergy, 1)} MWh`}
          subtitle={formatPercent(pv.selfConsumedPercent)}
          icon={<Zap size={16} />}
          color="green"
        />
        <KPICard
          title="Energia immessa in rete"
          value={`${formatNumber(pv.gridInjectedEnergy, 1)} MWh`}
          subtitle={formatPercent(pv.gridInjectedPercent)}
          icon={<Zap size={16} />}
          color="blue"
        />
      </div>

      {/* Storage Results */}
      <SectionHeader title="Sistema di Storage" icon={<Battery className="text-green-500" size={24} />} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard
          title="Energia ciclata annua"
          value={`${formatNumber(storage.annualCycledEnergy, 1)} MWh`}
          icon={<Battery size={16} />}
          color="green"
        />
        <KPICard
          title="Cicli equivalenti/anno"
          value={formatNumber(storage.equivalentCycles, 0)}
          icon={<Battery size={16} />}
          color="green"
        />
        <KPICard
          title="SOC medio"
          value={formatPercent(storage.avgSOC)}
          icon={<Battery size={16} />}
          color="green"
        />
        <KPICard
          title="Caricata da FV"
          value={`${formatNumber(storage.chargedFromPV, 1)} MWh`}
          icon={<Sun size={16} />}
          color="yellow"
        />
        <KPICard
          title="Scaricata verso carichi"
          value={`${formatNumber(storage.dischargedToLoads, 1)} MWh`}
          icon={<Plug size={16} />}
          color="blue"
        />
        <KPICard
          title="Perdite efficienza"
          value={`${formatNumber(storage.efficiencyLosses, 1)} MWh`}
          icon={<Zap size={16} />}
          color="orange"
        />
      </div>

      {/* Charging Results */}
      <SectionHeader title="Colonnina di Ricarica" icon={<Plug className="text-blue-500" size={24} />} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard
          title="Numero ricariche/anno"
          value={formatNumber(charging.numCharges, 0)}
          icon={<Plug size={16} />}
          color="blue"
        />
        <KPICard
          title="Energia totale erogata"
          value={`${formatNumber(charging.totalEnergyDelivered, 1)} MWh`}
          icon={<Zap size={16} />}
          color="blue"
        />
        <KPICard
          title="Energia da FV diretto"
          value={`${formatNumber(charging.energyFromPVDirect, 1)} MWh`}
          subtitle={formatPercent(charging.energyFromPVDirectPercent)}
          icon={<Sun size={16} />}
          color="yellow"
        />
        <KPICard
          title="Energia da storage"
          value={`${formatNumber(charging.energyFromStorage, 1)} MWh`}
          subtitle={formatPercent(charging.energyFromStoragePercent)}
          icon={<Battery size={16} />}
          color="green"
        />
        <KPICard
          title="Energia da rete"
          value={`${formatNumber(charging.energyFromGrid, 1)} MWh`}
          subtitle={formatPercent(charging.energyFromGridPercent)}
          icon={<Zap size={16} />}
          color="orange"
        />
        <KPICard
          title="Potenza media per ricarica"
          value={`${formatNumber(charging.avgPowerPerCharge, 1)} kW`}
          subtitle={`~${formatNumber(charging.avgChargeDuration, 1)}h`}
          icon={<Plug size={16} />}
          color="blue"
        />
      </div>

      {/* System Results */}
      <SectionHeader title="Sistema Integrato" icon={<Zap className="text-purple-500" size={24} />} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Autoconsumo totale"
          value={formatPercent(system.totalSelfConsumption)}
          subtitle="su produzione FV"
          icon={<Sun size={16} />}
          color="yellow"
        />
        <KPICard
          title="Autosufficienza"
          value={formatPercent(system.selfSufficiency)}
          subtitle="su consumi totali"
          icon={<Zap size={16} />}
          color="green"
        />
        <KPICard
          title="Oneri evitati"
          value={formatCurrency(system.avoidedSystemCharges, 0)}
          subtitle="all'anno"
          icon={<Zap size={16} />}
          color="purple"
        />
        <KPICard
          title="CO₂ evitata"
          value={`${formatNumber(system.avoidedCO2Emissions, 1)} ton`}
          subtitle="all'anno"
          icon={<Leaf size={16} />}
          color="green"
        />
      </div>
    </div>
  );
};
