'use client';

import React, { useCallback, useState } from 'react';
import { useSimulationStore } from '@/store/simulation';
import { InputPanel } from '@/components/InputPanel';
import { TechnicalResults } from '@/components/TechnicalResults';
import { EconomicAnalysis } from '@/components/EconomicAnalysis';
import {
  EnergyFlowChart,
  SOCChart,
  MonthlyComparisonChart,
  CashFlowChart,
  EnergySourcePieChart,
} from '@/components/Charts';
import {
  Zap,
  Settings,
  BarChart3,
  FileText,
  Play,
  Download,
  RefreshCw,
  Sun,
  Battery,
  Plug,
} from 'lucide-react';

export default function Home() {
  const {
    pv,
    storage,
    charging,
    economic,
    consumptionProfile,
    punPrices,
    pvProduction,
    results,
    isSimulating,
    activeTab,
    setResults,
    setIsSimulating,
    setActiveTab,
    resetToDefaults,
  } = useSimulationStore();

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const runSimulation = useCallback(async () => {
    setIsSimulating(true);
    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pv,
          storage,
          charging,
          economic,
          consumptionProfile,
          punPrices,
          pvProduction,
        }),
      });

      if (!response.ok) {
        throw new Error('Simulation failed');
      }

      const data = await response.json();
      setResults(data);
      setActiveTab('technical');
    } catch (error) {
      console.error('Simulation error:', error);
      alert('Errore durante la simulazione');
    } finally {
      setIsSimulating(false);
    }
  }, [pv, storage, charging, economic, consumptionProfile, punPrices, pvProduction, setResults, setIsSimulating, setActiveTab]);

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!results) return;

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results,
          inputs: { pv, storage, charging, economic },
          format,
        }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `simulazione_energetica.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Errore durante l\'esportazione');
    }
  };

  const tabs = [
    { id: 'config', label: 'Configurazione', icon: <Settings size={18} /> },
    { id: 'technical', label: 'Risultati Tecnici', icon: <Zap size={18} /> },
    { id: 'economic', label: 'Analisi Economica', icon: <BarChart3 size={18} /> },
    { id: 'report', label: 'Report', icon: <FileText size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Zap className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Energy System Simulator</h1>
            <p className="text-sm text-gray-500">Fotovoltaico + Storage + Ricarica EV</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw size={18} />
            Reset
          </button>
          <button
            onClick={runSimulation}
            disabled={isSimulating}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors font-medium"
          >
            {isSimulating ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Simulazione...
              </>
            ) : (
              <>
                <Play size={18} />
                Simula
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-80' : 'w-0'
          } bg-white border-r border-gray-200 transition-all duration-300 overflow-hidden flex-shrink-0`}
        >
          <InputPanel />
        </aside>

        {/* Toggle Sidebar Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white border border-gray-200 rounded-r-lg p-2 hover:bg-gray-50 z-10"
          style={{ left: sidebarOpen ? '320px' : '0' }}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>

        {/* Main Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="bg-white border-b border-gray-200 px-6">
            <nav className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'config' && (
              <div className="p-6">
                <div className="max-w-4xl mx-auto">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">
                    Configurazione Sistema
                  </h2>

                  {/* Quick Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-yellow-700 mb-2">
                        <Sun size={20} />
                        <span className="font-semibold">Fotovoltaico</span>
                      </div>
                      <div className="text-2xl font-bold text-yellow-800">
                        {pv.powerKWp} kWp
                      </div>
                      <div className="text-sm text-yellow-600">
                        CAPEX: €{(pv.powerKWp * pv.costPerKWp).toLocaleString()}
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-700 mb-2">
                        <Battery size={20} />
                        <span className="font-semibold">Storage</span>
                      </div>
                      <div className="text-2xl font-bold text-green-800">
                        {storage.capacityKWh} kWh
                      </div>
                      <div className="text-sm text-green-600">
                        CAPEX: €{(storage.capacityKWh * storage.costPerKWh).toLocaleString()}
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-blue-700 mb-2">
                        <Plug size={20} />
                        <span className="font-semibold">Colonnine</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-800">
                        {charging.numStations} x {charging.powerPerStationKW} kW
                      </div>
                      <div className="text-sm text-blue-600">
                        CAPEX: €{(charging.numStations * charging.costPerStation).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-100 rounded-lg p-4 text-center">
                    <p className="text-gray-600 mb-4">
                      Configura i parametri nel pannello laterale e premi &quot;Simula&quot; per avviare l&apos;analisi
                    </p>
                    <div className="text-lg font-semibold text-gray-800">
                      Investimento Totale Stimato: €
                      {(
                        pv.powerKWp * pv.costPerKWp +
                        storage.capacityKWh * storage.costPerKWh +
                        charging.numStations * charging.costPerStation
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'technical' && (
              <div className="p-6">
                <TechnicalResults />

                {results && (
                  <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <EnergyFlowChart />
                    <SOCChart />
                    <MonthlyComparisonChart />
                    <EnergySourcePieChart />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'economic' && (
              <div className="p-6">
                <EconomicAnalysis />

                {results && (
                  <div className="mt-6">
                    <CashFlowChart />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'report' && (
              <div className="p-6">
                <div className="max-w-2xl mx-auto">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">
                    Esportazione Report
                  </h2>

                  {results ? (
                    <div className="space-y-4">
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="font-semibold text-gray-800 mb-4">
                          Esporta Risultati
                        </h3>
                        <div className="flex gap-4">
                          <button
                            onClick={() => handleExport('excel')}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <Download size={20} />
                            Scarica Excel
                          </button>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-800 mb-2">
                          Il report includerà:
                        </h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li>• Sintesi configurazione impianto</li>
                          <li>• KPI tecnici (produzione, autoconsumo, efficienza)</li>
                          <li>• KPI finanziari (IRR, VAN, Payback)</li>
                          <li>• Business plan completo (15 anni)</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-100 rounded-lg p-8 text-center">
                      <FileText size={48} className="mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-600">
                        Esegui una simulazione per generare il report
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
