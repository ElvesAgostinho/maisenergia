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

  // --- FUNIL ANÁLISE GRATUITA ---
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
        step1.style.transition = 'all 0.3s ease';
        step1.style.opacity = '0';
        step1.style.transform = 'translateY(-10px)';
        setTimeout(() => {
          step1.style.display = 'none';
          step2.style.display = 'block';
          step2.style.opacity = '0';
          step2.style.transform = 'translateY(10px)';
          step2.style.transition = 'all 0.4s ease';
          // Force reflow
          void step2.offsetWidth;
          step2.style.opacity = '1';
          step2.style.transform = 'translateY(0)';
        }, 300);
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
      const consent = document.getElementById('lead-consent').checked;

      if (!name || !phone) {
        alert('Por favor, preencha pelo menos o seu nome e telefone.');
        return;
      }
      if (!consent) {
        alert('Por favor, aceite a Política de Privacidade e os Termos e Condições para continuar.');
        return;
      }

      // Guardar os dados temporariamente
      currentLeadPhone = phone;
      window.pendingLeadData = { name, email, phone, energy_type: selectedEnergyType, cost_tier: selectedTier };

      // Transitar para o Passo 3 (sem fazer fetch)
      step2.style.transition = 'all 0.3s ease';
      step2.style.opacity = '0';
      step2.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        step2.style.display = 'none';
        step3.style.display = 'block';
        step3.style.opacity = '0';
        step3.style.transform = 'translateY(10px)';
        step3.style.transition = 'all 0.4s ease';
        void step3.offsetWidth;
        step3.style.opacity = '1';
        step3.style.transform = 'translateY(0)';
      }, 300);
    });
  }

  // Lógica Única de Submissão (Passo 3)
  async function submitFinalLead(files = null) {
    if (!window.pendingLeadData) return;

    const btnSkip = document.getElementById('btn-skip-upload');
    const uploadZone = document.getElementById('premium-upload-zone');
    
    // UI Loading state
    if (uploadZone) {
      uploadZone.style.opacity = '0.5';
      uploadZone.style.pointerEvents = 'none';
    }
    if (btnSkip) btnSkip.innerHTML = 'A enviar...';

    const formData = new FormData();
    formData.append('name', window.pendingLeadData.name);
    formData.append('email', window.pendingLeadData.email);
    formData.append('phone', window.pendingLeadData.phone);
    formData.append('energy_type', window.pendingLeadData.energy_type);
    formData.append('cost_tier', window.pendingLeadData.cost_tier);

    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        formData.append('invoice', files[i]);
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/leads`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        if (uploadZone) uploadZone.style.display = 'none';
        if (btnSkip) btnSkip.style.display = 'none';
        
        const successMsg = document.getElementById('premium-upload-success');
        if (successMsg) {
          if (files && files.length > 0) {
            successMsg.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 0.2rem;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Tudo Certo! Dados e ${files.length} fatura(s) recebidos!`;
          } else {
            successMsg.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 0.2rem;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Tudo Certo! Dados recebidos com sucesso!`;
          }
          successMsg.style.display = 'block';
        }
      } else {
        throw new Error('Falha ao enviar dados.');
      }
    } catch (error) {
      alert('Erro de comunicação. Por favor, verifique a sua ligação ou tente novamente mais tarde.');
      if (uploadZone) {
        uploadZone.style.opacity = '1';
        uploadZone.style.pointerEvents = 'auto';
      }
      if (btnSkip) btnSkip.innerHTML = 'Não tenho a fatura comigo agora';
    }
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
      if (files.length > 0) submitFinalLead(files);
    });

    premiumFileInput.addEventListener('change', e => {
      if (e.target.files.length > 0) submitFinalLead(e.target.files);
    });
  }

  if (btnSkipUpload) {
    btnSkipUpload.addEventListener('click', (e) => {
      e.preventDefault();
      submitFinalLead(null);
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

  // Legal Modal Logic
  const legalLinks = document.querySelectorAll('a[href*="privacidade.html"], a[href*="termos.html"], a[href*="cookies.html"]');
  const legalModal = document.getElementById('legalModal');
  const legalModalContent = document.getElementById('legalModalContent');
  const closeLegalModal = document.getElementById('closeLegalModal');

  if (legalModal && closeLegalModal) {
    legalLinks.forEach(link => {
      link.removeAttribute('target');
      link.addEventListener('click', (e) => {
        e.preventDefault();
        legalModal.style.display = 'flex';
        const url = link.getAttribute('href');
        let contentId = '';
        if (url.includes('privacidade')) contentId = 'content-privacidade';
        else if (url.includes('termos')) contentId = 'content-termos';
        else if (url.includes('cookies')) contentId = 'content-cookies';
        
        const contentDiv = document.getElementById(contentId);
        if (contentDiv) {
          legalModalContent.innerHTML = contentDiv.innerHTML;
        } else {
          legalModalContent.innerHTML = '<p>Erro ao carregar o conteúdo.</p>';
        }
      });
    });

    closeLegalModal.addEventListener('click', () => {
      legalModal.style.display = 'none';
    });

    legalModal.addEventListener('click', (e) => {
      if (e.target === legalModal) {
        legalModal.style.display = 'none';
      }
    });
  }

});
