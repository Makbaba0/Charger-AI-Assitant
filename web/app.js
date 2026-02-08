const assistantEl = document.getElementById("assistant");
const assistantSub = document.getElementById("assistantSub");
const statusEl = document.getElementById("status");
const stepsList = document.getElementById("stepsList");
const transcript = document.getElementById("transcript");
const btnStart = document.getElementById("btnStart");
const btnRepeat = document.getElementById("btnRepeat");
const stepCard = document.getElementById("stepCard");
const stepCardTitle = document.getElementById("stepCardTitle");
const stepCardText = document.getElementById("stepCardText");

let config = null;
let recognition = null;
let listening = false;
let stepTimer = null;
let selectedVoice = null;
let currentAudio = null;

const synth = window.speechSynthesis;
let useServerTts = true;
const serverTtsUrl = "http://localhost:5050/api/tts";

const fallbackContent = {
  brand: "Örnek İstasyon Markası",
  steps: [
    "Aracı uygun park alanına park et.",
    "Şarj kablosunu araca tak.",
    "Başlatma yöntemini seç (QR / Uygulama / RFID).",
    "İstasyon ve soketi seç, işlemi başlat.",
    "Ödeme/onay adımını tamamla.",
    "Ekranda ‘Charging / Şarj Ediliyor’ yazısını doğrula."
  ],
  intents: {
    start_charge: [
      "Şarj işlemi, istasyonda hangi yöntemin aktif olduğuna göre değişir. QR, mobil uygulama veya RFID ile başlatabilirsiniz. Şu anda hangisini kullanıyorsunuz?"
    ],
    start_qr: [
      "QR ile başlatma adımları: Aracı park et, kabloyu tak, istasyon üzerindeki QR kodu okut, açılan sayfada istasyonu ve soketi seç, ‘Başlat’a bas, ödeme adımını tamamla. Ekranda ‘Charging / Şarj Ediliyor’ görmelisin. Şu anda ekranda tam olarak ne yazıyor?"
    ],
    start_app: [
      "Mobil uygulama ile: Aracı park et, kabloyu tak, uygulamayı aç, istasyon QR’ını okut veya istasyon numarasını gir, soketi seç, ‘Başlat’a bas, ödeme/onayı tamamla. Şarjın başladığını doğrulamak için ekranda ne görüyorsun?"
    ],
    start_rfid: [
      "RFID ile: Aracı park et, kabloyu tak, RFID kartını okuyucuya okut, istasyondan onay sesi veya ekran bildirimi bekle. Şarjın başladığını doğrulamak için ekranda ne yazıyor?"
    ],
    charge_started_check: [
      "Şarjın başladığını anlamak için şu göstergelerden en az biri olmalı: istasyon ekranında ‘Charging/Şarj Ediliyor’, araç ekranında şarj animasyonu veya şarj göstergesinin artması. Bunlardan hangisini görüyorsun?"
    ],
    not_started: [
      "Kabloyu taktınız ama şarj başlamadıysa şu kontrolleri yapalım: Kablo iki tarafta da tam oturuyor mu? Araç kilidi açık mı? QR/uygulama işlemi tamamlandı mı? İstasyonda hata mesajı var mı? Ekranda tam olarak ne yazıyor?"
    ],
    qr_page_blank: [
      "QR sayfası açılmıyor veya boş geliyorsa bağlantı kaynaklı olabilir. Mobil internet/Wi‑Fi açık mı? Tarayıcıdan başka bir site açılıyor mu? Sayfa tamamen beyaz mı yoksa hata mesajı mı var?"
    ],
    payment_issue: [
      "Ödeme ekranı gelmiyor veya ödeme alınamıyorsa şu kontrolü yapalım: Ödeme sayfası açıldı mı? Kart bilgisi sonrası hata mesajı çıktı mı? Başka bir tarayıcıyla denediniz mi? Ekrandaki hata mesajını aynen yazar mısınız?"
    ],
    stopped: [
      "Şarj yarıda kesildiyse nedenler şunlar olabilir: araç şarjı durdurdu, batarya doldu, ödeme süresi doldu, istasyon güvenlik nedeniyle kesti. Şarj kaç dakika sürdü ve kesildiğinde ekranda ne yazıyordu?"
    ],
    cable_locked: [
      "Kabloyu çıkaramıyorsanız: önce uygulamadan/QR sayfasından şarjı durdurun, aracın kapı kilidini açın, araç ekranında ‘kabloyu serbest bırak’ varsa kullanın, birkaç saniye bekleyip tekrar deneyin. Kabloyu zorlamayın. Şu anda ekranda ne yazıyor?"
    ],
    error_code: [
      "Hata kodu görüyorsanız lütfen kodu aynen yazın. Bu bilgiye göre yönlendirme yapabilirim."
    ],
    ac_dc: [
      "AC şarj daha yavaştır ve uzun süreli parklar içindir. DC (hızlı şarj) çok daha hızlıdır. Süre, aracın desteklediği güce göre değişir."
    ],
    slow_charge: [
      "Şarjın yavaş olmasının yaygın nedenleri: araç yüksek gücü desteklemiyor olabilir, batarya %80 üzerindedir, istasyon gücü sınırlı olabilir, batarya sıcaklığı uygun değildir."
    ],
    leave_car: [
      "Evet, araçtan ayrılabilirsiniz. Ancak park kurallarına uyun ve şarj bittiğinde aracı mümkün olan en kısa sürede çekin."
    ],
    pricing: [
      "Ücretlendirme kWh başına, dakika başına veya sabit oturum ücreti olabilir. Geçerli tarifeler QR sayfasında veya uygulamada görünür."
    ],
    invoice: [
      "Fatura/fiş genelde mobil uygulama → Geçmiş işlemler veya Profil → Ödemeler bölümünden indirilebilir. Şarjı hangi yöntemle başlattınız? (QR / Uygulama / RFID)"
    ],
    multi_charge: [
      "Bu istasyonun kapasitesine bağlıdır. Bazı istasyonlarda iki soket aynı anda çalışır ve güç paylaşımı yapılır."
    ],
    occupied_socket: [
      "Hayır. Soket doluysa mevcut şarjın bitmesini beklemek gerekir."
    ],
    charge_duration: [
      "Süre; batarya kapasitesi, mevcut doluluk, istasyon gücü ve aracın desteklediği maksimum güce bağlıdır."
    ],
    safety: [
      "Güvenlik uyarıları: Hasarlı kabloyu kullanmayın, kabloyu zorlamayın, yağmur altında fiş girişini zorlamayın, çocukların kabloyla oynamasına izin vermeyin."
    ],
    support: [
      "Çözüm olmazsa istasyon üzerindeki destek hattını arayın veya destek QR bağlantısından canlı destek talebi oluşturun."
    ],
    critical_questions: [
      "Sorunu netleştirelim: Şarjı hangi yöntemle başlatıyorsun? Şu anda hangi ekrandasın? Ekranda tam olarak ne yazıyor? Hata kodu var mı? Kabloyu taktıktan sonra ne yaptın?"
    ],
    greeting: [
      "Merhaba! {brand} şarj istasyonunda size yardımcı olabilirim."
    ],
    how_are_you: [
      "İyiyim, teşekkür ederim. Şarj işlemini başlatmanız için buradayım."
    ],
    help: [
      "Şarj başlatma, QR, uygulama, RFID, ödeme, hata kodları ve güvenlik konularında yardımcı olabilirim. Sorununuzu kısaca anlatır mısınız?"
    ],
    fallback: [
      "Bu konuda yardımcı olamıyorum. Şarj başlatma ile ilgili bir soru sorabilir misiniz?"
    ]
  }
};

const intentSteps = {
  start_charge: 3,
  start_qr: 3,
  start_app: 3,
  start_rfid: 3,
  not_started: 2,
  qr_page_blank: 3,
  payment_issue: 5,
  stopped: 6,
  cable_locked: 2,
  pricing: 5,
  invoice: 5
};

function setStatus(text) {
  statusEl.textContent = text;
}

function setIdleState() {
  listening = false;
  setStatus("Hazır");
  assistantSub.textContent = "Dinlemek için mikrofonu başlatın";
}

function addBubble(text, who = "bot") {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${who}`;
  bubble.textContent = text;
  transcript.appendChild(bubble);
  transcript.scrollTop = transcript.scrollHeight;
}

function setTalking(isTalking) {
  assistantEl.classList.toggle("talking", isTalking);
}

function selectBestTurkishVoice() {
  if (!synth) return null;
  const voices = synth.getVoices();
  if (!voices || !voices.length) return null;

  const trVoices = voices.filter((v) => {
    const lang = (v.lang || "").toLowerCase();
    return lang.startsWith("tr") || lang.includes("tr-");
  });

  if (trVoices.length === 0) return null;

  const preferred = trVoices.find((v) => /google|natural|enhanced/i.test(v.name)) || trVoices[0];
  return preferred;
}

function initVoice() {
  selectedVoice = selectBestTurkishVoice();
  if (!selectedVoice) {
    synth.onvoiceschanged = () => {
      selectedVoice = selectBestTurkishVoice();
    };
  }
}

async function speakServer(text) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  const response = await fetch(serverTtsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`TTS request failed: ${response.status} ${detail}`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = audio;
  return new Promise((resolve) => {
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.play();
  });
}

async function checkServerTts() {
  try {
    const res = await fetch(serverTtsUrl, { method: "GET" });
    if (!res.ok) throw new Error("Health check failed");
    const data = await res.json();
    if (data && data.ok) {
      useServerTts = true;
      assistantSub.textContent = "ElevenLabs TTS hazır";
      return;
    }
    throw new Error("Health check not ok");
  } catch (err) {
    useServerTts = false;
    addBubble("Sunucu TTS devreye alınamadı. Yerel ses kullanılacak.", "bot");
  }
}
function speakLocal(text) {
  if (!text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "tr-TR";
  utterance.rate = 0.98;
  utterance.pitch = 1.02;
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }
  utterance.onstart = () => {
    setTalking(true);
    setStatus("Konuşuyor (ElevenLabs)");
  };
  utterance.onend = () => {
    setTalking(false);
    setIdleState();
  };
  synth.speak(utterance);
  addBubble(text, "bot");
}

async function speak(text) {
  if (!text) return;
  addBubble(text, "bot");
  if (useServerTts) {
    try {
      setTalking(true);
      setStatus("Konuşuyor (ElevenLabs)");
      await speakServer(text);
    } catch (err) {
      console.error('Server TTS failed', err);
      addBubble('Sunucu TTS başarısız. Yerel ses kullanılıyor.', 'bot');
      speakLocal(text);
      return;
    } finally {
      setTalking(false);
      setIdleState();
    }
    return;
  }
  speakLocal(text);
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function resolveIntent(text) {
  const t = text.toLowerCase();
  const has = (re) => re.test(t);

  if (has(/şarj\s*(işlemi)?\s*nasıl\s*başlat(?:ırım|irim|ılır|ilir|acağım|acagim)|şarj\s*başlat/i)) {
    return "start_charge";
  }

  if (has(/\bhata kodu\b|error code|e\d{2,}/i)) return "error_code";

  if (has(/\bqr\b|qr kod|qr ile|qr okut|qr okuttum|kod okuttum/i)) {
    if (has(/açılmadı|açılmıyor|boş sayfa|sayfa açılmadı|boş geldi/i)) return "qr_page_blank";
    return "start_qr";
  }

  if (has(/rfid|kartla|kart ile/i)) return "start_rfid";
  if (has(/uygulama|mobil uygulama|app|uygulamadan/i)) return "start_app";

  if (has(/şarj (başladı mı|başladı|başladığını)|nasıl anlarım|charging/i)) return "charge_started_check";
  if (has(/kabloyu çıkaramıyorum|kablo çıkmıyor|kilitli kaldı|sıkıştı/i)) return "cable_locked";
  if (has(/yarıda kesildi|aniden durdu|şarj durdu|koptu|kesildi/i)) return "stopped";

  if (has(/ödeme/i)) {
    if (has(/gelmedi|alınmadı|alınamadı|hata|problem|sorun|başarısız/i)) return "payment_issue";
    return "pricing";
  }

  if (has(/ücret|fiyat|tarife|\bkwh\b|kilovat|dakika başına|dakika/i)) return "pricing";

  if (has(/başlamıyor|başlamadı|şarj başlamıyor|kabloyu taktım ama|çalışmıyor/i)) return "not_started";

  if (has(/ac\s*şarj|dc\s*şarj|ac\s*\/\s*dc|hızlı şarj|farkı nedir/i)) return "ac_dc";
  if (has(/yavaş|neden yavaş|yavaş şarj/i)) return "slow_charge";
  if (has(/araçtan ayrılabilir|aracımı bırakabilir|park|bırakabilir miyim/i)) return "leave_car";
  if (has(/fatura|fiş|makbuz/i)) return "invoice";
  if (has(/aynı anda|birden fazla araç|iki araç/i)) return "multi_charge";
  if (has(/başkasının soketi|soket dolu|dolu soket/i)) return "occupied_socket";
  if (has(/ne kadar sürer|şarj süresi|kaç dakika/i)) return "charge_duration";
  if (has(/güvenlik|uyarı|tehlike/i)) return "safety";
  if (has(/destek|müşteri hizmetleri|yardım hattı/i)) return "support";
  if (has(/yardım|tekrar|anlamadım/i)) return "help";
  if (has(/merhaba|selam|günaydın|iyi akşamlar|iyi günler/i)) return "greeting";
  if (has(/nasılsın|iyi misin|naber|ne haber/i)) return "how_are_you";

  return "fallback";
}

function clearStepHighlight() {
  Array.from(stepsList.children).forEach((li) => li.classList.remove("active"));
}

function showStepCard(stepIndex, reason) {
  if (!config || !config.steps || !config.steps[stepIndex - 1]) return;
  if (stepTimer) window.clearTimeout(stepTimer);

  clearStepHighlight();
  const li = stepsList.children[stepIndex - 1];
  if (li) li.classList.add("active");

  stepCardTitle.textContent = `Adım ${stepIndex}`;
  stepCardText.textContent = config.steps[stepIndex - 1];
  stepCard.classList.remove("show");
  void stepCard.offsetWidth;
  stepCard.classList.add("show");

  if (reason) {
    assistantSub.textContent = reason;
  }

  stepTimer = window.setTimeout(() => {
    stepCard.classList.remove("show");
  }, 5000);
}

function handleIntent(intent) {
  if (!config) return;
  const brand = config.brand || "İstasyon";
  const responses = config.intents[intent] || config.intents.fallback;
  const raw = pickRandom(responses).replace("{brand}", brand);
  speak(raw);

  const stepIndex = intentSteps[intent];
  if (stepIndex) {
    showStepCard(stepIndex, "İlgili adım vurgulandı");
  }
}

function startListening() {
  if (synth && synth.speaking) {
    synth.cancel();
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (!recognition) return;
  if (listening) return;
  try {
    recognition.start();
  } catch (err) {
    addBubble("Dinleme başlatılamadı. Lütfen tekrar deneyin.");
    return;
  }
  listening = true;
  setStatus("Dinliyor");
  assistantSub.textContent = "Sizi dinliyorum...";
}

function initRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    addBubble("Bu tarayıcı sesli girişi desteklemiyor.");
    btnStart.disabled = true;
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "tr-TR";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    addBubble(text, "user");
    const intent = resolveIntent(text);
    handleIntent(intent);
  };

  recognition.onerror = () => {
    addBubble("Ses algılanamadı. Lütfen tekrar deneyin.");
    setIdleState();
  };

  recognition.onend = () => {
    if (listening) {
      setIdleState();
    }
  };
}

function loadContent() {
  const applyContent = (data) => {
    config = data;
    stepsList.innerHTML = "";
    data.steps.forEach((step) => {
      const li = document.createElement("li");
      li.textContent = step;
      stepsList.appendChild(li);
    });
    assistantSub.textContent = `${data.brand} için hazırım`;
  };

  if (window.location.protocol === "file:") {
    applyContent(fallbackContent);
    return;
  }

  fetch("content.json")
    .then((res) => {
      if (!res.ok) throw new Error("Content load failed");
      return res.json();
    })
    .then((data) => applyContent(data))
    .catch(() => applyContent(fallbackContent));
}

btnStart.addEventListener("click", startListening);
btnRepeat.addEventListener("click", () => {
  if (!config) return;
  speak(config.steps.join(" "));
});

loadContent();
initRecognition();
initVoice();
checkServerTts();












