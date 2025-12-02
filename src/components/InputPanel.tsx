'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSimulationStore } from '@/store/simulation';
import {
  Sun,
  Battery,
  Plug,
  DollarSign,
  ChevronDown,
  ChevronUp,
  MapPin,
  Upload,
  Search
} from 'lucide-react';
import Papa from 'papaparse';

interface InputFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  tooltip?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChange,
  unit,
  min,
  max,
  step = 1,
  tooltip,
}) => (
  <div className="mb-3">
    <label className="block text-sm font-medium text-gray-700 mb-1" title={tooltip}>
      {label} {unit && <span className="text-gray-500">({unit})</span>}
    </label>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      min={min}
      max={max}
      step={step}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
    />
  </div>
);

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  enabled?: boolean;
  onToggleEnabled?: (enabled: boolean) => void;
}

const Section: React.FC<SectionProps> = ({
  title,
  icon,
  children,
  defaultOpen = true,
  enabled,
  onToggleEnabled
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`border rounded-lg mb-4 overflow-hidden ${enabled === false ? 'border-gray-300 opacity-60' : 'border-gray-200'}`}>
      <div className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 flex items-center gap-2 hover:bg-gray-100 transition-colors -mx-2 px-2 py-1 rounded"
        >
          {icon}
          <span className="font-semibold text-gray-800">{title}</span>
          <div className="ml-auto">
            {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </button>
        {onToggleEnabled !== undefined && (
          <label className="flex items-center gap-2 ml-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onToggleEnabled(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Abilita</span>
          </label>
        )}
      </div>
      {isOpen && enabled !== false && <div className="p-4">{children}</div>}
    </div>
  );
};

interface GeocodingResult {
  displayName: string;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
}

export const InputPanel: React.FC = () => {
  const {
    pv,
    storage,
    charging,
    economic,
    setPV,
    setStorage,
    setCharging,
    setEconomic,
    setConsumptionProfile,
  } = useSimulationStore();

  const [citySearch, setCitySearch] = useState(pv.cityName);
  const [citySuggestions, setCitySuggestions] = useState<GeocodingResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search cities with debounce
  const searchCity = async (query: string) => {
    if (query.length < 2) {
      setCitySuggestions([]);
      return;
    }

    try {
      const response = await fetch(`/api/geocode?city=${encodeURIComponent(query)}`);
      if (response.ok) {
        const results = await response.json();
        setCitySuggestions(results);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  const handleCityChange = (value: string) => {
    setCitySearch(value);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      searchCity(value);
    }, 300);
  };

  const selectCity = (result: GeocodingResult) => {
    setCitySearch(result.name);
    setPV({
      cityName: result.name,
      latitude: result.latitude,
      longitude: result.longitude,
    });
    setShowSuggestions(false);
    setCitySuggestions([]);
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        const profile: number[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        results.data.forEach((row: any, index: number) => {
          if (index === 0) return; // Skip header
          const power = parseFloat(row[1] || row.potenza_richiesta_kW || 0);
          if (!isNaN(power)) {
            profile.push(power);
          }
        });
        if (profile.length === 8760) {
          setConsumptionProfile(profile);
          alert('Profilo caricato con successo!');
        } else {
          alert(`Il file deve contenere 8760 righe (trovate ${profile.length})`);
        }
      },
      header: true,
      skipEmptyLines: true,
    });
  };

  const downloadTemplate = () => {
    const header = 'timestamp,potenza_richiesta_kW\n';
    const rows = Array.from({ length: 8760 }, (_, i) => {
      const date = new Date(2024, 0, 1, i % 24);
      const day = Math.floor(i / 24) + 1;
      return `2024-${String(Math.ceil(day / 30)).padStart(2, '0')}-${String((day % 30) || 30).padStart(2, '0')} ${String(i % 24).padStart(2, '0')}:00,0`;
    }).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'consumption_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full overflow-y-auto p-4 bg-white">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Configurazione Impianto</h2>

      {/* PV System */}
      <Section
        title="Impianto Fotovoltaico"
        icon={<Sun className="text-yellow-500" size={20} />}
        enabled={pv.enabled}
        onToggleEnabled={(enabled) => setPV({ enabled })}
      >
        <InputField
          label="Potenza installata"
          value={pv.powerKWp}
          onChange={(v) => setPV({ powerKWp: v })}
          unit="kWp"
          min={1}
          max={10000}
        />
        <InputField
          label="Orientamento"
          value={pv.orientation}
          onChange={(v) => setPV({ orientation: v })}
          unit="°"
          min={0}
          max={360}
          tooltip="0° = Nord, 180° = Sud"
        />
        <InputField
          label="Inclinazione"
          value={pv.tilt}
          onChange={(v) => setPV({ tilt: v })}
          unit="°"
          min={0}
          max={90}
        />
        <div className="mb-3 relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <MapPin className="inline mr-1" size={14} />
            Località
          </label>
          <div className="relative">
            <input
              type="text"
              value={citySearch}
              onChange={(e) => handleCityChange(e.target.value)}
              onFocus={() => citySearch.length >= 2 && citySuggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Es: Roma, Milano, Napoli..."
            />
            <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
          </div>
          {showSuggestions && citySuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {citySuggestions.map((result, index) => (
                <button
                  key={index}
                  onClick={() => selectCity(result)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium">{result.name}</div>
                  <div className="text-xs text-gray-500">{result.displayName}</div>
                </button>
              ))}
            </div>
          )}
          <div className="text-xs text-gray-500 mt-1">
            Coordinate: {pv.latitude.toFixed(4)}, {pv.longitude.toFixed(4)}
          </div>
        </div>
        <InputField
          label="Costo unitario"
          value={pv.costPerKWp}
          onChange={(v) => setPV({ costPerKWp: v })}
          unit="€/kWp"
          min={0}
        />
        <InputField
          label="O&M annui"
          value={pv.omCostPercent}
          onChange={(v) => setPV({ omCostPercent: v })}
          unit="% inv."
          min={0}
          max={10}
          step={0.1}
        />
        <InputField
          label="Vita utile"
          value={pv.lifeYears}
          onChange={(v) => setPV({ lifeYears: v })}
          unit="anni"
          min={1}
          max={40}
        />
      </Section>

      {/* Storage */}
      <Section
        title="Sistema di Storage"
        icon={<Battery className="text-green-500" size={20} />}
        enabled={storage.enabled}
        onToggleEnabled={(enabled) => setStorage({ enabled })}
      >
        <InputField
          label="Capacità batteria"
          value={storage.capacityKWh}
          onChange={(v) => setStorage({ capacityKWh: v })}
          unit="kWh"
          min={0}
        />
        <InputField
          label="Potenza max carica/scarica"
          value={storage.maxPowerKW}
          onChange={(v) => setStorage({ maxPowerKW: v })}
          unit="kW"
          min={0}
        />
        <InputField
          label="Efficienza round-trip"
          value={storage.roundTripEfficiency}
          onChange={(v) => setStorage({ roundTripEfficiency: v })}
          unit="%"
          min={50}
          max={100}
        />
        <InputField
          label="Costo unitario"
          value={storage.costPerKWh}
          onChange={(v) => setStorage({ costPerKWh: v })}
          unit="€/kWh"
          min={0}
        />
        <InputField
          label="O&M annui"
          value={storage.omCostYear}
          onChange={(v) => setStorage({ omCostYear: v })}
          unit="€/anno"
          min={0}
        />
        <InputField
          label="Vita utile"
          value={storage.lifeYears}
          onChange={(v) => setStorage({ lifeYears: v })}
          unit="anni"
          min={1}
          max={25}
        />
        <InputField
          label="DoD massima"
          value={storage.maxDoD}
          onChange={(v) => setStorage({ maxDoD: v })}
          unit="%"
          min={50}
          max={100}
        />
      </Section>

      {/* Charging Station */}
      <Section
        title="Colonnina di Ricarica"
        icon={<Plug className="text-blue-500" size={20} />}
        enabled={charging.enabled}
        onToggleEnabled={(enabled) => setCharging({ enabled })}
      >
        <InputField
          label="Numero colonnine"
          value={charging.numStations}
          onChange={(v) => setCharging({ numStations: v })}
          min={1}
          max={100}
        />
        <InputField
          label="Potenza per colonnina"
          value={charging.powerPerStationKW}
          onChange={(v) => setCharging({ powerPerStationKW: v })}
          unit="kW"
          min={1}
        />
        <InputField
          label="Costo per colonnina"
          value={charging.costPerStation}
          onChange={(v) => setCharging({ costPerStation: v })}
          unit="€"
          min={0}
        />
        <InputField
          label="O&M per colonnina"
          value={charging.omCostPerStation}
          onChange={(v) => setCharging({ omCostPerStation: v })}
          unit="€/anno"
          min={0}
        />
        <InputField
          label="Vita utile"
          value={charging.lifeYears}
          onChange={(v) => setCharging({ lifeYears: v })}
          unit="anni"
          min={1}
          max={20}
        />
        <InputField
          label="Tariffa ricarica"
          value={charging.chargingTariff}
          onChange={(v) => setCharging({ chargingTariff: v })}
          unit="€/kWh"
          min={0}
          step={0.01}
        />
        <InputField
          label="Tasso di utilizzo"
          value={charging.utilizationRate}
          onChange={(v) => setCharging({ utilizationRate: v })}
          unit="%"
          min={0}
          max={100}
          step={1}
          tooltip="Rapporto tra ore equivalenti alla massima potenza e ore totali annue (8760h)"
        />
      </Section>

      {/* Economic Parameters */}
      <Section title="Parametri Economici" icon={<DollarSign className="text-purple-500" size={20} />} defaultOpen={false}>
        <InputField
          label="Prezzo acquisto energia"
          value={economic.avgPurchasePrice}
          onChange={(v) => setEconomic({ avgPurchasePrice: v })}
          unit="€/kWh"
          min={0}
          step={0.01}
        />
        <InputField
          label="Oneri di sistema"
          value={economic.systemCharges}
          onChange={(v) => setEconomic({ systemCharges: v })}
          unit="€/kWh"
          min={0}
          step={0.01}
        />
        <InputField
          label="Prezzo vendita rete"
          value={economic.gridSellPrice}
          onChange={(v) => setEconomic({ gridSellPrice: v })}
          unit="€/kWh"
          min={0}
          step={0.01}
        />
        <InputField
          label="Durata business plan"
          value={economic.businessPlanYears}
          onChange={(v) => setEconomic({ businessPlanYears: v })}
          unit="anni"
          min={10}
          max={25}
        />
        <InputField
          label="Tasso di sconto"
          value={economic.discountRate}
          onChange={(v) => setEconomic({ discountRate: v })}
          unit="%"
          min={0}
          max={20}
          step={0.5}
        />
        <InputField
          label="Aliquota fiscale"
          value={economic.taxRate}
          onChange={(v) => setEconomic({ taxRate: v })}
          unit="%"
          min={0}
          max={50}
        />
        <InputField
          label="Inflazione"
          value={economic.inflationRate}
          onChange={(v) => setEconomic({ inflationRate: v })}
          unit="%"
          min={0}
          max={10}
          step={0.5}
        />
        <InputField
          label="Spese tecniche"
          value={economic.technicalCostsPercent}
          onChange={(v) => setEconomic({ technicalCostsPercent: v })}
          unit="% CAPEX"
          min={0}
          max={30}
        />
        <InputField
          label="Assicurazione"
          value={economic.insurancePercent}
          onChange={(v) => setEconomic({ insurancePercent: v })}
          unit="% assets"
          min={0}
          max={5}
          step={0.1}
        />
      </Section>

      {/* CSV Upload */}
      <Section title="Profilo Consumo" icon={<Upload className="text-orange-500" size={20} />} defaultOpen={false}>
        <p className="text-sm text-gray-600 mb-3">
          Carica un profilo di consumo orario (8760 righe) o usa il profilo default per stazioni EV.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={downloadTemplate}
            className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Scarica Template CSV
          </button>
          <label className="w-full px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 rounded-md cursor-pointer text-center transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="hidden"
            />
            Carica CSV
          </label>
        </div>
      </Section>
    </div>
  );
};
