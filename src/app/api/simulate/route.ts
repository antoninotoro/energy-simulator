import { NextRequest, NextResponse } from 'next/server';
import { runSimulation, generateDefaultConsumptionProfile, generateDefaultPUNPrices } from '@/lib/simulation';
import { SimulationInputs } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pv, storage, charging, economic, consumptionProfile, punPrices, pvProduction } = body;

    // Generate default profiles if not provided
    const finalConsumptionProfile = consumptionProfile?.length === 8760
      ? consumptionProfile
      : generateDefaultConsumptionProfile(charging.numStations, charging.powerPerStationKW, charging.utilizationRate);

    const finalPunPrices = punPrices?.length === 8760
      ? punPrices
      : generateDefaultPUNPrices();

    // Use provided PV production or generate from consumption profile (scaled)
    let finalPvProduction = pvProduction;
    if (!finalPvProduction || finalPvProduction.length !== 8760) {
      // Generate simplified PV production curve
      finalPvProduction = generateSimplifiedPVProduction(pv.powerKWp, pv.latitude);
    }

    // Create simulation inputs with PV production as consumption profile
    // (The simulation will use this for actual energy calculations)
    const inputs: SimulationInputs = {
      pv,
      storage,
      charging,
      economic,
      consumptionProfile: finalConsumptionProfile,
      punPrices: finalPunPrices,
    };

    // Modify the hourly results to use actual PV production
    const results = runSimulationWithPV(inputs, finalPvProduction, finalConsumptionProfile);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Simulation error:', error);
    return NextResponse.json(
      { error: 'Simulation failed' },
      { status: 500 }
    );
  }
}

// Generate simplified PV production based on latitude
function generateSimplifiedPVProduction(peakPower: number, latitude: number): number[] {
  const production: number[] = [];

  for (let day = 0; day < 365; day++) {
    const dayOfYear = day + 1;
    const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * Math.PI / 180);

    for (let hour = 0; hour < 24; hour++) {
      let power = 0;
      const solarNoon = 12;
      const hourAngle = (hour - solarNoon) * 15;

      const latRad = latitude * Math.PI / 180;
      const decRad = declination * Math.PI / 180;

      const cosZenith = Math.sin(latRad) * Math.sin(decRad) +
        Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourAngle * Math.PI / 180);

      if (cosZenith > 0) {
        const irradiance = 1000 * cosZenith * 0.75;
        power = (peakPower * irradiance) / 1000;
      }

      production.push(Math.max(0, power));
    }
  }

  return production;
}

// Modified simulation that uses actual PV production
function runSimulationWithPV(
  inputs: SimulationInputs,
  pvProduction: number[],
  consumption: number[]
) {
  const { pv, storage, charging, economic } = inputs;

  // Check if storage is enabled
  const storageEnabled = storage.enabled;
  const pvEnabled = pv.enabled;
  const chargingEnabled = charging.enabled;

  // Initial battery state
  let batterySOC = storageEnabled ? storage.capacityKWh * 0.5 : 0;
  const minSOC = storageEnabled ? storage.capacityKWh * (1 - storage.maxDoD / 100) : 0;
  const maxSOC = storageEnabled ? storage.capacityKWh : 0;
  const chargeEfficiency = storageEnabled ? Math.sqrt(storage.roundTripEfficiency / 100) : 0;
  const dischargeEfficiency = storageEnabled ? Math.sqrt(storage.roundTripEfficiency / 100) : 0;

  const hourlyResults = [];

  for (let hour = 0; hour < 8760; hour++) {
    // If PV is disabled, production is 0
    const pvProd = pvEnabled ? (pvProduction[hour] || 0) : 0;
    // If charging is disabled, demand is 0
    const demand = chargingEnabled ? (consumption[hour] || 0) : 0;
    const punPrice = inputs.punPrices[hour] || economic.avgPurchasePrice;

    let directConsumption = 0;
    let batteryCharge = 0;
    let batteryDischarge = 0;
    let gridInjection = 0;
    let gridWithdrawal = 0;

    // Priority 1: PV -> Load
    directConsumption = Math.min(pvProd, demand);
    let remainingPV = pvProd - directConsumption;
    let unmetDemand = demand - directConsumption;

    // Priority 2: Excess PV -> Battery (only if storage is enabled)
    if (storageEnabled && remainingPV > 0 && batterySOC < maxSOC) {
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

    // Priority 4: Battery -> Load (only if storage is enabled)
    if (storageEnabled && unmetDemand > 0 && batterySOC > minSOC) {
      const maxDischarge = Math.min(
        unmetDemand / dischargeEfficiency,
        storage.maxPowerKW,
        batterySOC - minSOC
      );
      batteryDischarge = maxDischarge;
      batterySOC -= maxDischarge;
      unmetDemand -= maxDischarge * dischargeEfficiency;
    }

    // Priority 5: Grid -> Load
    if (unmetDemand > 0) {
      gridWithdrawal = unmetDemand;
    }

    hourlyResults.push({
      hour,
      pvProduction: pvProd,
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

  // Calculate KPIs
  const totalPVProduction = hourlyResults.reduce((sum, h) => sum + h.pvProduction, 0);
  const totalDirectConsumption = hourlyResults.reduce((sum, h) => sum + h.directConsumption, 0);
  const totalGridInjection = hourlyResults.reduce((sum, h) => sum + h.gridInjection, 0);
  const totalBatteryCharge = hourlyResults.reduce((sum, h) => sum + h.batteryCharge, 0);
  const totalBatteryDischarge = hourlyResults.reduce((sum, h) => sum + h.batteryDischarge, 0);
  const totalDemand = hourlyResults.reduce((sum, h) => sum + h.demand, 0);
  const totalGridWithdrawal = hourlyResults.reduce((sum, h) => sum + h.gridWithdrawal, 0);
  const avgSOC = hourlyResults.reduce((sum, h) => sum + h.batterySOC, 0) / 8760;

  const selfConsumedFromPV = totalDirectConsumption + totalBatteryCharge;
  const efficiencyLoss = totalBatteryCharge * (1 - storage.roundTripEfficiency / 100);

  // Technical KPIs
  const technicalKPIs = {
    pv: {
      annualProduction: totalPVProduction / 1000,
      specificProduction: totalPVProduction / pv.powerKWp,
      capacityFactor: (totalPVProduction / (pv.powerKWp * 8760)) * 100,
      selfConsumedEnergy: selfConsumedFromPV / 1000,
      selfConsumedPercent: totalPVProduction > 0 ? (selfConsumedFromPV / totalPVProduction) * 100 : 0,
      gridInjectedEnergy: totalGridInjection / 1000,
      gridInjectedPercent: totalPVProduction > 0 ? (totalGridInjection / totalPVProduction) * 100 : 0,
    },
    storage: {
      annualCycledEnergy: totalBatteryCharge / 1000,
      equivalentCycles: totalBatteryCharge / storage.capacityKWh,
      chargedFromPV: totalBatteryCharge / 1000,
      dischargedToLoads: totalBatteryDischarge / 1000,
      efficiencyLosses: efficiencyLoss / 1000,
      avgSOC: (avgSOC / storage.capacityKWh) * 100,
    },
    charging: {
      numCharges: Math.round(totalDemand / 30),
      totalEnergyDelivered: totalDemand / 1000,
      energyFromPVDirect: totalDirectConsumption / 1000,
      energyFromPVDirectPercent: totalDemand > 0 ? (totalDirectConsumption / totalDemand) * 100 : 0,
      energyFromStorage: (totalBatteryDischarge * dischargeEfficiency) / 1000,
      energyFromStoragePercent: totalDemand > 0 ? ((totalBatteryDischarge * dischargeEfficiency) / totalDemand) * 100 : 0,
      energyFromGrid: totalGridWithdrawal / 1000,
      energyFromGridPercent: totalDemand > 0 ? (totalGridWithdrawal / totalDemand) * 100 : 0,
      avgPowerPerCharge: totalDemand / Math.max(1, Math.round(totalDemand / 30)) / 1.5,
      avgChargeDuration: 1.5,
    },
    system: {
      totalSelfConsumption: totalPVProduction > 0 ? (selfConsumedFromPV / totalPVProduction) * 100 : 0,
      selfSufficiency: totalDemand > 0 ? ((totalDirectConsumption + totalBatteryDischarge * dischargeEfficiency) / totalDemand) * 100 : 0,
      avoidedSystemCharges: (totalDirectConsumption + totalBatteryDischarge * dischargeEfficiency) * economic.systemCharges,
      avoidedCO2Emissions: totalPVProduction * 0.3 / 1000,
    },
  };

  // Calculate business plan and financial KPIs
  // Only include CAPEX for enabled assets
  const pvCapex = pvEnabled ? pv.powerKWp * pv.costPerKWp : 0;
  const storageCapex = storageEnabled ? storage.capacityKWh * storage.costPerKWh : 0;
  const chargingCapex = chargingEnabled ? charging.numStations * charging.costPerStation : 0;
  const technicalCosts = (pvCapex + storageCapex + chargingCapex) * economic.technicalCostsPercent / 100;
  const initialCapex = pvCapex + storageCapex + chargingCapex + technicalCosts;

  const businessPlan = [];
  let cumulativeCashFlow = -initialCapex;

  for (let year = 1; year <= economic.businessPlanYears; year++) {
    const inflationFactor = Math.pow(1 + economic.inflationRate / 100, year - 1);

    const chargingRevenue = chargingEnabled ? technicalKPIs.charging.totalEnergyDelivered * 1000 * charging.chargingTariff * inflationFactor : 0;
    const gridSalesRevenue = pvEnabled ? technicalKPIs.pv.gridInjectedEnergy * 1000 * economic.gridSellPrice * inflationFactor : 0;
    const totalRevenue = chargingRevenue + gridSalesRevenue;

    const gridPurchaseCost = chargingEnabled ? technicalKPIs.charging.energyFromGrid * 1000 * (economic.avgPurchasePrice + economic.systemCharges) * inflationFactor : 0;
    const pvOMCost = pvEnabled ? pvCapex * pv.omCostPercent / 100 * inflationFactor : 0;
    const storageOMCost = storageEnabled ? storage.omCostYear * inflationFactor : 0;
    const chargingOMCost = chargingEnabled ? charging.numStations * charging.omCostPerStation * inflationFactor : 0;
    const insuranceCost = (pvCapex + storageCapex + chargingCapex) * economic.insurancePercent / 100 * inflationFactor;
    const totalOpex = gridPurchaseCost + pvOMCost + storageOMCost + chargingOMCost + insuranceCost;

    const ebitda = totalRevenue - totalOpex;

    let depreciation = 0;
    if (pvEnabled && year <= pv.lifeYears) depreciation += pvCapex / pv.lifeYears;
    if (storageEnabled && year <= storage.lifeYears) depreciation += storageCapex / storage.lifeYears;
    if (chargingEnabled && year <= charging.lifeYears) depreciation += chargingCapex / charging.lifeYears;

    const ebit = ebitda - depreciation;
    const taxes = ebit > 0 ? ebit * economic.taxRate / 100 : 0;
    const netIncome = ebit - taxes;

    let capexReplacement = 0;
    if (chargingEnabled && year === charging.lifeYears + 1) {
      capexReplacement = chargingCapex * Math.pow(1 + economic.inflationRate / 100, year - 1);
    }
    if (storageEnabled && year === storage.lifeYears + 1) {
      capexReplacement += storageCapex * Math.pow(1 + economic.inflationRate / 100, year - 1);
    }

    const cashFlow = netIncome + depreciation - capexReplacement;
    cumulativeCashFlow += cashFlow;
    const discountedCashFlow = cashFlow / Math.pow(1 + economic.discountRate / 100, year);

    businessPlan.push({
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

  // Calculate IRR using Newton-Raphson
  const cashFlows = [-initialCapex, ...businessPlan.map(cf => cf.cashFlow)];
  let irr = 0.1;
  for (let i = 0; i < 100; i++) {
    let npv = 0;
    let dnpv = 0;
    for (let j = 0; j < cashFlows.length; j++) {
      npv += cashFlows[j] / Math.pow(1 + irr, j);
      dnpv -= j * cashFlows[j] / Math.pow(1 + irr, j + 1);
    }
    if (Math.abs(npv) < 1e-7) break;
    if (Math.abs(dnpv) > 1e-7) irr = irr - npv / dnpv;
  }

  // Calculate NPV
  const npv = cashFlows.reduce((sum, cf, i) => sum + cf / Math.pow(1 + economic.discountRate / 100, i), 0);

  // Calculate payback
  let paybackPeriod = economic.businessPlanYears;
  for (let i = 0; i < businessPlan.length; i++) {
    if (businessPlan[i].cumulativeCashFlow >= 0) {
      if (i > 0) {
        paybackPeriod = i + 1 + (-businessPlan[i - 1].cumulativeCashFlow) / businessPlan[i].cashFlow;
      } else {
        paybackPeriod = 1;
      }
      break;
    }
  }

  const financialKPIs = {
    initialCapex,
    pvCapex,
    storageCapex,
    chargingCapex,
    technicalCosts,
    irr: irr * 100,
    npv,
    paybackPeriod,
    discountedPaybackPeriod: paybackPeriod * 1.1,
    roi: ((businessPlan.reduce((sum, cf) => sum + cf.cashFlow, 0) - initialCapex) / initialCapex) * 100,
    lcoe: (initialCapex + businessPlan.reduce((sum, cf) => sum + cf.totalOpex, 0)) / (totalPVProduction * economic.businessPlanYears / 1000),
  };

  return {
    hourlyResults,
    technicalKPIs,
    financialKPIs,
    businessPlan,
  };
}
