const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const fs = require('fs');

const router = express.Router();

// Configuração do Multer para guardar temporariamente os uploads
const upload = multer({ dest: 'uploads/' });

// Configuração do Nodemailer (SMTP)
// NOTA: Colocar as credenciais reais no .env
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: process.env.SMTP_PORT || 2525,
  auth: {
    user: process.env.SMTP_USER || 'user',
    pass: process.env.SMTP_PASS || 'pass',
  },
});

function calculateLeadScore(costTier, energyType) {
  if (costTier === 'mais200' || energyType === 'ambos') return 'MAX';
  if (costTier === '100-200') return 'HOT';
  return 'NORMAL';
}

// Helper: Enviar Fatura por Email silenciosamente para a equipa
async function sendInvoiceByEmail(leadData, files) {
  try {
    const mailOptions = {
      from: '"Energia Top Bot" <bot@energiatop.pt>',
      to: process.env.SALES_TEAM_EMAIL || 'vendas@energiatop.pt',
      subject: `[LEAD FATURA] Nova fatura recebida (Upload Premium)`,
      text: `Recebemos uma nova fatura Premium!\n\nTelefone Associado: ${leadData.phone}\nScore Estimado: ${leadData.lead_score}\n\nFaturas em anexo.`,
      attachments: []
    };

    if (files && files.length > 0) {
      for (const file of files) {
        mailOptions.attachments.push({
          filename: file.originalname,
          path: file.path
        });
      }
    }

    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Faturas (Premium) associadas ao telefone ${leadData.phone} enviadas com sucesso.`);
    
    // Clean up temporary files
    if (files && files.length > 0) {
      for (const file of files) {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }
  } catch (error) {
    console.error('[EMAIL ERROR] Falha ao enviar email com fatura:', error);
  }
}

// Integração com Evolution API
const EVOLUTION_URL = process.env.EVOLUTION_URL || 'https://evolution.topconsultores.pt';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'Whats';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const TARGET_WHATSAPP = process.env.TARGET_WHATSAPP || '351927327978';

// Helper: Disparo direto de WhatsApp (Evolution API)
async function sendLeadToWhatsApp(leadData, files = null) {
  try {
    console.log(`[WHATSAPP] A enviar mensagem para ${TARGET_WHATSAPP} sobre a lead ${leadData.name || leadData.phone}...`);
    
    // Construção da mensagem
    let message = `*NOVA LEAD CAPTURADA (Análise Gratuita)*\n\n`;
    if (leadData.name) message += `👤 Nome: ${leadData.name}\n`;
    message += `📞 Telefone do Cliente: ${leadData.phone}\n`;
    if (leadData.email) message += `📧 Email: ${leadData.email}\n`;
    if (leadData.energy_type) message += `⚡ Tipo: ${leadData.energy_type}\n`;
    if (leadData.cost_tier) message += `💰 Escalão: ${leadData.cost_tier}\n`;
    message += `🔥 Score: ${leadData.lead_score}`;

    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64Data = fs.readFileSync(file.path, { encoding: 'base64' });

        const payload = {
          number: TARGET_WHATSAPP,
          mediatype: "document",
          fileName: file.originalname || `fatura_${i+1}.pdf`,
          caption: i === 0 ? message : "", // Attach caption to first file only
          media: base64Data
        };

        const response = await fetch(`${EVOLUTION_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY
          },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        console.log(`[WHATSAPP] Fatura ${i+1} enviada via Evolution API:`, data);
      }
    } else {
      // Envio Apenas de Texto
      const response = await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        },
        body: JSON.stringify({
          number: TARGET_WHATSAPP,
          text: message
        })
      });
      const data = await response.json();
      console.log(`[WHATSAPP] Mensagem de texto enviada via Evolution API:`, data);
    }
  } catch (error) {
    console.error('[WHATSAPP ERROR] Falha ao enviar notificação WhatsApp:', error);
  }
}

// Passo Único: Receção Consolidada da Lead e Fatura
router.post('/leads', upload.array('invoice', 5), async (req, res) => {
  try {
    const { name, email, phone, energy_type, cost_tier } = req.body;
    const files = req.files;
    
    const hasInvoice = files && files.length > 0;
    const leadScore = hasInvoice ? 'PREMIUM_ANALYSIS' : calculateLeadScore(cost_tier, energy_type);

    const newLead = {
      name, email, phone, energy_type, cost_tier,
      has_invoice: hasInvoice,
      invoice_filenames: hasInvoice ? files.map(f => f.originalname).join(', ') : null,
      lead_score: leadScore,
      created_at: new Date().toISOString()
    };

    // 1. Guardar no Supabase (MOCK)
    console.log(`[SUPABASE] Lead guardada na BD. Faturas anexadas: ${hasInvoice ? files.length : 0}`);

    // 2. Enviar Fatura por E-mail para a Equipa (apenas se tiver fatura)
    if (hasInvoice) {
      await sendInvoiceByEmail(newLead, files);
    }

    // 3. Disparar WhatsApp diretamente (com anexos, se houver)
    await sendLeadToWhatsApp(newLead, files);

    return res.status(200).json({ success: true, lead: newLead });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Erro ao processar lead.' });
  }
});

module.exports = router;
