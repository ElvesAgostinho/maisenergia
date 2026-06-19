import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://mock.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'mock_key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Update getActiveTariffs to use the real database completely
export const getActiveTariffs = async (cycleType: string) => {
  const { data, error } = await supabase
    .from('tariffs')
    .select('id, name, price_kwh, price_kva_day, cycle_type, suppliers(name)')
    .eq('cycle_type', cycleType)
    .eq('is_active', true);

  if (error) {
    console.error('Supabase query error:', error);
    return [];
  }

  return data.map((d: any) => ({
    id: d.id,
    supplier_name: d.suppliers?.name || 'Desconhecido',
    tariff_name: d.name,
    price_kwh: d.price_kwh,
    price_kva_day: d.price_kva_day,
    cycle_type: d.cycle_type
  }));
};

// Nova função para buscar tarifas de gás baseadas no escalão
export const getActiveGasTariffs = async (escalao: number) => {
  const { data, error } = await supabase
    .from('gas_tariffs')
    .select('id, name, price_kwh, price_fixed_day, escalao, suppliers(name)')
    .eq('escalao', escalao)
    .eq('is_active', true);

  if (error) {
    console.error('Supabase gas query error:', error);
    return [];
  }

  return data.map((d: any) => ({
    id: d.id,
    supplier_name: d.suppliers?.name || 'Desconhecido',
    tariff_name: d.name,
    price_kwh: d.price_kwh,
    price_fixed_day: d.price_fixed_day,
    escalao: d.escalao
  }));
};

// Function to upsert supplier
export const upsertSupplier = async (name: string) => {
  const { data, error } = await supabase
    .rpc('bot_upsert_supplier', { p_name: name, p_secret: process.env.BOT_DB_SECRET });

  if (error) throw error;
  return data;
};

// Function to upsert tariff
export const upsertTariff = async (supplierId: string, name: string, cycleType: string, priceKwh: number, priceKvaDay: number) => {
  const { data, error } = await supabase
    .rpc('bot_upsert_tariff', {
      p_supplier_id: supplierId,
      p_name: name,
      p_cycle_type: cycleType,
      p_price_kwh: priceKwh,
      p_price_kva_day: priceKvaDay,
      p_secret: process.env.BOT_DB_SECRET
    });

  if (error) throw error;
  return data;
};

// Function to upsert gas tariff
export const upsertGasTariff = async (supplierId: string, name: string, escalao: number, priceKwh: number, priceFixedDay: number) => {
  const { data, error } = await supabase
    .rpc('bot_upsert_gas_tariff', {
      p_supplier_id: supplierId,
      p_name: name,
      p_escalao: escalao,
      p_price_kwh: priceKwh,
      p_price_fixed_day: priceFixedDay,
      p_secret: process.env.BOT_DB_SECRET
    });

  if (error) throw error;
  return data;
};

// Function to save a lead
export const saveLead = async (name: string, contact: string, chosenSupplier: string, savings: number) => {
  const { data, error } = await supabase
    .from('leads')
    .insert([{
      name,
      contact,
      chosen_supplier: chosenSupplier,
      estimated_savings: savings,
      status: 'novo'
    }])
    .select()
    .single();

  if (error) {
    console.error('Supabase lead insert error:', error);
    return { success: false, error };
  }
  return { success: true, data };
};
