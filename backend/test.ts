import { calculateBestTariffs } from './src/services/calculator';
import { getActiveTariffs, getActiveGasTariffs } from './src/services/supabase';

async function test() {
  console.log('Testing getActiveTariffs...');
  const tariffs = await getActiveTariffs('simples');
  console.log('Electricity Tariffs:', tariffs.length);

  console.log('Testing getActiveGasTariffs...');
  const gasTariffs = await getActiveGasTariffs(1);
  console.log('Gas Tariffs:', gasTariffs.length);

  const invoice = {
    supplier: 'EDP Comercial',
    isEnergyInvoice: true,
    hasElectricity: true,
    powerKVA: 4.6,
    electricityConsumptionKWh: 200,
    electricityCostEuros: 50,
    cycleType: 'simples' as 'simples',
    hasGas: true,
    gasConsumptionKWh: 150,
    gasEscalao: 1,
    gasCostEuros: 30
  };

  console.log('Testing calculateBestTariffs...');
  const result = await calculateBestTariffs(invoice);
  console.log(JSON.stringify(result, null, 2));
}

test();
