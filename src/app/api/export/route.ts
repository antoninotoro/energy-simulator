import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { results, format, inputs } = body;

    if (format === 'excel') {
      const workbook = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        ['Simulazione Impianto Energetico Integrato'],
        [],
        ['CONFIGURAZIONE'],
        ['Parametro', 'Valore', 'Unità'],
        ['Potenza FV', inputs.pv.powerKWp, 'kWp'],
        ['Capacità Storage', inputs.storage.capacityKWh, 'kWh'],
        ['Numero Colonnine', inputs.charging.numStations, ''],
        ['Tariffa Ricarica', inputs.charging.chargingTariff, '€/kWh'],
        [],
        ['KPI TECNICI'],
        ['Produzione FV Annua', results.technicalKPIs.pv.annualProduction.toFixed(1), 'MWh'],
        ['Autoconsumo', results.technicalKPIs.system.totalSelfConsumption.toFixed(1), '%'],
        ['Autosufficienza', results.technicalKPIs.system.selfSufficiency.toFixed(1), '%'],
        ['CO2 Evitata', results.technicalKPIs.system.avoidedCO2Emissions.toFixed(1), 'ton/anno'],
        [],
        ['KPI FINANZIARI'],
        ['Investimento Iniziale', results.financialKPIs.initialCapex.toFixed(0), '€'],
        ['IRR', results.financialKPIs.irr.toFixed(1), '%'],
        ['VAN', results.financialKPIs.npv.toFixed(0), '€'],
        ['Payback', results.financialKPIs.paybackPeriod.toFixed(1), 'anni'],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Sintesi');

      // Business Plan sheet
      const bpHeaders = [
        'Anno',
        'Ricavi Ricarica (€)',
        'Vendita Rete (€)',
        'Totale Ricavi (€)',
        'Acquisto Energia (€)',
        'O&M FV (€)',
        'O&M Storage (€)',
        'O&M Colonnine (€)',
        'Assicurazione (€)',
        'EBITDA (€)',
        'Ammortamento (€)',
        'EBIT (€)',
        'Imposte (€)',
        'Cash Flow (€)',
        'CF Cumulato (€)',
      ];

      const bpData = results.businessPlan.map((year: Record<string, number>) => [
        year.year,
        year.chargingRevenue.toFixed(0),
        year.gridSalesRevenue.toFixed(0),
        year.totalRevenue.toFixed(0),
        year.gridPurchaseCost.toFixed(0),
        year.pvOMCost.toFixed(0),
        year.storageOMCost.toFixed(0),
        year.chargingOMCost.toFixed(0),
        year.insuranceCost.toFixed(0),
        year.ebitda.toFixed(0),
        year.depreciation.toFixed(0),
        year.ebit.toFixed(0),
        year.taxes.toFixed(0),
        year.cashFlow.toFixed(0),
        year.cumulativeCashFlow.toFixed(0),
      ]);

      const bpSheet = XLSX.utils.aoa_to_sheet([bpHeaders, ...bpData]);
      XLSX.utils.book_append_sheet(workbook, bpSheet, 'Business Plan');

      // Generate buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=simulazione_energetica.xlsx',
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
