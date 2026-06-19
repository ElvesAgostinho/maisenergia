import { Router } from 'express';
import multer from 'multer';
import { analyzeInvoice } from '../services/aiParser';
import { calculateBestTariffs } from '../services/calculator';
import { saveLead } from '../services/supabase';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/save-lead', async (req, res): Promise<void> => {
  try {
    const { name, contact, chosenSupplier, savings } = req.body;
    
    if (!name || !contact) {
      res.status(400).json({ error: 'Nome e contacto são obrigatórios.' });
      return;
    }

    const result = await saveLead(name, contact, chosenSupplier || 'N/A', parseFloat(savings) || 0);
    
    if (result.success) {
      res.status(200).json({ success: true });
    } else {
      res.status(500).json({ error: 'Erro ao guardar a lead na base de dados.' });
    }
  } catch (error: any) {
    console.error('Erro no /save-lead:', error);
    res.status(500).json({ error: 'Erro de servidor.' });
  }
});

router.post('/analyze-invoice', upload.single('invoice'), async (req, res): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'Nenhuma fatura enviada.' });
      return;
    }

    // 1. Send to AI Parser to extract data
    console.log('Extraindo dados da fatura via IA...');
    const extractedData = await analyzeInvoice(file.buffer, file.mimetype);

    if (!extractedData.isEnergyInvoice) {
      res.status(400).json({ error: 'A fatura enviada não parece ser de eletricidade ou gás natural. Por favor, envie uma fatura de energia.' });
      return;
    }

    // 2. Calculate savings against our tariff database
    console.log('Calculando opções mais económicas...');
    const results = await calculateBestTariffs(extractedData);

    res.status(200).json({
      success: true,
      extractedData,
      electricityOptions: results.electricityOptions,
      gasOptions: results.gasOptions
    });
  } catch (error: any) {
    console.error('Erro na análise da fatura:', error);
    res.status(500).json({ error: error.message || 'Erro ao analisar a fatura.' });
  }
});

export default router;
