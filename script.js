const ENGLISH_JSON_URLS = [
  // Primary: GitHub raw JSON (object map: {word: 1, ...})
  "https://raw.githubusercontent.com/dwyl/english-words/master/words_dictionary.json",
  // Backup CDN mirror for reliability
  "https://cdn.jsdelivr.net/gh/dwyl/english-words@master/words_dictionary.json"
];
const WOOREEMALSAM_API_URL = "https://opendict.korean.go.kr/api/search";
const WOOREEMALSAM_API_KEY = "6AE9523A98D73BD9B682C6EA3D1E5C1C";
const THEME_SPRITE_IMAGE = "./알파벳.jpeg";

const LEVEL_COUNT = 100;
const LEVEL_DURATION = 90;
const PASS_ACCURACY = 80;
const GAME_MODES = {
  KO: "ko",
  EN: "en",
  MIX: "mix"
};
const STORAGE_KEYS = {
  lastLevelByMode: "typingGame:lastCompletedLevelByMode",
  vocab: "typingGame:vocabBook",
  playTime: "typingGame:playTimeSeconds"
};

function safeGetStorage(key, fallback = null) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch (err) {
    return fallback;
  }
}

function safeSetStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    // Ignore storage errors (private mode / blocked storage)
  }
}

/** 레벨 1 기준 15개; 2~10레벨마다 +1, 11~30마다 +2, 31~50마다 +3, 51~마다 +4 */
function calculateTotalWords(level) {
  let total = 15;
  for (let i = 2; i <= level; i++) {
    if (i <= 10) total += 1;
    else if (i <= 30) total += 2;
    else if (i <= 50) total += 3;
    else total += 4;
  }
  return total;
}

/**
 * 게임 실행에 필요한 세부 설정을 반환하는 함수
 * @param {number} level - 현재 게임 레벨
 */
function getGameSettings(level) {
  const totalWords =
    state.running && state.roundTotalWords != null ? state.roundTotalWords : calculateTotalWords(level);
  const safeTotal = Math.max(1, totalWords);
  return {
    totalWords,
    spawnInterval: (LEVEL_DURATION / safeTotal) * 1000,
    wordsPerSecond: (totalWords / LEVEL_DURATION).toFixed(2)
  };
}

/**
 * 아동 보호를 위한 시간 제약 로직
 */
let playTimeSeconds = Number(safeGetStorage(STORAGE_KEYS.playTime, "0") || 0);
const MAX_PLAY_TIME = 30 * 60;
let playTimerId = null;

function trackPlayTime() {
  if (playTimerId) return;
  playTimerId = setInterval(() => {
    playTimeSeconds++;
    safeSetStorage(STORAGE_KEYS.playTime, String(playTimeSeconds));
    if (playTimeSeconds >= MAX_PLAY_TIME) {
      clearInterval(playTimerId);
      playTimerId = null;
      alert("눈 보호를 위해 잠시 쉴 시간이에요! 10분 후에 다시 만나요.");
      window.location.reload();
    }
  }, 1000);
}

function stopPlayTimeTracking() {
  if (!playTimerId) return;
  clearInterval(playTimerId);
  playTimerId = null;
}

const fallbackEnglishWords = [
  "cat", "dog", "apple", "banana", "sun", "moon", "book", "tree",
  "flower", "happy", "school", "friend", "picture", "computer", "butterfly",
  "adventure", "elephant", "strawberry", "rainbow", "dictionary"
];

const LEVEL_WORD_GROUPS = [
  {
    id: 1,
    minLevel: 1,
    maxLevel: 25,
    english: [
      "apple", "ant", "ball", "banana", "bear", "bee", "bird", "book", "box", "boy", "bus", "cake", "car", "cat",
      "chair", "clock", "cloud", "cow", "cup", "day", "dog", "door", "duck", "egg", "eye", "fish", "flower", "frog",
      "game", "girl", "goat", "green", "hat", "head", "home", "house", "ice", "jump", "kite", "leg", "lion", "milk",
      "mom", "moon", "mouse", "nose", "orange", "park", "pen", "pig", "pink", "play", "rain", "rabbit", "red", "run",
      "school", "sea", "sheep", "ship", "shoe", "sit", "sky", "smile", "snow", "song", "star", "sun", "table", "toy",
      "train", "tree", "water", "white", "window", "yellow", "zebra"
    ],
    korean: [
      "가방", "강아지", "개구리", "고양이", "구름", "기차", "나무", "눈", "달", "물", "바다", "바람", "벌", "별", "비", "사과",
      "사자", "산", "색연필", "수박", "신발", "엄마", "연필", "우유", "의자", "자동차", "장난감", "책", "친구", "학교", "하늘",
      "햇님", "호랑이"
    ]
  },
  {
    id: 2,
    minLevel: 26,
    maxLevel: 50,
    english: [
      "animal", "answer", "basket", "beach", "bottle", "brother", "building", "butter", "camera", "candle", "captain",
      "carrot", "castle", "circle", "classroom", "cookie", "corner", "country", "dancing", "doctor", "drawer", "dream",
      "family", "farmer", "forest", "friend", "garden", "guitar", "happy", "holiday", "island", "jacket", "kitchen",
      "ladder", "letter", "market", "morning", "music", "notebook", "orange", "painter", "planet", "playground", "queen",
      "rainbow", "reading", "river", "rocket", "sailor", "school", "soccer", "station", "story", "summer", "teacher",
      "ticket", "travel", "village", "window", "winter"
    ],
    korean: [
      "가을", "거북이", "교실", "구슬", "기린", "나들이", "놀이터", "동화", "딸기", "도서관", "마을", "목소리", "문방구", "미술",
      "바구니", "방울", "버스정류장", "병원", "보물", "봄날", "빗방울", "산책", "색종이", "소풍", "수영장", "시계", "시장", "아침",
      "여름", "연못", "운동장", "웃음", "음악", "이야기", "자전거", "장갑", "저녁", "종이배", "주말", "친절", "캠핑", "쿠키",
      "풍선", "하모니카", "햄버거", "호수"
    ]
  },
  {
    id: 3,
    minLevel: 51,
    maxLevel: 75,
    english: [
      "adventure", "airport", "alphabet", "astronaut", "backpack", "battery", "beautiful", "between", "blanket", "bridge",
      "broccoli", "calendar", "champion", "collect", "concert", "delicious", "diamond", "dinosaur", "discovery", "electric",
      "engineer", "exercise", "festival", "firework", "friendly", "gallery", "grammar", "history", "hospital", "important",
      "language", "library", "magazine", "message", "mountain", "museum", "nature", "pencilcase", "present", "problem",
      "science", "special", "strawberry", "student", "sunshine", "surprise", "theater", "together", "uniform", "volunteer",
      "weather", "welcome", "weekend"
    ],
    korean: [
      "가능성", "관찰", "교통수단", "기억력", "나침반", "단어장", "도전", "동물원", "마라톤", "만화책", "명절", "모험", "박물관",
      "발견", "발표", "방학", "분석", "비행기", "사전", "상상력", "설명", "실험", "안전벨트", "어휘력", "연구", "열정", "원리",
      "유적지", "음절", "인사말", "자연", "전통", "정리", "조사", "지도", "질문", "창의력", "체험", "초대장", "탐험", "통신",
      "표현", "학습", "행사", "환경", "훈련"
    ]
  },
  {
    id: 4,
    minLevel: 76,
    maxLevel: 100,
    english: [
      "accuracy", "activity", "adoption", "amazing", "announce", "approach", "argument", "arrangement", "celebrate", "community",
      "compare", "complete", "conclude", "confidence", "consider", "creative", "decision", "describe", "determine", "education",
      "encourage", "environment", "equipment", "evaluate", "excellent", "experience", "favorite", "foundation", "generation",
      "happiness", "identify", "imagine", "improve", "independent", "information", "invention", "knowledge", "leadership",
      "literature", "mathematics", "meaningful", "memorize", "neighbor", "opportunity", "organize", "participate", "positive",
      "practice", "prepare", "presenter", "project", "responsible", "strategy", "successful", "support", "technology", "understand",
      "valuable", "wonderful"
    ],
    korean: [
      "가치관", "감사함", "개선", "공동체", "관계", "근거", "논리", "능력", "다양성", "도움말", "독서량", "리더십", "마음가짐",
      "목표", "문해력", "발표력", "배려심", "변화", "복습", "분위기", "분해", "사고력", "선택", "설계", "성장", "소통", "수집",
      "신뢰", "실천", "안정감", "어려움", "연결", "예측", "요약", "우선순위", "원인", "의견", "이해", "자기주도", "자료", "정확성",
      "조언", "존중", "집중력", "창작", "책임감", "추론", "토론", "판단", "표현력", "해결", "협력", "확인"
    ]
  }
];
const fallbackKoreanWords = [
  "사과", "학교", "강아지", "친구", "하늘", "나무", "기차", "바다",
  "연필", "노래", "우주", "도서관", "자동차", "호랑이", "장난감",
  "마음", "사랑", "희망", "행복", "무지개"
];

const ageGroups = {
  1: { minLen: 2, maxLen: 4 },
  2: { minLen: 3, maxLen: 6 },
  3: { minLen: 4, maxLen: 8 },
  4: { minLen: 5, maxLen: 20 }
};

const state = {
  mode: GAME_MODES.MIX,
  level: 1,
  running: false,
  paused: false,
  remainingTime: LEVEL_DURATION,
  wordsSpawned: 0,
  correct: 0,
  wrong: 0,
  misses: 0,
  englishWords: [],
  koreanWords: [],
  englishByStage: {},
  koreanByStage: {},
  /** @type {{ lang: string, word: string }[]} */
  spawnQueue: [],
  roundTotalWords: null,
  fallingWords: [],
  spawnTimer: null,
  gameTick: null,
  animFrame: null,
  lastFrameTime: 0,
  themeImageAvailable: null,
  selectedTranslation: null
};

const el = {
  gameArea: document.getElementById("gameArea"),
  fxCanvas: document.getElementById("fxCanvas"),
  levelLabel: document.getElementById("levelLabel"),
  modeLabel: document.getElementById("modeLabel"),
  timeLabel: document.getElementById("timeLabel"),
  accuracyLabel: document.getElementById("accuracyLabel"),
  wpmLabel: document.getElementById("wpmLabel"),
  fallSpeedLabel: document.getElementById("fallSpeedLabel"),
  targetLabel: document.getElementById("targetLabel"),
  typingInput: document.getElementById("typingInput"),
  startBtn: document.getElementById("startBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  resetBtn: document.getElementById("resetBtn"),
  prevLevelBtn: document.getElementById("prevLevelBtn"),
  nextLevelBtn: document.getElementById("nextLevelBtn"),
  modeKoBtn: document.getElementById("modeKoBtn"),
  modeEnBtn: document.getElementById("modeEnBtn"),
  modeMixBtn: document.getElementById("modeMixBtn"),
  translatePopup: document.getElementById("translatePopup"),
  showVocabBtn: document.getElementById("showVocabBtn"),
  saveWordBtn: document.getElementById("saveWordBtn"),
  vocabModal: document.getElementById("vocabModal"),
  vocabList: document.getElementById("vocabList"),
  closeVocabBtn: document.getElementById("closeVocabBtn"),
  clearVocabBtn: document.getElementById("clearVocabBtn")
};

async function loadEnglishWords() {
  for (const url of ENGLISH_JSON_URLS) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      let words = [];
      if (Array.isArray(data)) {
        words = data;
      } else if (typeof data === "object" && data !== null) {
        words = Object.keys(data);
      }
      const filtered = words
        .map((w) => String(w).trim().toLowerCase())
        .filter((w) => /^[a-z]+$/.test(w));
      if (filtered.length) {
        return filtered;
      }
    } catch (err) {
      console.warn("English words fetch failed from URL:", url, err);
    }
  }
  return fallbackEnglishWords;
}

const KOREAN_API_SEARCH_SEEDS = [
  "가", "나", "다", "라", "마", "바", "사", "아", "자", "차", "카", "타", "파", "하",
  "고", "교", "구", "국", "그", "금", "기", "김", "내", "노", "대", "도", "동", "버", "복", "분", "북"
];

async function loadKoreanWords() {
  if (WOOREEMALSAM_API_KEY === "PUT_YOUR_API_KEY_HERE") {
    return fallbackKoreanWords;
  }
  const collected = new Set();
  try {
    for (const q of KOREAN_API_SEARCH_SEEDS) {
      if (collected.size >= 2500) break;
      const params = new URLSearchParams({
        key: WOOREEMALSAM_API_KEY,
        q,
        req_type: "json",
        num: "100",
        start: "1"
      });
      const res = await fetch(`${WOOREEMALSAM_API_URL}?${params}`);
      if (!res.ok) continue;
      const data = await res.json();
      const items = data?.channel?.item || [];
      for (const it of items) {
        const w = String(it?.word || "").replace(/[^가-힣]/g, "");
        if (w) collected.add(w);
      }
    }
    const words = [...collected];
    return words.length ? words : fallbackKoreanWords;
  } catch (err) {
    console.warn("Korean words fetch failed. Using fallback.", err);
    return fallbackKoreanWords;
  }
}

function clampLevel(value) {
  return Math.max(1, Math.min(LEVEL_COUNT, value));
}

function getLevelWordGroup(level) {
  return LEVEL_WORD_GROUPS.find((g) => level >= g.minLevel && level <= g.maxLevel) || LEVEL_WORD_GROUPS[0];
}

function filterWordsByAgeGroup(words, groupId, isEnglish = true) {
  const range = ageGroups[groupId];
  return words.filter((word) => {
    const candidate = isEnglish ? String(word).replace(/[^a-zA-Z]/g, "") : String(word).replace(/[^가-힣]/g, "");
    const len = candidate.length;
    return len >= range.minLen && len <= range.maxLen;
  });
}

function getMixedWordPool() {
  const group = getLevelWordGroup(state.level);
  const en = state.englishByStage[group.id] || [];
  const ko = state.koreanByStage[group.id] || [];
  const safeEn = en.length ? en : fallbackEnglishWords;
  const safeKo = ko.length ? ko : fallbackKoreanWords;
  return { en: safeEn, ko: safeKo };
}

/** 레벨 그룹에 적힌 영어 일상 단어 전체(소문자). GitHub JSON은 이 집합에 들어가는 항만 추가 일상으로 인정 */
function mergeAllCuratedEnglishLower() {
  const s = new Set();
  for (const g of LEVEL_WORD_GROUPS) {
    g.english.forEach((w) => s.add(String(w).trim().toLowerCase()));
  }
  return s;
}

function buildStageEnglishPools(jsonWords) {
  const normalized = jsonWords.map((w) => String(w).trim().toLowerCase()).filter((w) => /^[a-z]+$/.test(w));
  const curatedUnion = mergeAllCuratedEnglishLower();
  const result = {};
  for (const group of LEVEL_WORD_GROUPS) {
    const core = group.english.map((w) => w.toLowerCase());
    const fromJsonDaily = filterWordsByAgeGroup(normalized, group.id, true).filter((w) => curatedUnion.has(w));
    const crossTier = [];
    for (const g of LEVEL_WORD_GROUPS) {
      for (const w of g.english) {
        const lw = String(w).trim().toLowerCase();
        if (filterWordsByAgeGroup([lw], group.id, true).length) crossTier.push(lw);
      }
    }
    result[group.id] = [...new Set([...core, ...crossTier, ...fromJsonDaily])];
  }
  return result;
}

function buildStageKoreanPools(apiWords) {
  const normalized = apiWords.map((w) => String(w).trim()).filter((w) => /^[가-힣]+$/.test(w));
  const result = {};
  for (const group of LEVEL_WORD_GROUPS) {
    const core = [...group.korean];
    const fromApi = filterWordsByAgeGroup(normalized, group.id, false);
    result[group.id] = [...new Set([...core, ...fromApi])];
  }
  return result;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 한 라운드에 떨어질 단어 순서. 단어 문자열 기준 중복 없음. 혼합 모드는 가능한 한 영·한 모두 포함.
 */
function buildRoundSpawnQueue(mode, enPool, koPool, desiredTotal) {
  const enU = [...new Set(enPool.map((w) => String(w).trim().toLowerCase()).filter((w) => /^[a-z]+$/.test(w)))];
  const koU = [...new Set(koPool.map((w) => String(w).trim()).filter((w) => /^[가-힣]+$/.test(w)))];
  const enList = shuffleArray(enU);
  const koList = shuffleArray(koU);

  if (mode === GAME_MODES.EN) {
    return enList.slice(0, Math.min(desiredTotal, enList.length)).map((word) => ({ lang: "en", word }));
  }
  if (mode === GAME_MODES.KO) {
    return koList.slice(0, Math.min(desiredTotal, koList.length)).map((word) => ({ lang: "ko", word }));
  }

  if (!enList.length && !koList.length) return [];
  if (!enList.length) {
    return koList.slice(0, Math.min(desiredTotal, koList.length)).map((word) => ({ lang: "ko", word }));
  }
  if (!koList.length) {
    return enList.slice(0, Math.min(desiredTotal, enList.length)).map((word) => ({ lang: "en", word }));
  }

  let nEn = Math.ceil(desiredTotal / 2);
  let nKo = desiredTotal - nEn;
  let takeEn = Math.min(nEn, enList.length);
  let takeKo = Math.min(nKo, koList.length);
  let need = desiredTotal - takeEn - takeKo;
  if (need > 0) {
    const moreEn = Math.min(need, enList.length - takeEn);
    takeEn += moreEn;
    need -= moreEn;
  }
  if (need > 0) {
    takeKo += Math.min(need, koList.length - takeKo);
  }

  const enSlice = enList.slice(0, takeEn);
  const koSlice = koList.slice(0, takeKo);
  const out = [
    ...enSlice.map((word) => ({ lang: "en", word })),
    ...koSlice.map((word) => ({ lang: "ko", word }))
  ];

  if (desiredTotal >= 2 && enList.length && koList.length) {
    const hasEn = out.some((x) => x.lang === "en");
    const hasKo = out.some((x) => x.lang === "ko");
    if (!hasEn) {
      const i = out.findIndex((x) => x.lang === "ko");
      if (i >= 0) out[i] = { lang: "en", word: enList[0] };
    } else if (!hasKo) {
      const i = out.findIndex((x) => x.lang === "en");
      if (i >= 0) out[i] = { lang: "ko", word: koList[0] };
    }
  }

  return shuffleArray(out);
}

function getFallingDurationByLevel(level) {
  const base = 9000;
  const minimum = 1700;
  const scale = 1 + (level - 1) * 0.022;
  return Math.max(minimum, base / scale);
}

/**
 * 현재 레벨·게임 영역 높이 기준 낙하 속도(이론값). gameLoop의 speed = h / fallDuration 과 동일.
 * @returns {{ durationMs: number, pxPerSec: number, gameHeightPx: number }}
 */
function measureFallingWordSpeed(level) {
  const gameHeightPx = el.gameArea ? el.gameArea.clientHeight : 0;
  const durationMs = getFallingDurationByLevel(level);
  const sec = durationMs / 1000;
  const pxPerSec = gameHeightPx > 0 && sec > 0 ? gameHeightPx / sec : 0;
  return { durationMs, pxPerSec, gameHeightPx };
}

function updateTopUI() {
  const settings = getGameSettings(state.level);
  const totalAttempts = state.correct + state.wrong + state.misses;
  const accuracy = totalAttempts ? ((state.correct / totalAttempts) * 100).toFixed(1) : "100.0";
  const modeText = state.mode === GAME_MODES.KO ? "KOREAN" : state.mode === GAME_MODES.EN ? "ENGLISH" : "MIX";
  el.levelLabel.textContent = `Level ${state.level}`;
  el.modeLabel.textContent = `Mode: ${modeText}`;
  el.timeLabel.textContent = `Time: ${state.remainingTime}s`;
  el.accuracyLabel.textContent = `Accuracy: ${accuracy}%`;
  el.wpmLabel.textContent = `W/Sec: ${settings.wordsPerSecond}`;
  const fall = measureFallingWordSpeed(state.level);
  if (fall.gameHeightPx > 0 && fall.pxPerSec > 0) {
    el.fallSpeedLabel.textContent = `낙하: ${(fall.durationMs / 1000).toFixed(2)}s · ${fall.pxPerSec.toFixed(1)} px/s`;
  } else {
    el.fallSpeedLabel.textContent = "낙하: —";
  }
  const targetText =
    state.running && state.roundTotalWords != null ? state.roundTotalWords : calculateTotalWords(state.level);
  el.targetLabel.textContent = `Target: ${targetText}`;
  applyLevelTheme();
  updateModeButtonActiveState();
}

function updateModeButtonActiveState() {
  const active = "primary-btn";
  const inactive = "small-btn";
  el.modeKoBtn.className = state.mode === GAME_MODES.KO ? active : inactive;
  el.modeEnBtn.className = state.mode === GAME_MODES.EN ? active : inactive;
  el.modeMixBtn.className = state.mode === GAME_MODES.MIX ? active : inactive;
}

function getThemeByLevel(level) {
  // IMPORTANT: Y positions are limited to the top zone so bottom two rows are never used.
  if (level <= 10) {
    return { x: "9%", y: "8%", size: "145% auto" }; // alphabet area
  }
  if (level <= 20) {
    return { x: "36%", y: "11%", size: "145% auto" }; // teddy bear area
  }
  if (level <= 40) {
    return { x: "64%", y: "17%", size: "145% auto" }; // train area
  }
  return { x: "86%", y: "18%", size: "145% auto" }; // theme park area
}

function getThemeFallbackGradient(level) {
  if (level <= 10) {
    return "linear-gradient(180deg, #c8ecff, #f7f2ff 55%, #fff8d6)";
  }
  if (level <= 20) {
    return "linear-gradient(180deg, #ffdff1, #ffe9cc 55%, #fff7de)";
  }
  if (level <= 40) {
    return "linear-gradient(180deg, #d9f9ff, #ddf0ff 55%, #f2ffd8)";
  }
  return "linear-gradient(180deg, #f2ddff, #dff8ff 55%, #ffe8c9)";
}

function checkThemeImageAvailable(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

function applyLevelTheme() {
  const theme = getThemeByLevel(state.level);
  const fallback = getThemeFallbackGradient(state.level);
  if (state.themeImageAvailable) {
    el.gameArea.style.setProperty("--theme-image", `url("${THEME_SPRITE_IMAGE}")`);
  } else {
    el.gameArea.style.setProperty("--theme-image", fallback);
  }
  el.gameArea.style.setProperty("--theme-size", theme.size);
  el.gameArea.style.setProperty("--theme-position", `${theme.x} ${theme.y}`);
}

function createWordElement(text, lang) {
  const node = document.createElement("div");
  node.className = `falling-word ${lang === "ko" ? "word-ko" : ""}`;
  node.textContent = text;
  node.dataset.word = text;
  node.dataset.lang = lang;
  node.style.left = `${Math.random() * 88}%`;
  node.style.top = "-30px";
  node.addEventListener("click", async (e) => {
    e.stopPropagation();
    const translation = await translateWord(text, lang);
    state.selectedTranslation = { word: text, translation, lang };
    showTranslationPopup(node, text, translation);
  });
  return node;
}

function spawnWord() {
  const settings = getGameSettings(state.level);
  if (!state.running || state.paused || state.wordsSpawned >= settings.totalWords) return;

  const next = state.spawnQueue[state.wordsSpawned];
  if (!next) return;

  const picked = next.word;
  const lang = next.lang;
  const node = createWordElement(picked, lang);
  el.gameArea.appendChild(node);

  const item = {
    word: picked,
    lang,
    node,
    y: -30,
    fallDuration: getFallingDurationByLevel(state.level)
  };
  state.fallingWords.push(item);
  state.wordsSpawned++;
}

function gameLoop(timestamp) {
  if (!state.running) return;
  if (state.paused) {
    state.animFrame = requestAnimationFrame(gameLoop);
    return;
  }
  const h = el.gameArea.clientHeight;
  const delta = state.lastFrameTime ? (timestamp - state.lastFrameTime) : 16;
  state.lastFrameTime = timestamp;
  for (let i = state.fallingWords.length - 1; i >= 0; i--) {
    const fw = state.fallingWords[i];
    const speed = h / fw.fallDuration;
    fw.y += speed * delta;
    fw.node.style.top = `${fw.y}px`;
    if (fw.y > h - 25) {
      fw.node.remove();
      state.fallingWords.splice(i, 1);
      state.misses++;
      playSound("wrong");
    }
  }
  updateTopUI();
  state.animFrame = requestAnimationFrame(gameLoop);
}

function normalizeInput(value, lang) {
  if (lang === "en") return value.trim().toLowerCase();
  return value.trim();
}

function findFallingWordByInput(inputWord) {
  const query = inputWord.trim();
  if (!query) return null;
  const lower = query.toLowerCase();
  for (const fw of state.fallingWords) {
    if (fw.lang === "en" && fw.word.toLowerCase() === lower) return fw;
    if (fw.lang === "ko" && fw.word === query) return fw;
  }
  return null;
}

function saveTranslationRecord(record) {
  const list = loadVocab();
  const key = `${record.word}:${record.translation}`;
  if (!list.some((x) => `${x.word}:${x.translation}` === key)) {
    list.push({ ...record, savedAt: new Date().toISOString() });
    saveVocab(list);
  }
}

async function handleStarTranslation(raw) {
  const requestedWord = raw.slice(0, -1).trim();
  if (!requestedWord) {
    alert("번역하려면 단어 뒤에 * 를 붙여 입력해 주세요. 예: apple*");
    return true;
  }
  const target = findFallingWordByInput(requestedWord);
  if (!target) {
    alert("현재 떨어지는 단어 중에서 찾지 못했어요. 보이는 단어 뒤에 *를 붙여 입력해 주세요.");
    return true;
  }
  const translation = await translateWord(target.word, target.lang);
  state.selectedTranslation = { word: target.word, translation, lang: target.lang };
  saveTranslationRecord(state.selectedTranslation);
  renderVocab();
  showTranslationPopup(target.node, target.word, translation);
  return true;
}

function handleSubmitInput() {
  const raw = el.typingInput.value.trim();
  if (!raw) return;
  if (raw.endsWith("*")) {
    handleStarTranslation(raw).finally(() => {
      el.typingInput.value = "";
      updateTopUI();
    });
    return;
  }
  let matchedIndex = -1;
  for (let i = 0; i < state.fallingWords.length; i++) {
    const fw = state.fallingWords[i];
    const expected = normalizeInput(fw.word, fw.lang);
    const got = normalizeInput(raw, fw.lang);
    if (expected === got) {
      matchedIndex = i;
      break;
    }
  }
  if (matchedIndex >= 0) {
    const target = state.fallingWords[matchedIndex];
    target.node.remove();
    state.fallingWords.splice(matchedIndex, 1);
    state.correct++;
    playSound("correct");
  } else {
    state.wrong++;
    playSound("wrong");
  }
  el.typingInput.value = "";
  updateTopUI();
}

function stopGameTimers() {
  if (state.spawnTimer) clearInterval(state.spawnTimer);
  if (state.gameTick) clearInterval(state.gameTick);
  if (state.animFrame) cancelAnimationFrame(state.animFrame);
  state.spawnTimer = null;
  state.gameTick = null;
  state.animFrame = null;
  state.lastFrameTime = 0;
}

function clearFallingWords() {
  state.fallingWords.forEach((fw) => fw.node.remove());
  state.fallingWords = [];
}

function finishLevel() {
  state.running = false;
  state.spawnQueue = [];
  state.roundTotalWords = null;
  stopGameTimers();
  stopPlayTimeTracking();
  const totalAttempts = state.correct + state.wrong + state.misses;
  const accuracy = totalAttempts ? (state.correct / totalAttempts) * 100 : 100;
  if (accuracy >= PASS_ACCURACY) {
    fireworks();
    const completed = getSavedLevelForMode(state.mode);
    saveLevelForMode(state.mode, Math.max(completed, state.level));
    alert(`Level ${state.level} clear! Accuracy ${accuracy.toFixed(1)}%`);
  } else {
    alert(`Accuracy ${accuracy.toFixed(1)}%. 80% 미만이라 같은 레벨을 다시 도전해요!`);
  }
}

function startLevel() {
  state.running = true;
  state.paused = false;
  state.remainingTime = LEVEL_DURATION;
  state.wordsSpawned = 0;
  state.correct = 0;
  state.wrong = 0;
  state.misses = 0;
  clearFallingWords();

  const desiredTotal = calculateTotalWords(state.level);
  const pool = getMixedWordPool();
  state.spawnQueue = buildRoundSpawnQueue(state.mode, pool.en, pool.ko, desiredTotal);
  state.roundTotalWords = state.spawnQueue.length;
  if (!state.roundTotalWords) {
    state.running = false;
    alert("이 레벨에서 사용할 단어가 없어요. 네트워크와 API 설정을 확인해 주세요.");
    updateTopUI();
    return;
  }

  updateTopUI();
  trackPlayTime();

  const settings = getGameSettings(state.level);
  spawnWord();
  state.spawnTimer = setInterval(spawnWord, settings.spawnInterval);
  state.gameTick = setInterval(() => {
    state.remainingTime--;
    if (state.remainingTime <= 0) finishLevel();
    else updateTopUI();
  }, 1000);
  state.animFrame = requestAnimationFrame(gameLoop);
}

function pauseToggle() {
  state.paused = !state.paused;
  el.pauseBtn.textContent = state.paused ? "Resume" : "Pause";
}

async function translateWord(word, lang) {
  const target = lang === "en" ? "ko" : "en";
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=${lang}|${target}`
    );
    const data = await res.json();
    return data?.responseData?.translatedText || "번역 결과 없음";
  } catch (err) {
    return "번역 실패 (네트워크 확인)";
  }
}

function showTranslationPopup(wordNode, original, translated) {
  const rect = wordNode.getBoundingClientRect();
  const areaRect = el.gameArea.getBoundingClientRect();
  el.translatePopup.classList.remove("hidden");
  el.translatePopup.style.left = `${rect.left - areaRect.left}px`;
  el.translatePopup.style.top = `${rect.top - areaRect.top + 34}px`;
  el.translatePopup.textContent = `${original} = ${translated}`;
}

function hideTranslationPopup() {
  el.translatePopup.classList.add("hidden");
}

function loadVocab() {
  try {
    return JSON.parse(safeGetStorage(STORAGE_KEYS.vocab, "[]") || "[]");
  } catch {
    return [];
  }
}

function saveVocab(list) {
  safeSetStorage(STORAGE_KEYS.vocab, JSON.stringify(list));
}

function addToVocab() {
  if (!state.selectedTranslation) {
    alert("먼저 떨어지는 단어를 클릭해서 번역을 확인해 주세요.");
    return;
  }
  saveTranslationRecord(state.selectedTranslation);
  renderVocab();
}

function getSavedLevelMap() {
  try {
    const parsed = JSON.parse(safeGetStorage(STORAGE_KEYS.lastLevelByMode, "{}") || "{}");
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch (err) {
    return {};
  }
}

function getSavedLevelForMode(mode) {
  const map = getSavedLevelMap();
  const value = Number(map[mode] || 1);
  return clampLevel(value);
}

function saveLevelForMode(mode, level) {
  const map = getSavedLevelMap();
  map[mode] = clampLevel(level);
  safeSetStorage(STORAGE_KEYS.lastLevelByMode, JSON.stringify(map));
}

function setMode(mode) {
  if (state.mode === mode) return;
  state.mode = mode;
  state.level = getSavedLevelForMode(mode);
  if (state.running) {
    state.running = false;
    stopGameTimers();
    stopPlayTimeTracking();
    clearFallingWords();
    startLevel();
  } else {
    updateTopUI();
  }
}

function renderVocab() {
  const list = loadVocab();
  el.vocabList.innerHTML = list
    .map((item) => `<li><strong>${item.word}</strong> - ${item.translation} <small>(${item.lang})</small></li>`)
    .join("");
}

function showVocabModal() {
  renderVocab();
  el.vocabModal.classList.remove("hidden");
}

function hideVocabModal() {
  el.vocabModal.classList.add("hidden");
}

function clearVocab() {
  saveVocab([]);
  renderVocab();
}

function setupCanvas() {
  const canvas = el.fxCanvas;
  const resize = () => {
    canvas.width = el.gameArea.clientWidth;
    canvas.height = el.gameArea.clientHeight;
  };
  resize();
  window.addEventListener("resize", resize);
}

function fireworks() {
  const canvas = el.fxCanvas;
  const ctx = canvas.getContext("2d");
  const particles = [];
  const colors = ["#ff8fab", "#ffd166", "#7bdff2", "#b8f2e6", "#cdb4db"];
  for (let i = 0; i < 150; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      life: 60 + Math.random() * 20,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
  let frame = 0;
  const draw = () => {
    frame++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life -= 1;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / 70);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    if (frame < 80) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
  draw();
}

let audioCtx = null;
function playSound(type) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  if (!audioCtx) {
    try {
      audioCtx = new AudioCtx();
    } catch (err) {
      return;
    }
  }
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  if (type === "correct") {
    osc.frequency.value = 780;
    osc.type = "triangle";
  } else {
    osc.frequency.value = 220;
    osc.type = "square";
  }
  gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.16, audioCtx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  osc.start();
  osc.stop(audioCtx.currentTime + 0.2);
}

function bindEvents() {
  el.startBtn.addEventListener("click", () => {
    if (state.running) return;
    startLevel();
    el.typingInput.focus();
  });
  el.pauseBtn.addEventListener("click", pauseToggle);
  el.resetBtn.addEventListener("click", () => {
    state.running = false;
    stopGameTimers();
    stopPlayTimeTracking();
    clearFallingWords();
    state.spawnQueue = [];
    state.roundTotalWords = null;
    state.remainingTime = LEVEL_DURATION;
    state.wordsSpawned = 0;
    state.correct = 0;
    state.wrong = 0;
    state.misses = 0;
    updateTopUI();
  });
  el.prevLevelBtn.addEventListener("click", () => {
    state.level = clampLevel(state.level - 1);
    updateTopUI();
  });
  el.nextLevelBtn.addEventListener("click", () => {
    state.level = clampLevel(state.level + 1);
    updateTopUI();
  });
  el.modeKoBtn.addEventListener("click", () => setMode(GAME_MODES.KO));
  el.modeEnBtn.addEventListener("click", () => setMode(GAME_MODES.EN));
  el.modeMixBtn.addEventListener("click", () => setMode(GAME_MODES.MIX));
  el.typingInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSubmitInput();
  });
  el.gameArea.addEventListener("click", hideTranslationPopup);
  el.saveWordBtn.addEventListener("click", addToVocab);
  el.showVocabBtn.addEventListener("click", showVocabModal);
  el.closeVocabBtn.addEventListener("click", hideVocabModal);
  el.clearVocabBtn.addEventListener("click", clearVocab);
}

async function init() {
  const savedLevel = getSavedLevelForMode(state.mode);
  state.level = clampLevel(savedLevel);
  state.remainingTime = LEVEL_DURATION;
  updateTopUI();
  setupCanvas();
  bindEvents();
  state.themeImageAvailable = await checkThemeImageAvailable(THEME_SPRITE_IMAGE);
  applyLevelTheme();
  const [en, ko] = await Promise.all([loadEnglishWords(), loadKoreanWords()]);
  const normalizedEnglish = en.filter((w) => /^[a-zA-Z]+$/.test(w));
  state.englishWords = normalizedEnglish;
  state.koreanWords = ko.filter((w) => /^[가-힣]+$/.test(w)).slice(0, 3000);
  if (!state.englishWords.length) state.englishWords = [...fallbackEnglishWords];
  if (!state.koreanWords.length) state.koreanWords = [...fallbackKoreanWords];
  state.englishByStage = buildStageEnglishPools(state.englishWords);
  state.koreanByStage = buildStageKoreanPools(state.koreanWords);
  const fall0 = measureFallingWordSpeed(state.level);
  const enCounts = LEVEL_WORD_GROUPS.map((g) => (state.englishByStage[g.id] || []).length).join(", ");
  const koCounts = LEVEL_WORD_GROUPS.map((g) => (state.koreanByStage[g.id] || []).length).join(", ");
  console.info(
    "[TypingGame] 일상 단어 풀(스테이지별 EN / KO 개수):",
    enCounts,
    "/",
    koCounts,
    "| 낙하 이론:",
    fall0.gameHeightPx ? `${(fall0.durationMs / 1000).toFixed(2)}s, ${fall0.pxPerSec.toFixed(1)} px/s (h=${fall0.gameHeightPx}px)` : "영역 높이 대기"
  );
  updateTopUI();
  el.typingInput.focus();
}

init().catch((err) => {
  console.error("Game init failed:", err);
  alert("게임 초기화 중 오류가 발생했습니다. 브라우저 새로고침 후 다시 시도해 주세요.");
});
