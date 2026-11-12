/* ==========================================================================
   CONFIGURAÇÃO DO CONVITE
   --------------------------------------------------------------------------
   Este é o ÚNICO arquivo que você precisa editar para personalizar o convite:
   nomes, data, locais, programação, traje, presentes (PIX), confirmação de
   presença (RSVP) e música. Salve, faça commit e o GitHub Pages atualiza.

   Dica: links personalizados por convidado
     https://SEU-USUARIO.github.io/convite-casamento/?para=Tia%20Maria
     https://SEU-USUARIO.github.io/convite-casamento/?para=Família%20Silva&max=4
   O nome aparece no envelope e já vem preenchido no formulário; "max" limita
   o número de pessoas daquele convite. Use a página links.html para gerar.
   ========================================================================== */

window.CONVITE = {
  noivos: {
    primeiro: { nome: 'Heron', completo: 'Heron de Souza' },
    segundo: { nome: 'Daniela', completo: 'Daniela Medina' }
  },

  /* Data/hora da cerimônia no formato ISO, com o fuso (-03:00 = Brasília).
     ⚠ Data de exemplo — troque pela data real. */
  data: '2027-06-12T16:30:00-03:00',
  fuso: 'America/Sao_Paulo',
  duracaoHoras: 8, // usado no "adicionar à agenda"

  cidade: 'Cidade · UF',

  textos: {
    chamada: 'Vamos nos casar',
    convite:
      'Junto com nossas famílias, temos a alegria de convidar você para celebrar o nosso casamento.',
    envelopePara: 'você', // usado quando o link não tem ?para=
    envelopeNota: 'com todo o nosso carinho',
    fraseFinal: 'Que este seja o começo de todos os nossos para sempre.'
  },

  cerimonia: {
    nome: 'Capela do Bosque',
    endereco: 'Estrada do Bosque, 1000 — Bairro, Cidade · UF',
    horario: '16h30',
    mapaUrl: '' // opcional: link do Google Maps. Vazio = gerado pelo endereço
  },

  /* Coloque `recepcao: null` se a festa for no mesmo lugar da cerimônia. */
  recepcao: {
    nome: 'Salão das Araucárias',
    endereco: 'Estrada do Bosque, 1000 — Bairro, Cidade · UF',
    horario: '18h00',
    mapaUrl: ''
  },

  programacao: [
    { hora: '16h00', titulo: 'Chegada dos convidados', texto: 'Recepção no bosque, com música ao vivo.' },
    { hora: '16h30', titulo: 'Cerimônia', texto: 'O momento do nosso “sim”. Chegue com antecedência!' },
    { hora: '17h30', titulo: 'Brinde & fotos', texto: 'Abraços, fotos e um brinde ao entardecer.' },
    { hora: '19h00', titulo: 'Jantar', texto: 'Uma mesa farta para celebrarmos juntos.' },
    { hora: '20h30', titulo: 'Festa', texto: 'Primeira dança e pista aberta até tarde.' }
  ],

  traje: {
    nome: 'Esporte fino',
    texto: 'Inspirado nas cores do nosso dia: azul-noite, névoa, lavanda e verde-sálvia.',
    cores: [
      { nome: 'Azul-noite', hex: '#1f3350' },
      { nome: 'Ardósia', hex: '#4b5d73' },
      { nome: 'Névoa', hex: '#a9b8c9' },
      { nome: 'Lavanda', hex: '#b4a5c8' },
      { nome: 'Sálvia', hex: '#8f9f8a' },
      { nome: 'Champanhe', hex: '#d9ccb4' }
    ],
    evitar: 'Branco, off-white e tons muito claros ficam reservados à noiva.'
  },

  presentes: {
    texto:
      'Sua presença é o nosso maior presente! Mas, se quiser nos mimar, ficaremos muito felizes com uma contribuição para a nossa nova vida juntos.',
    pix: {
      /* ⚠ Chave de exemplo — troque pela sua.
         Formatos: e-mail, celular (+5511999998888), CPF (só números) ou chave aleatória. */
      chave: 'seu-email@exemplo.com',
      nome: 'Heron de Souza', // nome do recebedor (aparece no app do banco)
      cidade: 'Sao Paulo' // cidade do recebedor
    },
    lista: { url: '', texto: 'Ver lista de presentes' } // opcional: link de lista externa
  },

  rsvp: {
    prazo: '2027-05-12', // data limite para confirmar
    /* Número de WhatsApp que recebe as confirmações: DDI + DDD + número, só dígitos.
       Ex.: '5511999998888'. Enquanto estiver vazio, um aviso aparece no formulário. */
    whatsapp: '',
    /* Opcional: URL de um Google Apps Script para salvar as respostas numa planilha
       (passo a passo no README). Se preenchido, tem prioridade sobre o WhatsApp. */
    googleScriptUrl: '',
    maxPessoas: 4 // máximo de pessoas por confirmação (o link pode sobrescrever com ?max=)
  },

  musica: {
    /* Opcional: caminho de um MP3 seu, ex. 'assets/audio/nossa-musica.mp3'.
       Vazio = uma caixinha de música gerada no navegador (Cânone de Pachelbel). */
    arquivo: '',
    tocarAoAbrir: true
  }
};
