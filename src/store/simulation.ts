import { create } from 'zustand';
import {
  PVSystemParams,
  StorageParams,
  ChargingStationParams,
  EconomicParams,
  SimulationResults,
} from '@/types';

interface SimulationState {
  // Input parameters
  pv: PVSystemParams;
  storage: StorageParams;
  charging: ChargingStationParams;
  economic: EconomicParams;

  // Consumption and pricing data
  consumptionProfile: number[];
  punPrices: number[];
  pvProduction: number[];

  // Results
  results: SimulationResults | null;
  isSimulating: boolean;
  error: string | null;

  // Active tab
  activeTab: 'config' | 'technical' | 'economic' | 'report';

  // Actions
  setPV: (params: Partial<PVSystemParams>) => void;
  setStorage: (params: Partial<StorageParams>) => void;
  setCharging: (params: Partial<ChargingStationParams>) => void;
  setEconomic: (params: Partial<EconomicParams>) => void;
  setConsumptionProfile: (profile: number[]) => void;
  setPunPrices: (prices: number[]) => void;
  setPVProduction: (production: number[]) => void;
  setResults: (results: SimulationResults | null) => void;
  setIsSimulating: (isSimulating: boolean) => void;
  setError: (error: string | null) => void;
  setActiveTab: (tab: 'config' | 'technical' | 'economic' | 'report') => void;
  resetToDefaults: () => void;
}

const defaultPV: PVSystemParams = {
  enabled: true,
  powerKWp: 100,
  orientation: 180,
  tilt: 30,
  cityName: 'Roma',
  latitude: 41.9028,
  longitude: 12.4964,
  costPerKWp: 900,
  omCostPercent: 1.5,
  lifeYears: 25,
};

const defaultStorage: StorageParams = {
  enabled: true,
  capacityKWh: 200,
  maxPowerKW: 50,
  roundTripEfficiency: 90,
  costPerKWh: 400,
  omCostYear: 2000,
  lifeYears: 15,
  maxDoD: 90,
};

const defaultCharging: ChargingStationParams = {
  enabled: true,
  numStations: 2,
  powerPerStationKW: 22,
  costPerStation: 8000,
  omCostPerStation: 500,
  lifeYears: 10,
  chargingTariff: 0.45,
  utilizationRate: 10, // 10% di utilizzo (876 ore equivalenti/anno)
};

const defaultEconomic: EconomicParams = {
  avgPurchasePrice: 0.12,
  systemCharges: 0.08,
  gridSellPrice: 0.08,
  businessPlanYears: 15,
  discountRate: 5,
  taxRate: 28,
  inflationRate: 2,
  technicalCostsPercent: 10,
  insurancePercent: 0.5,
};

export const useSimulationStore = create<SimulationState>((set) => ({
  // Default values
  pv: defaultPV,
  storage: defaultStorage,
  charging: defaultCharging,
  economic: defaultEconomic,
  consumptionProfile: [],
  punPrices: [],
  pvProduction: [],
  results: null,
  isSimulating: false,
  error: null,
  activeTab: 'config',

  // Actions
  setPV: (params) =>
    set((state) => ({
      pv: { ...state.pv, ...params },
    })),

  setStorage: (params) =>
    set((state) => ({
      storage: { ...state.storage, ...params },
    })),

  setCharging: (params) =>
    set((state) => ({
      charging: { ...state.charging, ...params },
    })),

  setEconomic: (params) =>
    set((state) => ({
      economic: { ...state.economic, ...params },
    })),

  setConsumptionProfile: (profile) =>
    set({ consumptionProfile: profile }),

  setPunPrices: (prices) =>
    set({ punPrices: prices }),

  setPVProduction: (production) =>
    set({ pvProduction: production }),

  setResults: (results) =>
    set({ results }),

  setIsSimulating: (isSimulating) =>
    set({ isSimulating }),

  setError: (error) =>
    set({ error }),

  setActiveTab: (tab) =>
    set({ activeTab: tab }),

  resetToDefaults: () =>
    set({
      pv: defaultPV,
      storage: defaultStorage,
      charging: defaultCharging,
      economic: defaultEconomic,
      consumptionProfile: [],
      punPrices: [],
      pvProduction: [],
      results: null,
      error: null,
    }),
}));
