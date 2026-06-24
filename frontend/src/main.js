import './style.css'

document.addEventListener('DOMContentLoaded', () => {
  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const href = this.getAttribute('href');
      if (href === '#') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Header scroll effect
  const header = document.querySelector('.main-header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
  }

  // --- FUNIL AUDITORIA GRATUITA ---
  let selectedEnergyType = 'luz';
  let selectedTier = '';
  let currentLeadPhone = ''; // To link premium upload with lead

  // Energy Selection
  const energyBtns = document.querySelectorAll('.btn-toggle');
  energyBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      energyBtns.forEach(b => {
        b.classList.remove('active');
        b.style.borderColor = '#e2e8f0';
        b.style.backgroundColor = 'white';
        b.style.color = '#718096';
      });
      const target = e.target;
      target.classList.add('active');
      target.style.borderColor = '#0288D1';
      target.style.backgroundColor = 'rgba(2,136,209,0.05)';
      target.style.color = '#0288D1';
      selectedEnergyType = target.getAttribute('data-type');
    });
  });

  // Tier Selection
  const tierBtns = document.querySelectorAll('.btn-tier');
  tierBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      tierBtns.forEach(b => {
        b.classList.remove('active');
        b.style.borderColor = '#e2e8f0';
        b.style.backgroundColor = 'white';
        b.style.color = '#718096';
      });
      const target = e.target;
      target.classList.add('active');
      target.style.borderColor = '#0288D1';
      target.style.backgroundColor = 'rgba(2,136,209,0.05)';
      target.style.color = '#0288D1';
      selectedTier = target.getAttribute('data-tier');
    });
  });

  const btnCalcSavings = document.getElementById('btn-calc-savings');
  const step1 = document.getElementById('sim-step-1');
  const step2 = document.getElementById('sim-step-2');
  const step3 = document.getElementById('sim-step-3');

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  // Go to Lead Capture
  if (btnCalcSavings) {
    btnCalcSavings.addEventListener('click', () => {
      if (!selectedTier) {
        alert('Por favor, indique quanto paga em média por mês.');
        return;
      }

      btnCalcSavings.innerHTML = 'A analisar...';
      btnCalcSavings.disabled = true;

      setTimeout(() => {
        step1.style.display = 'none';
        step2.style.display = 'block';
      }, 800);
    });
  }

  // Submit Lead
  const btnSubmitLead = document.getElementById('btn-submit-lead');
  if (btnSubmitLead) {
    btnSubmitLead.addEventListener('click', async () => {
      const name = document.getElementById('lead-name').value;
      const email = document.getElementById('lead-email').value;
      const phone = document.getElementById('lead-phone').value;

      if (!name || !phone) {
        alert('Por favor, preencha pelo menos o seu nome e telefone.');
        return;
      }

      btnSubmitLead.innerHTML = 'A enviar...';
      btnSubmitLead.disabled = true;
      currentLeadPhone = phone;

      try {
        const response = await fetch(`${API_BASE_URL}/leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name, email, phone,
            energy_type: selectedEnergyType,
            cost_tier: selectedTier, // Using tier now
            has_invoice: false
          })
        });

        if (response.ok) {
          step2.style.display = 'none';
          step3.style.display = 'block';
        } else {
          throw new Error('Erro ao enviar pedido.');
        }
      } catch (error) {
        alert('Erro de comunicação. Por favor, tente novamente.');
        btnSubmitLead.disabled = false;
        btnSubmitLead.innerHTML = '🟢 Receber Análise Gratuita';
      }
    });
  }

  // Premium Upsell - Upload Fatura
  const premiumUploadZone = document.getElementById('premium-upload-zone');
  const premiumFileInput = document.getElementById('premium-file-input');
  const premiumUploadSuccess = document.getElementById('premium-upload-success');
  const btnSkipUpload = document.getElementById('btn-skip-upload');

  if (premiumUploadZone && premiumFileInput) {
    premiumUploadZone.addEventListener('click', () => premiumFileInput.click());

    // Drag and Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      premiumUploadZone.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      premiumUploadZone.addEventListener(eventName, () => {
        premiumUploadZone.style.borderColor = '#0288D1';
        premiumUploadZone.style.backgroundColor = 'rgba(2,136,209,0.05)';
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      premiumUploadZone.addEventListener(eventName, () => {
        premiumUploadZone.style.borderColor = '#cbd5e1';
        premiumUploadZone.style.backgroundColor = 'white';
      }, false);
    });

    premiumUploadZone.addEventListener('drop', e => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) handlePremiumUpload(files[0]);
    });

    premiumFileInput.addEventListener('change', e => {
      if (e.target.files.length > 0) handlePremiumUpload(e.target.files[0]);
    });
  }

  async function handlePremiumUpload(file) {
    premiumUploadZone.style.opacity = '0.5';
    premiumUploadZone.style.pointerEvents = 'none';
    
    // Upload file to backend attached to the lead phone
    const formData = new FormData();
    formData.append('phone', currentLeadPhone);
    formData.append('has_invoice', 'true');
    formData.append('invoice', file);

    try {
      const response = await fetch(`${API_BASE_URL}/leads/invoice`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        premiumUploadZone.style.display = 'none';
        btnSkipUpload.style.display = 'none';
        premiumUploadSuccess.style.display = 'block';
      } else {
        throw new Error('Falha ao anexar fatura');
      }
    } catch (error) {
      alert('Erro ao carregar a fatura. Tente novamente mais tarde.');
      premiumUploadZone.style.opacity = '1';
      premiumUploadZone.style.pointerEvents = 'auto';
    }
  }

  if (btnSkipUpload) {
    btnSkipUpload.addEventListener('click', () => {
      premiumUploadZone.style.display = 'none';
      btnSkipUpload.style.display = 'none';
      premiumUploadSuccess.textContent = 'Sem problema! O nosso consultor entrará em contacto consigo.';
      premiumUploadSuccess.style.color = '#718096';
      premiumUploadSuccess.style.display = 'block';
    });
  }

  // --- Google Analytics Consent Update ---
  const grantAnalyticsConsent = () => {
    if(typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        'ad_storage': 'granted',
        'analytics_storage': 'granted'
      });
    }
  };

  // --- Cookie Banner Logic ---
  const cookieBanner = document.getElementById('cookieBanner');
  const currentConsent = localStorage.getItem('cookieConsent');

  // Se já tinha aceite antes, informa a Google
  if (currentConsent === 'all') {
    grantAnalyticsConsent();
  }

  if (cookieBanner && !currentConsent) {
    setTimeout(() => { cookieBanner.classList.add('show'); }, 1500);
  }

  const hideCookieBanner = (consentType) => {
    localStorage.setItem('cookieConsent', consentType);
    if(cookieBanner) cookieBanner.classList.remove('show');
    
    // Se a pessoa clicar em 'Aceitar Todos', enviamos o OK para a Google
    if (consentType === 'all') {
      grantAnalyticsConsent();
    }
  };

  document.getElementById('btnCookieEssential')?.addEventListener('click', () => hideCookieBanner('essential'));
  document.getElementById('btnCookieAccept')?.addEventListener('click', () => hideCookieBanner('all'));

});
