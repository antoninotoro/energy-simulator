'use client';

import React from 'react';
import { useSimulationStore } from '@/store/simulation';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/financial';
import { DollarSign, TrendingUp, Clock, PiggyBank, Calculator } from 'lucide-react';

interface FinancialKPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  highlight?: boolean;
}

const FinancialKPICard: React.FC<FinancialKPICardProps> = ({
  title,
  value,
  subtitle,
  icon,
  highlight = false,
}) => (
  <div
    className={`p-4 rounded-lg border ${
      highlight
        ? 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200'
        : 'bg-white border-gray-200'
    } transition-all hover:shadow-md`}
  >
    <div className="flex items-center gap-2 mb-2 text-gray-600">
      {icon}
      <span className="text-sm font-medium">{title}</span>
    </div>
    <div className={`text-2xl font-bold ${highlight ? 'text-blue-700' : 'text-gray-800'}`}>
      {value}
    </div>
    {subtitle && <div className="text-xs mt-1 text-gray-500">{subtitle}</div>}
  </div>
);

export const EconomicAnalysis: React.FC = () => {
  const { results } = useSimulationStore();

  if (!results) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <DollarSign size={48} className="mx-auto mb-4 opacity-30" />
          <p>Esegui la simulazione per vedere l&apos;analisi economica</p>
        </div>
      </div>
    );
  }

  const { financialKPIs, businessPlan } = results;

  return (
    <div className="p-6 overflow-y-auto">
      {/* CAPEX Breakdown */}
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Investimento Iniziale</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="text-sm text-yellow-700">CAPEX FV</div>
          <div className="text-lg font-bold text-yellow-800">
            {formatCurrency(financialKPIs.pvCapex, 0)}
          </div>
        </div>
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="text-sm text-green-700">CAPEX Storage</div>
          <div className="text-lg font-bold text-green-800">
            {formatCurrency(financialKPIs.storageCapex, 0)}
          </div>
        </div>
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-700">CAPEX Colonnine</div>
          <div className="text-lg font-bold text-blue-800">
            {formatCurrency(financialKPIs.chargingCapex, 0)}
          </div>
        </div>
        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
          <div className="text-sm text-purple-700">Spese Tecniche</div>
          <div className="text-lg font-bold text-purple-800">
            {formatCurrency(financialKPIs.technicalCosts, 0)}
          </div>
        </div>
        <div className="p-3 bg-gray-100 rounded-lg border border-gray-300">
          <div className="text-sm text-gray-700 font-semibold">Totale</div>
          <div className="text-lg font-bold text-gray-900">
            {formatCurrency(financialKPIs.initialCapex, 0)}
          </div>
        </div>
      </div>

      {/* Financial KPIs */}
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Indicatori Finanziari</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <FinancialKPICard
          title="IRR (TIR)"
          value={formatPercent(financialKPIs.irr)}
          icon={<TrendingUp size={16} />}
          highlight={financialKPIs.irr > 8}
        />
        <FinancialKPICard
          title="NPV (VAN)"
          value={formatCurrency(financialKPIs.npv, 0)}
          icon={<Calculator size={16} />}
          highlight={financialKPIs.npv > 0}
        />
        <FinancialKPICard
          title="Payback Period"
          value={`${formatNumber(financialKPIs.paybackPeriod, 1)} anni`}
          subtitle={`Attualizzato: ${formatNumber(financialKPIs.discountedPaybackPeriod, 1)} anni`}
          icon={<Clock size={16} />}
        />
        <FinancialKPICard
          title="ROI Cumulato"
          value={formatPercent(financialKPIs.roi)}
          icon={<PiggyBank size={16} />}
        />
        <FinancialKPICard
          title="LCOE"
          value={`${formatNumber(financialKPIs.lcoe * 100, 1)} c€/kWh`}
          icon={<DollarSign size={16} />}
        />
      </div>

      {/* Business Plan Table */}
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Business Plan</h3>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50">
                Anno
              </th>
              <th className="px-3 py-3 text-right font-semibold text-gray-700">Ricavi Ricarica</th>
              <th className="px-3 py-3 text-right font-semibold text-gray-700">Vendita Rete</th>
              <th className="px-3 py-3 text-right font-semibold text-gray-700">Tot. Ricavi</th>
              <th className="px-3 py-3 text-right font-semibold text-gray-700">Acq. Energia</th>
              <th className="px-3 py-3 text-right font-semibold text-gray-700">O&M Tot.</th>
              <th className="px-3 py-3 text-right font-semibold text-gray-700">EBITDA</th>
              <th className="px-3 py-3 text-right font-semibold text-gray-700">Ammort.</th>
              <th className="px-3 py-3 text-right font-semibold text-gray-700">Imposte</th>
              <th className="px-3 py-3 text-right font-semibold text-gray-700">Cash Flow</th>
              <th className="px-3 py-3 text-right font-semibold text-gray-700">CF Cum.</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {businessPlan.map((year) => (
              <tr key={year.year} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-800 sticky left-0 bg-white">
                  {year.year}
                </td>
                <td className="px-3 py-2 text-right text-green-600">
                  {formatCurrency(year.chargingRevenue, 0)}
                </td>
                <td className="px-3 py-2 text-right text-green-600">
                  {formatCurrency(year.gridSalesRevenue, 0)}
                </td>
                <td className="px-3 py-2 text-right font-medium text-green-700">
                  {formatCurrency(year.totalRevenue, 0)}
                </td>
                <td className="px-3 py-2 text-right text-red-600">
                  {formatCurrency(year.gridPurchaseCost, 0)}
                </td>
                <td className="px-3 py-2 text-right text-red-600">
                  {formatCurrency(
                    year.pvOMCost + year.storageOMCost + year.chargingOMCost + year.insuranceCost,
                    0
                  )}
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  <span className={year.ebitda >= 0 ? 'text-green-700' : 'text-red-700'}>
                    {formatCurrency(year.ebitda, 0)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-gray-600">
                  {formatCurrency(year.depreciation, 0)}
                </td>
                <td className="px-3 py-2 text-right text-red-600">
                  {formatCurrency(year.taxes, 0)}
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  <span className={year.cashFlow >= 0 ? 'text-green-700' : 'text-red-700'}>
                    {formatCurrency(year.cashFlow, 0)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-bold">
                  <span
                    className={year.cumulativeCashFlow >= 0 ? 'text-green-700' : 'text-red-700'}
                  >
                    {formatCurrency(year.cumulativeCashFlow, 0)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
