import {
  SimulationInputs,
  SimulationResults,
  HourlySimulationResult,
  TechnicalKPIs,
  PVKPIs,
  StorageKPIs,
  ChargingKPIs,
  SystemKPIs,
  AnnualCashFlow,
  FinancialKPIs,
} from '@/types';
import { calculateIRR, calculateNPV } from './financial';

const HOURS_PER_YEAR = 8760;
const CO2_FACTOR = 0.3; // kg CO2 per kWh

export function runSimulation(inputs: SimulationInputs): SimulationResults {
  const hourlyResults = simulateHourly(inputs);
  const technicalKPIs = calculateTechnicalKPIs(hourlyResults, inputs);
  const businessPlan = calculateBusinessPlan(technicalKPIs, inputs);
  const financialKPIs = calculateFinancialKPIs(businessPlan, inputs);

  return {
    hourlyResults,
    technicalKPIs,
    financialKPIs,
    businessPlan,
  };
}

function simulateHourly(inputs: SimulationInputs): HourlySimulationResult[] {
  const results: HourlySimulationResult[] = [];
  const { pv, storage, consumptionProfile, punPrices } = inputs;

  // Initial battery state
  let batterySOC = storage.capacityKWh * 0.5; // Start at 50%
  const minSOC = storage.capacityKWh * (1 - storage.maxDoD);
  const maxSOC = storage.capacityKWh;
  const chargeEfficiency = Math.sqrt(storage.roundTripEfficiency / 100);
  const dischargeEfficiency = Math.sqrt(storage.roundTripEfficiency / 100);

  for (let hour = 0; hour < HOURS_PER_YEAR; hour++) {
    // Get hourly values
    const pvProduction = consumptionProfile.length > 0
      ? (inputs.consumptionProfile[hour] || 0) * pv.powerKWp / 100 // Placeholder - will be replaced by PVGIS data
      : 0;
    const demand = consumptionProfile[hour] || 0;
    const punPrice = punPrices[hour] || inputs.economic.avgPurchasePrice;

    let directConsumption = 0;
    let batteryCharge = 0;
    let batteryDischarge = 0;
    let gridInjection = 0;
    let gridWithdrawal = 0;

    // Priority 1: PV -> Load (direct consumption)
    directConsumption = Math.min(pvProduction, demand);
    let remainingPV = pvProduction - directConsumption;
    let unmetDemand = demand - directConsumption;

    // Priority 2: Excess PV -> Battery
    if (remainingPV > 0 && batterySOC < maxSOC) {
      const maxCharge = Math.min(
        remainingPV,
        storage.maxPowerKW,
        (maxSOC - batterySOC) / chargeEfficiency
      );
      batteryCharge = maxCharge;
      batterySOC += maxCharge * chargeEfficiency;
      remainingPV -= maxCharge;
    }

    // Priority 3: Excess PV -> Grid
    if (remainingPV > 0) {
      gridInjection = remainingPV;
    }

    // Priority 4: Battery -> Load (if PV insufficient)
    if (unmetDemand > 0 && batterySOC > minSOC) {
      const maxDischarge = Math.min(
        unmetDemand / dischargeEfficiency,
        storage.maxPowerKW,
        batterySOC - minSOC
      );
      batteryDischarge = maxDischarge;
      batterySOC -= maxDischarge;
      unmetDemand -= maxDischarge * dischargeEfficiency;
    }

    // Priority 5: Grid -> Load (last resort)
    if (unmetDemand > 0) {
      gridWithdrawal = unmetDemand;
    }

    results.push({
      hour,
      pvProduction,
      demand,
      directConsumption,
      batteryCharge,
      batteryDischarge,
      gridInjection,
      gridWithdrawal,
      batterySOC,
      punPrice,
    });
  }

  return results;
}

function calculateTechnicalKPIs(
  hourlyResults: HourlySimulationResult[],
  inputs: SimulationInputs
): TechnicalKPIs {
  // PV KPIs
  const totalPVProduction = hourlyResults.reduce((sum, h) => sum + h.pvProduction, 0);
  const totalDirectConsumption = hourlyResults.reduce((sum, h) => sum + h.directConsumption, 0);
  const totalGridInjection = hourlyResults.reduce((sum, h) => sum + h.gridInjection, 0);
  const totalBatteryCharge = hourlyResults.reduce((sum, h) => sum + h.batteryCharge, 0);

  const selfConsumedFromPV = totalDirectConsumption + totalBatteryCharge;

  const pvKPIs: PVKPIs = {
    annualProduction: totalPVProduction / 1000, // MWh
    specificProduction: totalPVProduction / inputs.pv.powerKWp,
    capacityFactor: (totalPVProduction / (inputs.pv.powerKWp * HOURS_PER_YEAR)) * 100,
    selfConsumedEnergy: selfConsumedFromPV / 1000,
    selfConsumedPercent: totalPVProduction > 0 ? (selfConsumedFromPV / totalPVProduction) * 100 : 0,
    gridInjectedEnergy: totalGridInjection / 1000,
    gridInjectedPercent: totalPVProduction > 0 ? (totalGridInjection / totalPVProduction) * 100 : 0,
  };

  // Storage KPIs
  const totalBatteryDischarge = hourlyResults.reduce((sum, h) => sum + h.batteryDischarge, 0);
  const avgSOC = hourlyResults.reduce((sum, h) => sum + h.batterySOC, 0) / hourlyResults.length;
  const efficiencyLoss = totalBatteryCharge * (1 - inputs.storage.roundTripEfficiency / 100);

  const storageKPIs: StorageKPIs = {
    annualCycledEnergy: totalBatteryCharge / 1000,
    equivalentCycles: totalBatteryCharge / inputs.storage.capacityKWh,
    chargedFromPV: totalBatteryCharge / 1000,
    dischargedToLoads: totalBatteryDischarge / 1000,
    efficiencyLosses: efficiencyLoss / 1000,
    avgSOC: (avgSOC / inputs.storage.capacityKWh) * 100,
  };

  // Charging KPIs
  const totalDemand = hourlyResults.reduce((sum, h) => sum + h.demand, 0);
  const totalGridWithdrawal = hourlyResults.reduce((sum, h) => sum + h.gridWithdrawal, 0);

  // Estimate number of charges (assuming avg 30 kWh per charge)
  const avgChargeEnergy = 30;
  const numCharges = Math.round(totalDemand / avgChargeEnergy);

  const chargingKPIs: ChargingKPIs = {
    numCharges,
    totalEnergyDelivered: totalDemand / 1000,
    energyFromPVDirect: totalDirectConsumption / 1000,
    energyFromPVDirectPercent: totalDemand > 0 ? (totalDirectConsumption / totalDemand) * 100 : 0,
    energyFromStorage: (totalBatteryDischarge * Math.sqrt(inputs.storage.roundTripEfficiency / 100)) / 1000,
    energyFromStoragePercent: totalDemand > 0
      ? ((totalBatteryDischarge * Math.sqrt(inputs.storage.roundTripEfficiency / 100)) / totalDemand) * 100
      : 0,
    energyFromGrid: totalGridWithdrawal / 1000,
    energyFromGridPercent: totalDemand > 0 ? (totalGridWithdrawal / totalDemand) * 100 : 0,
    avgPowerPerCharge: numCharges > 0 ? totalDemand / numCharges / 1.5 : 0, // Assuming 1.5h avg duration
    avgChargeDuration: 1.5,
  };

  // System KPIs
  const systemKPIs: SystemKPIs = {
    totalSelfConsumption: pvKPIs.selfConsumedPercent,
    selfSufficiency: totalDemand > 0
      ? ((totalDirectConsumption + totalBatteryDischarge * Math.sqrt(inputs.storage.roundTripEfficiency / 100)) / totalDemand) * 100
      : 0,
    avoidedSystemCharges: (totalDirectConsumption + totalBatteryDischarge * Math.sqrt(inputs.storage.roundTripEfficiency / 100)) * inputs.economic.systemCharges,
    avoidedCO2Emissions: totalPVProduction * CO2_FACTOR / 1000, // tons
  };

  return {
    pv: pvKPIs,
    storage: storageKPIs,
    charging: chargingKPIs,
    system: systemKPIs,
  };
}

function calculateBusinessPlan(
  technicalKPIs: TechnicalKPIs,
  inputs: SimulationInputs
): AnnualCashFlow[] {
  const { pv, storage, charging, economic } = inputs;
  const cashFlows: AnnualCashFlow[] = [];

  // Calculate initial CAPEX
  const pvCapex = pv.powerKWp * pv.costPerKWp;
  const storageCapex = storage.capacityKWh * storage.costPerKWh;
  const chargingCapex = charging.numStations * charging.costPerStation;
  const technicalCosts = (pvCapex + storageCapex + chargingCapex) * economic.technicalCostsPercent / 100;
  const totalCapex = pvCapex + storageCapex + chargingCapex + technicalCosts;

  // Annual depreciation
  const pvDepreciation = pvCapex / pv.lifeYears;
  const storageDepreciation = storageCapex / storage.lifeYears;
  const chargingDepreciation = chargingCapex / charging.lifeYears;

  let cumulativeCashFlow = -totalCapex;

  for (let year = 1; year <= economic.businessPlanYears; year++) {
    const inflationFactor = Math.pow(1 + economic.inflationRate / 100, year - 1);

    // Revenues
    const chargingRevenue = technicalKPIs.charging.totalEnergyDelivered * 1000 * charging.chargingTariff * inflationFactor;
    const gridSalesRevenue = technicalKPIs.pv.gridInjectedEnergy * 1000 * economic.gridSellPrice * inflationFactor;
    const totalRevenue = chargingRevenue + gridSalesRevenue;

    // Operating costs
    const gridPurchaseCost = technicalKPIs.charging.energyFromGrid * 1000 *
      (economic.avgPurchasePrice + economic.systemCharges) * inflationFactor;
    const pvOMCost = pvCapex * pv.omCostPercent / 100 * inflationFactor;
    const storageOMCost = storage.omCostYear * inflationFactor;
    const chargingOMCost = charging.numStations * charging.omCostPerStation * inflationFactor;
    const insuranceCost = (pvCapex + storageCapex + chargingCapex) * economic.insurancePercent / 100 * inflationFactor;
    const totalOpex = gridPurchaseCost + pvOMCost + storageOMCost + chargingOMCost + insuranceCost;

    // EBITDA
    const ebitda = totalRevenue - totalOpex;

    // Depreciation (accounting for asset life)
    let depreciation = 0;
    if (year <= pv.lifeYears) depreciation += pvDepreciation;
    if (year <= storage.lifeYears) depreciation += storageDepreciation;
    if (year <= charging.lifeYears) depreciation += chargingDepreciation;

    // EBIT and taxes
    const ebit = ebitda - depreciation;
    const taxes = ebit > 0 ? ebit * economic.taxRate / 100 : 0;
    const netIncome = ebit - taxes;

    // CAPEX replacements
    let capexReplacement = 0;
    if (year === charging.lifeYears + 1 && year <= economic.businessPlanYears) {
      capexReplacement = chargingCapex * Math.pow(1 + economic.inflationRate / 100, year - 1);
    }
    if (year === storage.lifeYears + 1 && year <= economic.businessPlanYears) {
      capexReplacement += storageCapex * Math.pow(1 + economic.inflationRate / 100, year - 1);
    }

    // Cash flow
    const cashFlow = netIncome + depreciation - capexReplacement;
    cumulativeCashFlow += cashFlow;

    // Discounted cash flow
    const discountedCashFlow = cashFlow / Math.pow(1 + economic.discountRate / 100, year);

    cashFlows.push({
      year,
      chargingRevenue,
      gridSalesRevenue,
      totalRevenue,
      gridPurchaseCost,
      pvOMCost,
      storageOMCost,
      chargingOMCost,
      insuranceCost,
      totalOpex,
      ebitda,
      depreciation,
      ebit,
      taxes,
      netIncome,
      capexReplacement,
      cashFlow,
      cumulativeCashFlow,
      discountedCashFlow,
    });
  }

  return cashFlows;
}

function calculateFinancialKPIs(
  businessPlan: AnnualCashFlow[],
  inputs: SimulationInputs
): FinancialKPIs {
  const { pv, storage, charging, economic } = inputs;

  // Initial CAPEX
  const pvCapex = pv.powerKWp * pv.costPerKWp;
  const storageCapex = storage.capacityKWh * storage.costPerKWh;
  const chargingCapex = charging.numStations * charging.costPerStation;
  const technicalCosts = (pvCapex + storageCapex + chargingCapex) * economic.technicalCostsPercent / 100;
  const initialCapex = pvCapex + storageCapex + chargingCapex + technicalCosts;

  // Build cash flow array for IRR/NPV calculations
  const cashFlows = [-initialCapex, ...businessPlan.map(cf => cf.cashFlow)];

  // IRR
  const irr = calculateIRR(cashFlows) * 100;

  // NPV
  const npv = calculateNPV(cashFlows, economic.discountRate / 100);

  // Payback periods
  let paybackPeriod = economic.businessPlanYears;
  let discountedPaybackPeriod = economic.businessPlanYears;
  let cumulativeDiscounted = -initialCapex;

  for (let i = 0; i < businessPlan.length; i++) {
    if (businessPlan[i].cumulativeCashFlow >= 0 && paybackPeriod === economic.businessPlanYears) {
      // Linear interpolation for more accurate payback
      if (i > 0) {
        const prevCumulative = businessPlan[i - 1].cumulativeCashFlow;
        const currentCumulative = businessPlan[i].cumulativeCashFlow;
        paybackPeriod = i + (0 - prevCumulative) / (currentCumulative - prevCumulative);
      } else {
        paybackPeriod = 1;
      }
    }

    cumulativeDiscounted += businessPlan[i].discountedCashFlow;
    if (cumulativeDiscounted >= 0 && discountedPaybackPeriod === economic.businessPlanYears) {
      if (i > 0) {
        const prevDiscounted = cumulativeDiscounted - businessPlan[i].discountedCashFlow;
        discountedPaybackPeriod = i + 1 + (0 - prevDiscounted) / businessPlan[i].discountedCashFlow;
      } else {
        discountedPaybackPeriod = 1;
      }
    }
  }

  // ROI
  const totalCashFlows = businessPlan.reduce((sum, cf) => sum + cf.cashFlow, 0);
  const roi = ((totalCashFlows - initialCapex) / initialCapex) * 100;

  // LCOE (simplified)
  const totalProduction = businessPlan.reduce((sum, cf, i) => {
    // Assuming constant production with 0.5% annual degradation
    return sum + (pv.powerKWp * 1200 * Math.pow(0.995, i)); // Assuming 1200 kWh/kWp base
  }, 0);
  const totalCosts = initialCapex + businessPlan.reduce((sum, cf) => sum + cf.totalOpex, 0);
  const lcoe = totalCosts / totalProduction;

  return {
    initialCapex,
    pvCapex,
    storageCapex,
    chargingCapex,
    technicalCosts,
    irr,
    npv,
    paybackPeriod,
    discountedPaybackPeriod,
    roi,
    lcoe,
  };
}

// Generate default consumption profile for EV charging station
export function generateDefaultConsumptionProfile(
  numStations: number,
  powerPerStation: number,
  utilizationRate: number = 10 // Default 10% utilization
): number[] {
  const profile: number[] = [];
  const totalPower = numStations * powerPerStation;

  // Calculate target annual energy based on utilization rate
  // utilizationRate% means that many equivalent hours at full power
  const targetAnnualEnergy = totalPower * HOURS_PER_YEAR * (utilizationRate / 100);

  // Generate initial profile with demand patterns
  for (let day = 0; day < 365; day++) {
    const isWeekend = day % 7 >= 5;

    for (let hour = 0; hour < 24; hour++) {
      let demand = 0;

      if (isWeekend) {
        // Weekend: 1-2 charges/day, distributed
        if ((hour >= 10 && hour <= 12) || (hour >= 15 && hour <= 17)) {
          demand = (totalPower * 0.3) * (0.8 + Math.random() * 0.4);
        }
      } else {
        // Weekday: 2-3 charges/day, peaks at 8-10 and 18-20
        if (hour >= 7 && hour <= 9) {
          demand = (totalPower * 0.5) * (0.8 + Math.random() * 0.4);
        } else if (hour >= 17 && hour <= 19) {
          demand = (totalPower * 0.6) * (0.8 + Math.random() * 0.4);
        } else if (hour >= 12 && hour <= 14) {
          demand = (totalPower * 0.2) * (0.8 + Math.random() * 0.4);
        }
      }

      profile.push(demand);
    }
  }

  // Scale profile to match target annual energy based on utilization rate
  const currentTotal = profile.reduce((sum, val) => sum + val, 0);
  const scalingFactor = currentTotal > 0 ? targetAnnualEnergy / currentTotal : 0;

  return profile.map(val => Math.round(val * scalingFactor * 100) / 100);
}

// Generate default PUN prices (simplified Italian market)
export function generateDefaultPUNPrices(): number[] {
  const prices: number[] = [];

  for (let day = 0; day < 365; day++) {
    const month = Math.floor(day / 30);
    const seasonalFactor = 1 + 0.2 * Math.sin((month - 6) * Math.PI / 6); // Higher in winter

    for (let hour = 0; hour < 24; hour++) {
      let basePrice = 0.08; // Base price €/kWh

      // Time-of-use pattern
      if (hour >= 8 && hour <= 20) {
        basePrice = 0.12; // Peak hours
      } else if (hour >= 6 && hour <= 8 || hour >= 20 && hour <= 22) {
        basePrice = 0.10; // Shoulder hours
      } else {
        basePrice = 0.06; // Off-peak
      }

      // Add some randomness and seasonal variation
      const finalPrice = basePrice * seasonalFactor * (0.9 + Math.random() * 0.2);
      prices.push(Math.round(finalPrice * 1000) / 1000);
    }
  }

  return prices;
}
