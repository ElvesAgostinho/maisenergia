const FormData = require('form-data');
const fetch = require('node-fetch');

async function runTest() {
  console.log('Gerando Imagem falsa...');
  // A simple 1x1 transparent png
  const imgData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

  console.log('Enviando para a API...');
  const form = new FormData();
  form.append('invoice', imgData, {
    filename: 'fatura_teste.png',
    contentType: 'image/png',
  });

  try {
    const res = await fetch('http://localhost:3000/api/analyze-invoice', {
      method: 'POST',
      body: form,
    });
    
    const data = await res.json();
    console.log('Status HTTP:', res.status);
    console.log('Resposta da API:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Erro na chamada HTTP:', err);
  }
}

runTest();
