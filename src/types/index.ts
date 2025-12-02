// Input Parameters Types
export interface PVSystemParams {
  enabled: boolean; // Se false, l'impianto FV non viene considerato
  powerKWp: number;
  orientation: number;
  tilt: number;
  cityName: string; // Nome della città (es: "Roma", "Milano")
  latitude: number;
  longitude: number;
  costPerKWp: number;
  omCostPercent: number;
  lifeYears: number;
}

export interface StorageParams {
  enabled: boolean; // Se false, lo storage non viene considerato
  capacityKWh: number;
  maxPowerKW: number;
  roundTripEfficiency: number;
  costPerKWh: number;
  omCostYear: number;
  lifeYears: number;
  maxDoD: number;
}

export interface ChargingStationParams {
  enabled: boolean; // Se false, le colonnine non vengono considerate
  numStations: number;
  powerPerStationKW: number;
  costPerStation: number;
  omCostPerStation: number;
  lifeYears: number;
  chargingTariff: number;
  utilizationRate: number; // Rapporto ore equivalenti / 8760 ore totali (%)
}

export interface EconomicParams {
  avgPurchasePrice: number;
  systemCharges: number;
  gridSellPrice: number;
  businessPlanYears: number;
  discountRate: number;
  taxRate: number;
  inflationRate: number;
  technicalCostsPercent: number;
  insurancePercent: number;
}

export interface SimulationInputs {
  pv: PVSystemParams;
  storage: StorageParams;
  charging: ChargingStationParams;
  economic: EconomicParams;
  consumptionProfile: number[];
  punPrices: number[];
}

// Simulation Results Types
export interface HourlySimulationResult {
  hour: number;
  pvProduction: number;
  demand: number;
  directConsumption: number;
  batteryCharge: number;
  batteryDischarge: number;
  gridInjection: number;
  gridWithdrawal: number;
  batterySOC: number;
  punPrice: number;
}

export interface PVKPIs {
  annualProduction: number;
  specificProduction: number;
  capacityFactor: number;
  selfConsumedEnergy: number;
  selfConsumedPercent: number;
  gridInjectedEnergy: number;
  gridInjectedPercent: number;
}

export interface StorageKPIs {
  annualCycledEnergy: number;
  equivalentCycles: number;
  chargedFromPV: number;
  dischargedToLoads: number;
  efficiencyLosses: number;
  avgSOC: number;
}

export interface ChargingKPIs {
  numCharges: number;
  totalEnergyDelivered: number;
  energyFromPVDirect: number;
  energyFromPVDirectPercent: number;
  energyFromStorage: number;
  energyFromStoragePercent: number;
  energyFromGrid: number;
  energyFromGridPercent: number;
  avgPowerPerCharge: number;
  avgChargeDuration: number;
}

export interface SystemKPIs {
  totalSelfConsumption: number;
  selfSufficiency: number;
  avoidedSystemCharges: number;
  avoidedCO2Emissions: number;
}

export interface TechnicalKPIs {
  pv: PVKPIs;
  storage: StorageKPIs;
  charging: ChargingKPIs;
  system: SystemKPIs;
}

// Economic Results Types
export interface AnnualCashFlow {
  year: number;
  // Revenues
  chargingRevenue: number;
  gridSalesRevenue: number;
  totalRevenue: number;
  // Operating Costs
  gridPurchaseCost: number;
  pvOMCost: number;
  storageOMCost: number;
  chargingOMCost: number;
  insuranceCost: number;
  totalOpex: number;
  // Financial
  ebitda: number;
  depreciation: number;
  ebit: number;
  taxes: number;
  netIncome: number;
  capexReplacement: number;
  cashFlow: number;
  cumulativeCashFlow: number;
  discountedCashFlow: number;
}

export interface FinancialKPIs {
  initialCapex: number;
  pvCapex: number;
  storageCapex: number;
  chargingCapex: number;
  technicalCosts: number;
  irr: number;
  npv: number;
  paybackPeriod: number;
  discountedPaybackPeriod: number;
  roi: number;
  lcoe: number;
}

export interface SimulationResults {
  hourlyResults: HourlySimulationResult[];
  technicalKPIs: TechnicalKPIs;
  financialKPIs: FinancialKPIs;
  businessPlan: AnnualCashFlow[];
}

// Monthly aggregated data for charts
export interface MonthlyData {
  month: string;
  pvProduction: number;
  demand: number;
  selfConsumption: number;
  gridInjection: number;
  gridWithdrawal: number;
}

// PVGIS API Response Types
export interface PVGISResponse {
  outputs: {
    hourly: Array<{
      time: string;
      P: number;
      G_i: number;
      H_sun: number;
      T2m: number;
      WS10m: number;
      Int: number;
    }>;
  };
  inputs: {
    location: {
      latitude: number;
      longitude: number;
      elevation: number;
    };
    meteo_data: {
      radiation_db: string;
      meteo_db: string;
      year_min: number;
      year_max: number;
      use_horizon: boolean;
      horizon_db: string;
    };
    mounting_system: {
      fixed: {
        slope: { value: number };
        azimuth: { value: number };
      };
    };
    pv_module: {
      technology: string;
      peak_power: number;
      system_loss: number;
    };
  };
}
