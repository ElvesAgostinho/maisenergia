import OpenAI from 'openai';
import dotenv from 'dotenv';
import pdfParse from 'pdf-parse';
dotenv.config();

export interface ExtractedInvoice {
  isEnergyInvoice: boolean;
  supplier: string;
  // Electricity
  hasElectricity: boolean;
  powerKVA?: number;
  electricityConsumptionKWh?: number;
  electricityCostEuros?: number;
  cycleType?: 'simples' | 'bi-horario' | 'tri-horario';
  
  // Gas
  hasGas: boolean;
  gasConsumptionKWh?: number;
  gasEscalao?: number; // 1, 2, 3, 4
  gasCostEuros?: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const analyzeInvoice = async (fileBuffer: Buffer, mimeType: string): Promise<ExtractedInvoice> => {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your_api_key_here')) {
    throw new Error('CONFIGURAÇÃO EM FALTA: Por favor, adicione a sua OPENAI_API_KEY no ficheiro backend/.env para ler faturas reais.');
  }

  try {
    let response;
    const systemPrompt = `És um especialista imbatível na extração de dados de faturas de energia (Eletricidade e Gás Natural) em Portugal.
A tua tarefa é extrair os dados EXATOS da fatura fornecida, vasculhando todas as páginas do documento. Muitas faturas têm a Eletricidade nas primeiras páginas e o Gás Natural nas páginas seguintes (ex: página 3 ou 4).
Responde ESTRITAMENTE em formato JSON com a seguinte estrutura:
{
  "isEnergyInvoice": true, // false apenas se tiveres a certeza que é de telecomunicações, água, etc.
  "supplier": "nome do comercializador (ex: EDP Comercial, Endesa, Galp, etc)",
  "hasElectricity": true ou false,
  "powerKVA": numero decimal (ex: 3.45, 4.6, 6.9 - a potência contratada),
  "electricityConsumptionKWh": numero inteiro (consumo de eletricidade faturado. PROCURA BEM, nunca devolvas 0 se existir um valor na fatura),
  "electricityCostEuros": numero decimal (total a pagar pela eletricidade),
  "cycleType": "simples", "bi-horario" ou "tri-horario",
  "hasGas": true ou false (Procura em todas as páginas se existe consumo de GÁS NATURAL),
  "gasConsumptionKWh": numero inteiro (consumo de gás faturado em kWh. Se a fatura tiver gás, tens de encontrar este valor!),
  "gasEscalao": numero inteiro (escalão de gás 1 a 4),
  "gasCostEuros": numero decimal (total a pagar pelo gás)
}
Sê meticuloso. Procura os valores de 'kWh' faturados. Se o valor estiver desformatado (ex: '1 2 3 kWh'), junta os números. O consumo faturado nunca deve ser 0 se a pessoa pagou mais do que a taxa fixa. Se a fatura for conjunta, garante que separas os custos e consumos de Eletricidade e Gás.`;

    if (mimeType === 'application/pdf') {
      let text = '';
      try {
        // Lemos o documento todo (removido max: 2) porque faturas duplas têm o gás nas páginas 3 ou 4
        const pdfData = await pdfParse(fileBuffer);
        text = pdfData.text;
        
        if (!text || text.trim().length < 50) {
           throw new Error('PDF_SCANNED');
        }
      } catch (pdfError: any) {
        console.error('PDF Parse error:', pdfError);
        if (pdfError.message === 'PDF_SCANNED') {
          throw new Error('A fatura parece ser um documento digitalizado (fotografia dentro de um PDF). Por favor, tire um Print Screen / Fotografia e faça upload da Imagem em vez do PDF.');
        }
        throw new Error('DOCUMENTO_INVALIDO');
      }

      response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Aqui está o texto extraído da fatura:\n\n${text}` }
        ],
        response_format: { type: "json_object" }
      });
    } else {
      const base64Image = fileBuffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Image}`;

      response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: [{ type: 'image_url', image_url: { url: dataUrl, detail: 'high' } }] }
        ],
        response_format: { type: "json_object" }
      });
    }

    const content = response.choices[0].message.content;
    if (content) {
      const parsed = JSON.parse(content);
      
      const parseNumberSafe = (val: any) => {
        if (val === null || val === undefined) return 0;
        if (typeof val === 'number') return val;
        // Remove currency symbols, spaces, and replace comma with dot
        const cleaned = val.toString().replace(/[^\d.,]/g, '').replace(',', '.');
        return parseFloat(cleaned) || 0;
      };

      const electricityCostEuros = parseNumberSafe(parsed.electricityCostEuros || parsed.currentCostEuros);
      const electricityConsumptionKWh = Math.round(parseNumberSafe(parsed.electricityConsumptionKWh || parsed.monthlyConsumptionKWh));
      const gasCostEuros = parseNumberSafe(parsed.gasCostEuros);
      const gasConsumptionKWh = Math.round(parseNumberSafe(parsed.gasConsumptionKWh));

      // Force energy invoice if we found any costs or if the AI said it is.
      const isEnergy = parsed.isEnergyInvoice === true || electricityCostEuros > 0 || gasCostEuros > 0;

      // Se é energia e não declarou gás, e encontrou consumo de luz, forçamos luz.
      let hasElec = parsed.hasElectricity === true || electricityCostEuros > 0 || electricityConsumptionKWh > 0;
      let hasGas = parsed.hasGas === true || gasCostEuros > 0 || gasConsumptionKWh > 0;

      return {
        supplier: parsed.supplier || parsed.currentSupplier || 'Desconhecido',
        isEnergyInvoice: isEnergy,
        hasElectricity: hasElec,
        powerKVA: parseFloat(parsed.powerKVA) || 3.45,
        electricityConsumptionKWh: electricityConsumptionKWh,
        electricityCostEuros: electricityCostEuros,
        cycleType: parsed.cycleType || 'simples',
        
        hasGas: hasGas,
        gasConsumptionKWh: gasConsumptionKWh,
        gasEscalao: parseInt(parsed.gasEscalao) || 1,
        gasCostEuros: gasCostEuros
      } as any;
    }
    
    throw new Error('Sem resposta da IA');
  } catch (error: any) {
    console.error('Error calling OpenAI API:', error);
    if (error.message === 'DOCUMENTO_INVALIDO') {
      throw new Error('O ficheiro enviado não é um PDF válido ou está corrompido. Por favor, tente enviar uma fotografia da sua fatura.');
    }
    if (error.message.includes('documento digitalizado')) {
      throw error;
    }
    throw new Error('Falha na extração de dados da fatura. Verifique a chave da API e a ligação.');
  }
};
