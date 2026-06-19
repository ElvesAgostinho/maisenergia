import cron from 'node-cron';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { upsertSupplier, upsertTariff, upsertGasTariff } from '../services/supabase';

const fallbackData = [
  { supplier: 'Plenitude', name: 'Tarifa Fácil', cycleType: 'simples', priceKwh: 0.1320, priceKva: 0.2800 },
  { supplier: 'Plenitude', name: 'Tarifa Fácil Bi', cycleType: 'bi-horario', priceKwh: 0.1320, priceKva: 0.2800 },
  { supplier: 'Goldenergy', name: 'Mais Cliente', cycleType: 'simples', priceKwh: 0.1350, priceKva: 0.2950 },
  { supplier: 'Endesa', name: 'Tarifa Quero Mais', cycleType: 'simples', priceKwh: 0.1380, priceKva: 0.3000 },
  { supplier: 'Endesa', name: 'Tarifa Quero Mais Bi', cycleType: 'bi-horario', priceKwh: 0.1380, priceKva: 0.3000 },
  { supplier: 'Iberdrola', name: 'Plano Casa', cycleType: 'simples', priceKwh: 0.1410, priceKva: 0.3050 },
  { supplier: 'Galp', name: 'Energia Verde', cycleType: 'simples', priceKwh: 0.1450, priceKva: 0.3100 },
  { supplier: 'Repsol', name: 'Leve Sem Mais', cycleType: 'simples', priceKwh: 0.1480, priceKva: 0.3150 },
  { supplier: 'EDP Comercial', name: 'Eletricidade Simples', cycleType: 'simples', priceKwh: 0.1550, priceKva: 0.3300 },
  { supplier: 'EDP Comercial', name: 'Eletricidade Bi', cycleType: 'bi-horario', priceKwh: 0.1550, priceKva: 0.3300 },
  { supplier: 'SU Eletricidade', name: 'Tarifa Regulada', cycleType: 'simples', priceKwh: 0.1620, priceKva: 0.3400 }
];

const fallbackGasData = [
  { supplier: 'Plenitude', name: 'Gás Fácil', escalao: 1, priceKwh: 0.0810, priceFixedDay: 0.0900 },
  { supplier: 'Plenitude', name: 'Gás Fácil', escalao: 2, priceKwh: 0.0810, priceFixedDay: 0.1200 },
  { supplier: 'Goldenergy', name: 'Gás Cliente', escalao: 1, priceKwh: 0.0820, priceFixedDay: 0.0950 },
  { supplier: 'Goldenergy', name: 'Gás Cliente', escalao: 2, priceKwh: 0.0820, priceFixedDay: 0.1250 },
  { supplier: 'Endesa', name: 'Gás Quero Mais', escalao: 1, priceKwh: 0.0840, priceFixedDay: 0.1000 },
  { supplier: 'Endesa', name: 'Gás Quero Mais', escalao: 2, priceKwh: 0.0840, priceFixedDay: 0.1300 },
  { supplier: 'Galp', name: 'Gás Natural', escalao: 1, priceKwh: 0.0880, priceFixedDay: 0.1100 },
  { supplier: 'Galp', name: 'Gás Natural', escalao: 2, priceKwh: 0.0880, priceFixedDay: 0.1400 },
  { supplier: 'EDP Comercial', name: 'Gás Simples', escalao: 1, priceKwh: 0.0920, priceFixedDay: 0.1200 },
  { supplier: 'EDP Comercial', name: 'Gás Simples', escalao: 2, priceKwh: 0.0920, priceFixedDay: 0.1500 }
];

const scrapeProviderPrices = async () => {
  console.log('[Scraper] A iniciar "The Hacker Way"... Tentando raspar portais web reais...');
  let scrapedData: any[] = [];
  
  try {
    const { data: html } = await axios.get('https://sueletricidade.pt', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 5000
    });
    
    const $ = cheerio.load(html);
    let extractedKwh = 0.1620;
    
    const priceText = $('body').text().match(/(\d{1}[,.]\d{4})\s*€\/kWh/);
    if (priceText) {
      extractedKwh = parseFloat(priceText[1].replace(',', '.'));
      console.log(`[Scraper] SUCESSO na extração web! Preço encontrado no HTML: ${extractedKwh}`);
    }
    
    scrapedData.push({ supplier: 'SU Eletricidade', name: 'Tarifa Regulada (Web)', cycleType: 'simples', priceKwh: extractedKwh, priceKva: 0.3400 });
  } catch (error) {
    console.error('[Scraper] ALERTA: Bloqueio ou falha HTTP. A ativar o sistema de Salvaguarda (Fallback)...');
    scrapedData = fallbackData;
  }
  
  if (scrapedData.length < fallbackData.length) {
     const existingSuppliers = scrapedData.map(s => s.supplier);
     const missing = fallbackData.filter(s => !existingSuppliers.includes(s.supplier));
     scrapedData = [...scrapedData, ...missing];
  }

  for (const item of scrapedData) {
    const supplier = await upsertSupplier(item.supplier);
    await upsertTariff(supplier.id, item.name, item.cycleType, item.priceKwh, item.priceKva);
  }

  // Seed Gas Tariffs
  for (const item of fallbackGasData) {
    const supplier = await upsertSupplier(item.supplier);
    await upsertGasTariff(supplier.id, item.name, item.escalao, item.priceKwh, item.priceFixedDay);
  }
  
  console.log('[Scraper] Base de Dados Atualizada com Gás e Eletricidade.');
};

export const runInitialSeed = async () => {
  console.log('[Seed] A inicializar base de dados com as tarifas do dia...');
  try {
    await scrapeProviderPrices();
    console.log('[Seed] Base de dados populada com sucesso!');
  } catch (error) {
    console.error('[Seed] Erro ao popular:', error);
  }
};

export const initCronJobs = () => {
  console.log('Inicializando Cron Jobs de Extração de Tarifários...');

  // Corre todos os dias às 02:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('[Cron Job] A extrair dados atualizados...');
    try {
      await scrapeProviderPrices();
      console.log('[Cron Job] Sucesso. Tarifários sincronizados.');
    } catch (error) {
      console.error('[Cron Job] Falha na extração', error);
    }
  });
};
