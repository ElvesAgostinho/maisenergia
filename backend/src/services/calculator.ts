import { ExtractedInvoice } from './aiParser';
import { getActiveTariffs, getActiveGasTariffs } from './supabase';

export const calculateBestTariffs = async (invoice: ExtractedInvoice) => {
  const DAYS_IN_MONTH = 30;
  
  let electricityComparisons: any[] = [];
  let gasComparisons: any[] = [];

  // Electricity Calculation
  if (invoice.hasElectricity && invoice.electricityCostEuros && invoice.electricityCostEuros > 0) {
    let normalizedCycle = (invoice.cycleType || 'simples').toLowerCase().trim();
    let electricityTariffs = await getActiveTariffs(normalizedCycle);
    
    // Fallback para simples se não encontrar tarifas para este ciclo
    if (electricityTariffs.length === 0) {
        electricityTariffs = await getActiveTariffs('simples');
    }
    
    electricityComparisons = electricityTariffs.map(tariff => {
      const energyCost = (invoice.electricityConsumptionKWh || 0) * tariff.price_kwh;
      const powerCost = (invoice.powerKVA || 3.45) * tariff.price_kva_day * DAYS_IN_MONTH;
      const estimatedMonthlyCost = energyCost + powerCost;
      const savingsEuros = invoice.electricityCostEuros! - estimatedMonthlyCost;

      return {
        type: 'luz',
        supplier: tariff.supplier_name,
        tariffName: tariff.tariff_name,
        estimatedCost: estimatedMonthlyCost,
        monthlySavings: savingsEuros,
        annualSavings: savingsEuros * 12
      };
    });

    electricityComparisons.sort((a, b) => b.monthlySavings - a.monthlySavings);
  }

  // Gas Calculation
  if (invoice.hasGas && invoice.gasCostEuros && invoice.gasCostEuros > 0) {
    let gasTariffs = await getActiveGasTariffs(invoice.gasEscalao || 1);
    
    if (gasTariffs.length === 0) {
      gasTariffs = await getActiveGasTariffs(1); // fallback para escalão 1
    }
    
    gasComparisons = gasTariffs.map(tariff => {
      const energyCost = (invoice.gasConsumptionKWh || 0) * tariff.price_kwh;
      const fixedCost = tariff.price_fixed_day * DAYS_IN_MONTH;
      const estimatedMonthlyCost = energyCost + fixedCost;
      const savingsEuros = invoice.gasCostEuros! - estimatedMonthlyCost;

      return {
        type: 'gas',
        supplier: tariff.supplier_name,
        tariffName: tariff.tariff_name,
        estimatedCost: estimatedMonthlyCost,
        monthlySavings: savingsEuros,
        annualSavings: savingsEuros * 12
      };
    });

    gasComparisons.sort((a, b) => b.monthlySavings - a.monthlySavings);
  }

  return {
    electricityOptions: electricityComparisons.length > 0 ? electricityComparisons : null,
    gasOptions: gasComparisons.length > 0 ? gasComparisons : null,
  };
};
