  /* ===== すごろく構成 ===== */
  const frameCount   = 6;
  const roughCount   = 6;
  const textCount    = 6;
  const penCount     = 6;
  const betaCount    = 6;
  const toneCount    = 6;
  const finishCount  = 6;

  const LESSONS = [];

  function addGroup(prefix, label, descBase, count, prevId) {
    let lastId = prevId;
    for (let i = 1; i <= count; i++) {
      const id = `${prefix}${i}`;
      const title = `${label}${i}コマ目`;
      LESSONS.push({
        id,
        title,
        description: descBase.replace("{n}", i),
        maxProgress: 1,
        prereqId: lastId
      });
      lastId = id;
    }
    return lastId;
  }

  let last = null;
  last = addGroup("frame_",  "枠線",   "枠線 {n}コマ目。",      frameCount, last);
  last = addGroup("rough_",  "下書き", "下書き {n}コマ目。",    roughCount, last);
  last = addGroup("text_",   "台詞",   "台詞 {n}コマ目。",      textCount,  last);
  last = addGroup("pen_",    "ペン入れ", "ペン入れ {n}コマ目。", penCount,   last);
  last = addGroup("beta_",   "ベタ",     "ベタ {n}コマ目。",     betaCount,  last);
  last = addGroup("tone_",   "トーン",   "トーン {n}コマ目。",   toneCount,  last);
  last = addGroup("finish_", "仕上げ",   "仕上げ {n}コマ目。",   finishCount,last);

  let currentPage = 1;
  const STORAGE_KEY = "mangaLessonProgress_v8_pages";
  const STREAK_KEY  = "mangaLessonStreak_v1";

  /* ===== 進捗保存 ===== */
  function createInitialProgressMap() {
    const obj = {};
    for (const lesson of LESSONS) {
      obj[lesson.id] = 0;
    }
    return obj;
  }

  function createNewData() {
    return {
      maxPage: 1,
      pages: { "1": createInitialProgressMap() }
    };
  }

  function migrateLegacyProgress(legacyObj) {
    const base = createInitialProgressMap();
    for (const id of Object.keys(base)) {
      if (typeof legacyObj[id] === "number") {
        base[id] = legacyObj[id];
      }
    }
    return base;
  }

  function loadAllProgress() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const data = createNewData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.pages) {
        for (let p = 1; p <= (parsed.maxPage || 1); p++) {
          const key = String(p);
          if (!parsed.pages[key]) parsed.pages[key] = createInitialProgressMap();
          else {
            const base = createInitialProgressMap();
            const src = parsed.pages[key];
            for (const id of Object.keys(base)) {
              base[id] = typeof src[id] === "number" ? src[id] : 0;
            }
            parsed.pages[key] = base;
          }
        }
        return parsed;
      } else {
        const legacy = (parsed && typeof parsed === "object") ? parsed : {};
        const data = createNewData();
        data.pages["1"] = migrateLegacyProgress(legacy);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return data;
      }
    } catch {
      const data = createNewData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    }
  }

  function saveAllProgress(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function loadPageProgress(page) {
    const data = loadAllProgress();
    const key = String(page);
    if (!data.pages[key]) {
      data.pages[key] = createInitialProgressMap();
      if (page > data.maxPage) data.maxPage = page;
      saveAllProgress(data);
    }
    return { data, progress: data.pages[key] };
  }

  function resetAllPagesProgress() {
    const data = loadAllProgress();
    for (let p = 1; p <= data.maxPage; p++) {
      data.pages[String(p)] = createInitialProgressMap();
    }
    saveAllProgress(data);
  }

  function getPerRow() {
    return window.innerWidth <= 600 ? 3 : 6;
  }

  function computeGridPositions(count, perRow) {
    const positions = [];
    const rows = Math.ceil(count / perRow);

    let marginX = (perRow === 3) ? 12 : 8;
    const usableX = 100 - marginX * 2;
    const stepX   = perRow > 1 ? usableX / (perRow - 1) : 0;

    let marginTop, totalY;
    if (perRow === 3) {
      marginTop = 5;
      totalY    = 90;
    } else {
      marginTop = 8;
      totalY    = 70;
    }
    const rowStep = rows > 1 ? totalY / (rows - 1) : 0;

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / perRow);
      const indexInRow = i % perRow;
      const isEvenRow = (row % 2 === 0);
      const col = isEvenRow ? indexInRow : perRow - 1 - indexInRow;

      const x = marginX + stepX * col;
      const y = marginTop + rowStep * row;
      positions.push({ x, y });
    }
    return positions;
  }

  /* ===== 連続日数 ===== */
  function getLogicalDateKey(date = new Date()) {
    const d = new Date(date.getTime());
    const hour = d.getHours();
    if (hour < 5) d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function keyToDate(key) {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function dateToKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function loadStreakData() {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return {};
    try {
      const obj = JSON.parse(raw);
      return obj && typeof obj === "object" ? obj : {};
    } catch {
      return {};
    }
  }

  function saveStreakData(data) {
    localStorage.setItem(STREAK_KEY, JSON.stringify(data));
  }

  function resetStreakData() {
    saveStreakData({});
  }

  function registerActivity() {
    const data = loadStreakData();
    const todayKey = getLogicalDateKey();
    if (!data[todayKey]) {
      data[todayKey] = true;
      saveStreakData(data);
    }
  }

  function calcCurrentStreak() {
    const data = loadStreakData();
    const keys = Object.keys(data);
    if (keys.length === 0) return 0;
    const set = new Set(keys);
    let streak = 0;
    let d = keyToDate(getLogicalDateKey());
    while (true) {
      const key = dateToKey(d);
      if (set.has(key)) {
        streak += 1;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  function updateStreakDisplay() {
    const el = document.getElementById("streakValue");
    if (!el) return;
    el.textContent = `${calcCurrentStreak()} 日`;
  }

  /* ===== ページラベル ===== */
  function updatePageLabel(dataOpt) {
    const labelEl = document.getElementById("pageLabel");
    const prevBtn = document.getElementById("prevPageBtn");
    const nextBtn = document.getElementById("nextPageBtn");
    const data = dataOpt || loadAllProgress();
    if (!labelEl) return;
    labelEl.textContent = `${currentPage}ページ目 / 全${data.maxPage}ページ`;
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= data.maxPage;
  }

  // ===== 次のタスク表示 =====
  function getNextIncompleteLesson(progress) {
    let lastCompletedIndex = -1;
    LESSONS.forEach((lesson, index) => {
      if (isLessonCompleted(lesson, progress) && index > lastCompletedIndex) {
        lastCompletedIndex = index;
      }
    });

    for (let i = lastCompletedIndex + 1; i < LESSONS.length; i++) {
      const lesson = LESSONS[i];
      if (!isLessonCompleted(lesson, progress)) {
        return lesson;
      }
    }
    return null;
  }

function updateNextTaskDisplay(progress) {
  const titleEl = document.getElementById("nextTaskTitle");
  const infoEl  = document.getElementById("nextTaskInfo");
  if (!titleEl || !infoEl) return;

  const next = getNextIncompleteLesson(progress);

  if (next) {
    titleEl.textContent = `${next.title}を進めよう！`;
    infoEl.textContent  =
      `次のマスは「${next.title}」です。クリックして進めていきましょう。`;

    // ★ 継続パネル用：次にやるタスク名を共有
    window.dailyNextTaskText = `${next.title}を進めてみましょう`;
  } else {
    titleEl.textContent = "このページは全部クリアしました！";
    infoEl.textContent  =
      "お疲れさまでした。新しいページを追加して続きの原稿を進めましょう。";

    // ★ 全クリア時の文言（お好みで）
    window.dailyNextTaskText = "このページは全部クリアしました";
  }
}

  /* ===== 原稿用紙描画データ ===== */
const EDIT_CANVAS_WIDTH  = 1000;
// A4 600dpi (4961×7016) と同じ縦横比にする
const EDIT_CANVAS_HEIGHT = Math.round(EDIT_CANVAS_WIDTH * 7016 / 4961);

const EXPORT_WIDTH  = 4961;
const EXPORT_HEIGHT = 7016;
const DRAW_STORAGE_KEY = "mangaBoardDraw_v1";

  const BALLOON_RX = 60;
  const BALLOON_RY = 80;

  /* ===== トーン用パターン(網点) ===== */
  let tonePatternData = null;

  // 60線相当（600dpi前提・45度・約20％）のトーンパターン
function createTonePatternData() {
  // 編集キャンバス上でかなり細かいトーンにする
  // （タイル 4px、対角上に 2 ドット、濃度はだいたい 20〜25%）
  const size = 4;  // ← ここを小さくするほど細かくなる
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  // ベースは白
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "#000000";

  // 半径 0.8px（直径 1.6px）くらいの小さなドット
  // 2つで約20〜25%くらいの濃度
  const r = 0.8;

  // 左上寄りの点
  ctx.beginPath();
  ctx.arc(1.2, 1.2, r, 0, Math.PI * 2);
  ctx.fill();

  // 右下寄りの点（対角方向）
  ctx.beginPath();
  ctx.arc(size - 1.2, size - 1.2, r, 0, Math.PI * 2);
  ctx.fill();

  const img = ctx.getImageData(0, 0, size, size);
  tonePatternData = {
    width: size,
    height: size,
    data: img.data
  };
}

  function createEmptyDrawPage() {
    return {
      frames: {},
      rough: {},
      pen: {},
      text: {},
      beta: {},       // ベタ塗り用
      tone: {},       // トーン塗り用
      roughColor: "black"
    };
  }

  function loadDrawAll() {
    const raw = localStorage.getItem(DRAW_STORAGE_KEY);
    if (!raw) return {};
    try {
      const obj = JSON.parse(raw);
      return obj && typeof obj === "object" ? obj : {};
    } catch {
      return {};
    }
  }

  function saveDrawAll(data) {
    localStorage.setItem(DRAW_STORAGE_KEY, JSON.stringify(data));
  }

  function getDrawPage(page) {
    const all = loadDrawAll();
    const key = String(page);
    if (!all[key]) {
      all[key] = createEmptyDrawPage();
    } else {
      const p = all[key];
      if (!p.frames) p.frames = {};
      if (!p.rough) p.rough = {};
      if (!p.pen)   p.pen   = {};
      if (!p.text)  p.text  = {};
      if (!p.beta)  p.beta  = {};
      if (!p.tone)  p.tone  = {};
      if (!p.roughColor) p.roughColor = "black";
    }
    saveDrawAll(all);
    return { all, pageData: all[key] };
  }

  function resetAllDrawData() {
    localStorage.removeItem(DRAW_STORAGE_KEY);
  }

  /* 描画中のページデータをキャッシュして高速化 */
  let activeDrawPageData = null;

  /* ===== 成功エフェクトなど ===== */
  let audioCtx = null;

  function showSuccessEffect() {
    const toast = document.getElementById("successToast");
    if (!toast) return;
    toast.classList.remove("show");
    void toast.offsetWidth;
    toast.classList.add("show");
  }

  function triggerConfetti(targetNode) {
    const mapEl = document.getElementById("map");
    if (!mapEl) return;

    const mapRect = mapEl.getBoundingClientRect();

    let baseXPercent = 50;
    let baseYPercent = 20;

    if (targetNode) {
      const nodeRect = targetNode.getBoundingClientRect();
      const centerX = (nodeRect.left + nodeRect.right) / 2 - mapRect.left;
      const centerY = (nodeRect.top + nodeRect.bottom) / 2 - mapRect.top;
      baseXPercent = (centerX / mapRect.width) * 100;
      baseYPercent = (centerY / mapRect.height) * 100;
    }

    const count  = 45;
    const colors = ["#22c55e", "#facc15", "#38bdf8", "#f97316", "#a855f7"];

    for (let i = 0; i < count; i++) {
      const piece = document.createElement("div");
      piece.className = "confetti";

      const offsetX = (Math.random() * 30) - 15;
      piece.style.left = (baseXPercent + offsetX) + "%";
      piece.style.top  = baseYPercent + "%";

      piece.style.backgroundColor = colors[i % colors.length];
      piece.style.animationDelay  = (Math.random() * 0.18) + "s";

      mapEl.appendChild(piece);
      setTimeout(() => piece.remove(), 1000);
    }
  }

  function playSuccessSound(isFinal) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtx) audioCtx = new Ctx();
      const ctx = audioCtx;
      const now = ctx.currentTime;

      function tone(freq, start, duration, volume, type = "sine") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(volume, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration + 0.02);
      }

      function sparkleNoise(start, duration, volume) {
        const bufferSize = duration * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.4;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        noise.connect(gain).connect(ctx.destination);
        noise.start(start);
        noise.stop(start + duration + 0.05);
      }

      if (!isFinal) {
        tone(1320, now, 0.25, 0.25, "sine");
        tone(660,  now + 0.02, 0.35, 0.18, "triangle");
        tone(880,  now + 0.02, 0.35, 0.18, "triangle");
        sparkleNoise(now, 0.25, 0.08);
        return;
      }

      const base = 523.25;
      const step = 0.12;
      tone(base,           now + 0.00, 0.4, 0.26, "triangle");
      tone(base * 1.25,    now + step, 0.4, 0.24, "triangle");
      tone(base * 1.5,     now + step*2, 0.4, 0.22, "triangle");
      tone(base * 2,       now + step*3, 0.5, 0.28, "sine");

      tone(261.63, now, 0.6, 0.20, "sine");
      sparkleNoise(now, 0.45, 0.12);

    } catch (e) {
      console.warn("audio error", e);
    }
  }

  function isLessonUnlocked(lesson, progress) {
    return true;
  }

  function isLessonCompleted(lesson, progress) {
    return progress[lesson.id] >= lesson.maxProgress;
  }

  function logMessage(text) {
    console.log(text);
  }

/* ===== 原稿用紙ベース（ClipStudio B5 ピクセル準拠） ===== */
function drawPaperBase(ctx, w, h) {
  ctx.save();

  // 用紙地
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 1;

  // ClipStudio B5 の基準ピクセル
  const CS_CANVAS_W = 4961;
  const CS_CANVAS_H = 7016;

  // ヘルパー：クリスタ上の px を編集キャンバス上の座標に変換
  const sx = px => (px / CS_CANVAS_W) * w;
  const sy = px => (px / CS_CANVAS_H) * h;

  // 1) キャンバス外枠（用紙全体）
  //    4961×7016 をそのまま w×h に対応させる
  const canvasX = 0;
  const canvasY = 0;
  const canvasW = w;
  const canvasH = h;
  ctx.strokeRect(canvasX + 0.5, canvasY + 0.5, canvasW - 1, canvasH - 1);

  // 2) 仕上がり枠 4299×6071（中央）
  const FIN_W = 4299;
  const FIN_H = 6071;
  const finW = sx(FIN_W);
  const finH = sy(FIN_H);
  const finX = (w - finW) / 2;
  const finY = (h - finH) / 2;
  ctx.strokeRect(finX, finY, finW, finH);

  // 3) 断ち落とし枠（仕上がり + 118px ×2）
  const BLEED_W = FIN_W + 118 * 2;
  const BLEED_H = FIN_H + 118 * 2;
  const bleedW = sx(BLEED_W);
  const bleedH = sy(BLEED_H);
  const bleedX = (w - bleedW) / 2;
  const bleedY = (h - bleedH) / 2;
  ctx.strokeRect(bleedX, bleedY, bleedW, bleedH);

  // 4) 内枠（本文安全枠）3520×5173
  const INNER_W = 3520;
  const INNER_H = 5173;
  const innerW = sx(INNER_W);
  const innerH = sy(INNER_H);
  const innerX = (w - innerW) / 2;
  const innerY = (h - innerH) / 2;
  ctx.strokeRect(innerX, innerY, innerW, innerH);

  // 5) 中心マーク・コーナーマーク（断ち落とし枠基準で描画）
  const cx = w / 2;
  const cy = h / 2;
  const minSide = Math.min(w, h);
  const markLen   = minSide * 0.03;
  const cornerLen = minSide * 0.025;

  ctx.beginPath();

  // 上下中央（断ち落としの外側に）
  ctx.moveTo(cx, bleedY - markLen);
  ctx.lineTo(cx, bleedY);
  ctx.moveTo(cx, bleedY + bleedH);
  ctx.lineTo(cx, bleedY + bleedH + markLen);

  // 左右中央
  ctx.moveTo(bleedX - markLen, cy);
  ctx.lineTo(bleedX, cy);
  ctx.moveTo(bleedX + bleedW, cy);
  ctx.lineTo(bleedX + bleedW + markLen, cy);

  // コーナー（断ち落とし四隅）
  ctx.moveTo(bleedX, bleedY - cornerLen);
  ctx.lineTo(bleedX, bleedY);
  ctx.lineTo(bleedX - cornerLen, bleedY);

  ctx.moveTo(bleedX + bleedW, bleedY - cornerLen);
  ctx.lineTo(bleedX + bleedW, bleedY);
  ctx.lineTo(bleedX + bleedW + cornerLen, bleedY);

  ctx.moveTo(bleedX, bleedY + bleedH + cornerLen);
  ctx.lineTo(bleedX, bleedY + bleedH);
  ctx.lineTo(bleedX - cornerLen, bleedY + bleedH);

  ctx.moveTo(bleedX + bleedW, bleedY + bleedH + cornerLen);
  ctx.lineTo(bleedX + bleedW, bleedY + bleedH);
  ctx.lineTo(bleedX + bleedW + cornerLen, bleedY + bleedH);

  ctx.stroke();
  ctx.restore();
}

  /* ===== 「進めた」処理 ===== */
  function advanceLesson(lessonId) {
    const { data, progress } = loadPageProgress(currentPage);
    const lessonIndex = LESSONS.findIndex(l => l.id === lessonId);
    if (lessonIndex === -1) return;

    const lesson = LESSONS[lessonIndex];

    if (progress[lesson.id] >= lesson.maxProgress) {
      logMessage(`「${lesson.title}」は既にクリアしています。`);
      return;
    }

    progress[lesson.id] = lesson.maxProgress;

    for (let i = 0; i < lessonIndex; i++) {
      const prevLesson = LESSONS[i];
      if (progress[prevLesson.id] < prevLesson.maxProgress) {
        progress[prevLesson.id] = prevLesson.maxProgress;
      }
    }

    saveAllProgress(data);

    logMessage(`「${lesson.title}」をクリアしました。（${currentPage}ページ目）`);

    // ★ ここでマスコットに褒め台詞をしゃべらせる
    mascotSayRandomPraise();
    
    registerActivity();
    updateStreakDisplay();

    const isFinal = lesson.id === "finish_6";
    renderAll();

    const mapEl = document.getElementById("map");
    const targetNode = mapEl
      ? mapEl.querySelector(`.node[data-lesson-id="${lessonId}"]`)
      : null;

    showSuccessEffect();
    triggerConfetti(targetNode);
    playSuccessSound(isFinal);
  }

  /* ===== キャンバス関連グローバル ===== */
  let pendingLessonId = null;
  let currentPanelMode = null;
  let currentPanelIndex = null;
  let drawingCanvas = null;
  let drawingCtx = null;
  let isDrawing = false;
  let lastX = 0, lastY = 0;
  let draggingBalloon = null;
  let selectedBalloon = null; // { panelIndex: number, balloonIndex: number } or null

  /* ★ ズーム用グローバル ★ */
  let currentZoom = 1;
  let zoomMin = 1;
  let zoomMax = 3;

  /* ★ パン関連 ★ */
  let panX = 0;
  let panY = 0;
  let isPanning = false;
  let panStartClientX = 0;
  let panStartClientY = 0;
  let panStartX = 0;
  let panStartY = 0;

  /* ★ ピンチ用 ★ */
  let pinchBalloonIndex = null;
  let pinchStartDistance = null;
  let pinchStartZoom = 1;
  let pinchStartCenter = null;
  let pinchStartPanX = 0;
  let pinchStartPanY = 0;

  function applyCanvasZoom() {
    if (!drawingCanvas) return;
    drawingCanvas.style.transformOrigin = "center center";
    drawingCanvas.style.transform =
      `translate(${panX}px, ${panY}px) scale(${currentZoom})`;
  }

  function resetZoomForMode() {
    if (currentPanelMode === "text") {
      zoomMin = 0.5;
      zoomMax = 3;
      currentZoom = 1;
    } else if (
      currentPanelMode === "rough" ||
      currentPanelMode === "pen"   ||
      currentPanelMode === "beta"  ||
      currentPanelMode === "tone"
    ) {
      zoomMin = 1;
      zoomMax = 3;
      currentZoom = 1;
    } else {
      zoomMin = 1;
      zoomMax = 1;
      currentZoom = 1;
    }

    panX = 0;
    panY = 0;

    applyCanvasZoom();
  }

  function clearCanvasListeners(canvas) {
    if (!canvas) return;
    canvas.onmousedown = canvas.onmousemove = canvas.onmouseup = canvas.onmouseleave = null;
    canvas.ontouchstart = canvas.ontouchmove = canvas.ontouchend = null;
    canvas.oncontextmenu = null;
    canvas.onpointerdown = canvas.onpointermove = canvas.onpointerup = canvas.onpointercancel = null;
  }

  function getPanelIndexFromLesson(lessonId) {
    const parts = lessonId.split("_");
    if (parts.length < 2) return null;
    const n = parseInt(parts[1], 10);
    return isNaN(n) ? null : n;
  }

function getStrokeWidth(evt, mode) {
  // pressure を無視してほぼ一定の線幅にする
  const base = mode === "pen" ? 3.0 : 2.0;
  return base;
}

function getCanvasPos(evt) {
  if (!drawingCanvas) return { x: 0, y: 0 };
  const canvas = drawingCanvas;

  // ★ ペンの場合は offsetX が正常ではない機種が多い
  const isPen = evt.pointerType === "pen";

  const canUseOffset =
    !isPen && !evt.touches && !evt.changedTouches &&
    typeof evt.offsetX === "number" &&
    typeof evt.offsetY === "number";

  if (canUseOffset) {
    const scaleX = canvas.width  / canvas.clientWidth;
    const scaleY = canvas.height / canvas.clientHeight;
    return {
      x: evt.offsetX * scaleX,
      y: evt.offsetY * scaleY
    };
  }

  // ★ ここから下は rect 基準
  const rect = canvas.getBoundingClientRect();
  let clientX, clientY;

  if (evt.touches && evt.touches.length > 0) {
    clientX = evt.touches[0].clientX;
    clientY = evt.touches[0].clientY;
  } else if (evt.changedTouches && evt.changedTouches.length > 0) {
    clientX = evt.changedTouches[0].clientX;
    clientY = evt.changedTouches[0].clientY;
  } else {
    clientX = evt.clientX;
    clientY = evt.clientY;
  }

  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top)  * (canvas.height / rect.height);
  return { x, y };
}

  function normalizeRect(x1, y1, x2, y2) {
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);
    return { x, y, w, h };
  }

  function pointInRect(x, y, rect) {
    return x >= rect.x && y >= rect.y && x <= rect.x + rect.w && y <= rect.y + rect.h;
  }

  function saveDrawPage(pageData) {
    const all = loadDrawAll();
    all[String(currentPage)] = pageData;
    saveDrawAll(all);
  }

  // ===== ペン線のスムージング／入り抜き =====
  function smoothStrokePoints(pts) {
    if (!pts || pts.length <= 2) return pts || [];
    const res = [];
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1] || pts[i];
      res.push({
        x: (p0.x + p1.x + p2.x) / 3,
        y: (p0.y + p1.y + p2.y) / 3,
        w: p1.w
      });
    }
    return res;
  }

function taperFactor(i, n) {
  if (n <= 1) return 1;

  const t = i / (n - 1);          // 0〜1
  const s = Math.sin(Math.PI * t); // 0〜1（真ん中が1）

  // 両端 0 → 0.4 に持ち上げる（0.4〜1.0 の範囲）
  return 0.4 + 0.6 * s;
}

  // 吹き出しヒットテスト
  function findBalloonAt(x, y) {
    const pageData = activeDrawPageData;
    if (!pageData || !pageData.text) return -1;
    const arr = pageData.text[currentPanelIndex] || [];
    for (let i = arr.length - 1; i >= 0; i--) {
      const b = arr[i];
      const scaleB = b.scale || 1;
      const rx = BALLOON_RX * scaleB;
      const ry = BALLOON_RY * scaleB;
      const dx = x - b.x;
      const dy = y - b.y;
      const v = (dx*dx)/(rx*rx) + (dy*dy)/(ry*ry);
      if (v <= 1) return i;
    }
    return -1;
  }

  function measureBalloonSize(text, fontSize) {
    const lineTexts = String(text).split(/[\/\n]/);
    const columns = lineTexts.map(line => Array.from(line));

    let maxLen = 0;
    columns.forEach(chars => {
      if (chars.length > maxLen) maxLen = chars.length;
    });

    const lineHeight = fontSize * 1.1;
    const colWidth   = fontSize + 4;

    const textHeight = lineHeight * maxLen;
    const textWidth  = colWidth * columns.length;

    const padding = fontSize * 1.2;

    return {
      rx: textWidth  / 2 + padding,
      ry: textHeight / 2 + padding
    };
  }

  // 句読点・三点リーダ専用の縦書き描画
  function drawVerticalBalloonText(ctx, text, centerX, centerY) {
    const fontSize = 18;

    ctx.save();
    ctx.font =
      `${fontSize}px ` +
      `"やさしさアンチック","新コミック体","源暎アンチック","ノバンチカ源",` +
      `"Yu Mincho","Hiragino Mincho ProN",serif`;
    ctx.fillStyle = "#111827";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const lineTexts = String(text).split(/[\/\n]/);
    const columns = lineTexts.map(line => Array.from(line));

    let maxLen = 0;
    columns.forEach(chars => {
      if (chars.length > maxLen) maxLen = chars.length;
    });

    const lineHeight  = fontSize * 1.1;
    const totalHeight = lineHeight * (maxLen - 1);
    const topY        = centerY - totalHeight / 2;

    const colGap     = fontSize + 4;
    const totalWidth = colGap * (columns.length - 1);
    const rightX     = centerX + totalWidth / 2;

    columns.forEach((chars, colIndex) => {
      const x = rightX - colGap * colIndex;

      chars.forEach((ch, i) => {
        const baseY = topY + lineHeight * i;
        let drawX   = x;
        let drawY   = baseY;

        if (ch === "、" || ch === "。") {
          drawX = x - fontSize * 0.12;
          drawY = baseY + fontSize * 0.15;
          ctx.fillText(ch, drawX, drawY);
          return;
        }

        if (ch === "…") {
          const dotGap = fontSize * 0.32;
          const r      = fontSize * 0.07;
          for (let k = -1; k <= 1; k++) {
            ctx.beginPath();
            ctx.arc(drawX, baseY + dotGap * k, r, 0, Math.PI * 2);
            ctx.fill();
          }
          return;
        }

        if (ch === "ー" || ch === "〜" || ch === "～") {
          ctx.save();
          ctx.translate(drawX, drawY);
          ctx.rotate(Math.PI / 2);
          ctx.fillText(ch, 0, 0);
          ctx.restore();
          return;
        }

        ctx.fillText(ch, drawX, baseY);
      });
    });

    ctx.restore();
  }

function drawBalloonTail(ctx, b, rx, ry, scaleB, baseStroke) {
  const side = b.tailSide === "right" ? "right" : "left";
  const dir  = side === "right" ? 1 : -1;

  const tCenter = 0.42;
  const tSpread = 0.07;

  function ellipseSidePoint(tOffset) {
    const y = b.y + ry * (tCenter + tOffset);
    const ny = (y - b.y) / ry;
    const dx = rx * Math.sqrt(1 - ny * ny);
    const x  = b.x + dir * dx;
    return { x, y };
  }

  const p1 = ellipseSidePoint(-tSpread);
  const p2 = ellipseSidePoint(+tSpread);

  const tipX = b.x + dir * (rx + 18);
  const tipY = b.y + ry * 0.50;

  // スケールに合わせた線幅（2〜8px にクランプ）
  const base = baseStroke ?? 2;
  const strokeW = Math.min(8, Math.max(2, base * (scaleB || 1)));

  ctx.save();

  // 中身の白三角
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(tipX, tipY);
  ctx.lineTo(p2.x, p2.y);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // 吹き出し本体との境目を消す白線
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = strokeW;
  ctx.stroke();

  // 黒いアウトライン
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(tipX, tipY);
  ctx.lineTo(p2.x, p2.y);
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = strokeW;
  ctx.stroke();

  ctx.restore();
}
  /* ===== ベタ用塗りつぶし ===== */
  function floodFillBeta(ctx, startX, startY, rect) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    const sx = Math.floor(startX);
    const sy = Math.floor(startY);

    if (!rect) return;

    const rx = Math.max(0, Math.floor(rect.x));
    const ry = Math.max(0, Math.floor(rect.y));
    const rw = Math.min(w - rx, Math.floor(rect.w));
    const rh = Math.min(h - ry, Math.floor(rect.h));

    if (
      sx < rx || sx >= rx + rw ||
      sy < ry || sy >= ry + rh
    ) {
      return;
    }

    const img = ctx.getImageData(0, 0, w, h);
    const data = img.data;

    function idx(x, y) {
      return (y * w + x) * 4;
    }

    const DARK_BOUNDARY = 200;

    function isFillable(i) {
      if (isBetaBlackPixel(data, i)) return false;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3;

      return brightness >= DARK_BOUNDARY;
    }

    const stack = [[sx, sy]];

    while (stack.length) {
      const [x, y] = stack.pop();
      if (x < rx || x >= rx + rw || y < ry || y >= ry + rh) continue;
      const i = idx(x, y);
      if (!isFillable(i)) continue;

      data[i]     = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 255;

      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }

    ctx.putImageData(img, 0, 0);

    expandBetaRegion(ctx, rect, 1);
  }

  function isBetaBlackPixel(data, index) {
    return (
      data[index]     === 0 &&
      data[index + 1] === 0 &&
      data[index + 2] === 0 &&
      data[index + 3] === 255
    );
  }

  function expandBetaRegion(ctx, rect, iterations = 1) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    const rx = Math.max(0, Math.floor(rect.x));
    const ry = Math.max(0, Math.floor(rect.y));
    const rw = Math.min(w - rx, Math.floor(rect.w));
    const rh = Math.min(h - ry, Math.floor(rect.h));

    function idx(x, y) {
      return (y * w + x) * 4;
    }

    const img = ctx.getImageData(0, 0, w, h);
    const data = img.data;

    for (let it = 0; it < iterations; it++) {
      const prev = new Uint8ClampedArray(data);

      for (let y = ry; y < ry + rh; y++) {
        for (let x = rx; x < rx + rw; x++) {
          const i = idx(x, y);
          if (isBetaBlackPixel(prev, i)) continue;

          let hasBlackNeighbor = false;
          for (let dy = -1; dy <= 1 && !hasBlackNeighbor; dy++) {
            for (let dx = -1; dx <= 1 && !hasBlackNeighbor; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx;
              const ny = y + dy;
              if (nx < rx || nx >= rx + rw || ny < ry || ny >= ry + rh) continue;
              const ni = idx(nx, ny);
              if (isBetaBlackPixel(prev, ni)) {
                hasBlackNeighbor = true;
              }
            }
          }

          if (hasBlackNeighbor) {
            data[i]     = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
            data[i + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(img, 0, 0);
  }

  function applyBetaFills(ctx, pageData) {
    if (!pageData || !pageData.beta) return;
    for (const [panelIndex, fills] of Object.entries(pageData.beta)) {
      const rect = pageData.frames[panelIndex];
      if (!rect) continue;
      const r = {
        x: rect.x,
        y: rect.y,
        w: rect.w,
        h: rect.h
      };
      fills.forEach(f => {
        floodFillBeta(ctx, f.x, f.y, r);
      });
    }
  }

  /* ===== トーン用塗りつぶし（網点パターン） ===== */
  function applyToneFills(ctx, pageData) {
    if (!pageData || !pageData.tone) return;
    if (!tonePatternData) return;

    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    const baseImg = ctx.getImageData(0, 0, w, h);
    const baseData = baseImg.data;

    const outImg = ctx.getImageData(0, 0, w, h);
    const outData = outImg.data;

    const visited = new Uint8Array(w * h);

    const pW = tonePatternData.width;
    const pH = tonePatternData.height;
    const pData = tonePatternData.data;

    const DARK_BOUNDARY = 200;

    function floodPanel(panelIndex, seed) {
      const rect = pageData.frames[panelIndex];
      if (!rect) return;

      const rx = Math.max(0, Math.floor(rect.x));
      const ry = Math.max(0, Math.floor(rect.y));
      const rw = Math.min(w - rx, Math.floor(rect.w));
      const rh = Math.min(h - ry, Math.floor(rect.h));

      const sx = Math.floor(seed.x);
      const sy = Math.floor(seed.y);

      if (sx < rx || sx >= rx + rw || sy < ry || sy >= ry + rh) return;

      const stack = [[sx, sy]];

      while (stack.length) {
        const [x, y] = stack.pop();
        if (x < rx || x >= rx + rw || y < ry || y >= ry + rh) continue;

        const pos = y * w + x;
        if (visited[pos]) continue;
        visited[pos] = 1;

        const i = pos * 4;
        const r = baseData[i];
        const g = baseData[i + 1];
        const b = baseData[i + 2];
        const brightness = (r + g + b) / 3;

        if (brightness < DARK_BOUNDARY) continue;

        const tx = ((x % pW) + pW) % pW;
        const ty = ((y % pH) + pH) % pH;
        const ti = (ty * pW + tx) * 4;

        outData[i]     = pData[ti];
        outData[i + 1] = pData[ti + 1];
        outData[i + 2] = pData[ti + 2];
        outData[i + 3] = pData[ti + 3];

        stack.push([x + 1, y]);
        stack.push([x - 1, y]);
        stack.push([x, y + 1]);
        stack.push([x, y - 1]);
      }
    }

    for (const [panelIndex, fills] of Object.entries(pageData.tone)) {
      fills.forEach(f => floodPanel(panelIndex, f));
    }

    ctx.putImageData(outImg, 0, 0);
  }

  /* ===== ストローク描画共通 ===== */
function drawStrokeLayerOnCtx(ctx, pageData, layerName, strokeStyle, defaultWidth, useVariableWidth) {
  const layer = pageData[layerName] || {};
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = strokeStyle;

  for (const [panelIndex, paths] of Object.entries(layer)) {
    const rect = pageData.frames[panelIndex];
    if (rect) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.w, rect.h);
      ctx.clip();
    }

    paths.forEach(path => {
      let pts = path.points;
      if (!pts || pts.length < 2) return;

      if (useVariableWidth) {
        pts = smoothStrokePoints(pts);
      }
      const n = pts.length;

      // ① 可変幅オフ、または「ごく短い線」は一定幅で描画
      if (!useVariableWidth || n < 4) {
        ctx.lineWidth = defaultWidth;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < n; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
      } else {
        // ② それ以外は入り抜きありで描画
        for (let i = 0; i < n - 1; i++) {
          const p0 = pts[i];
          const p1 = pts[i + 1];
          const baseW = p0.w != null ? p0.w : defaultWidth;
          const w = Math.max(1.0, baseW * taperFactor(i, n)); // 両端細め・真ん中太め
          ctx.lineWidth = w;
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
      }
    });

    if (rect) ctx.restore();
  }

  ctx.restore();
}

function drawBalloonsOnCtx(ctx, pageData, selected, balloonStrokeBase) {
  ctx.save();
  for (const [panelIndex, balloons] of Object.entries(pageData.text)) {
    const rect = pageData.frames[panelIndex];
    balloons.forEach((b, idx) => {
      if (rect) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(rect.x, rect.y, rect.w, rect.h);
        ctx.clip();
      }

      const fontSize = 18;
      const baseSize = measureBalloonSize(b.text, fontSize);
      const scaleB   = b.scale || 1;
      const rx = baseSize.rx * scaleB;
      const ry = baseSize.ry * scaleB;

      const isSelected =
        selected &&
        selected.panelIndex === Number(panelIndex) &&
        selected.balloonIndex === idx;

      // ← オプションから基準線幅を受け取る
      const baseStroke = balloonStrokeBase ?? 2;
      const strokeW = Math.min(8, Math.max(2, baseStroke * scaleB));

      ctx.beginPath();
      ctx.ellipse(b.x, b.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = isSelected
        ? "rgba(254,249,195,0.98)"
        : "rgba(255,255,255,0.97)";
      ctx.fill();
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = strokeW;
      ctx.stroke();

      // 尾も同じ基準を使う
      drawBalloonTail(ctx, b, rx, ry, scaleB, baseStroke);

      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.scale(scaleB, scaleB);
      drawVerticalBalloonText(ctx, b.text, 0, 0);
      ctx.restore();

      if (rect) ctx.restore();
    });
  }
  ctx.restore();
}

  function drawActivePanelOverlay(ctx, pageData, panelIndex) {
    const rect = panelIndex && pageData.frames[panelIndex];
    if (!rect) return;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath();
    ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.fill("evenodd");
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 3;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  }

function drawPageContent(ctx, pageData, options = {}) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const activeIndex = options.activePanelIndex ?? null;
  const selected = options.selectedBalloon ?? null;
  const balloonStrokeBase = options.balloonStrokeBase ?? 2;

  const skipPaperBase = options.skipPaperBase === true;
  // ★ 追加：枠線の太さ（デフォルト 5）
  const frameLineWidth = options.frameLineWidth ?? 5;

  if (skipPaperBase) {
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  } else {
    drawPaperBase(ctx, w, h);
  }

  // コマ枠
  ctx.save();
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = frameLineWidth;  // ★ ここをオプションで指定
  Object.values(pageData.frames).forEach(rect => {
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });
  ctx.restore();

  // （以下ラフ・ペン・ベタ・トーン・吹き出し処理はそのまま）
  const roughColor = pageData.roughColor || "black";
  let roughStroke = "#111827";
  if (roughColor === "blue") roughStroke = "#60a5fa";
  if (roughColor === "gray") roughStroke = "#9ca3af";

  drawStrokeLayerOnCtx(ctx, pageData, "rough", roughStroke, 2, false);
  drawStrokeLayerOnCtx(ctx, pageData, "pen",   "#111827",   3, true);

  applyBetaFills(ctx, pageData);
  applyToneFills(ctx, pageData);

  drawBalloonsOnCtx(ctx, pageData, selected, balloonStrokeBase);

  if (activeIndex) {
    drawActivePanelOverlay(ctx, pageData, activeIndex);
  }
}

function redrawCanvas() {
  if (!drawingCanvas || !drawingCtx) return;
  const pageData = activeDrawPageData || getDrawPage(currentPage).pageData;
  const ctx = drawingCtx;
  ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
  drawPageContent(ctx, pageData, {
    activePanelIndex: currentPanelIndex,
    selectedBalloon: selectedBalloon,
    skipPaperBase: currentPanelMode === "beta" || currentPanelMode === "tone",
    balloonStrokeBase: 1.0,  // 画面用の吹き出し線
    frameLineWidth: 5        // 画面プレビューの枠線の太さ（今まで通り）
  });
}

  // ===== ズーム（ホイール + ピンチ） =====
  function onWheelZoom(evt) {
    if (!drawingCanvas) return;
    evt.preventDefault();

    const rect = drawingCanvas.getBoundingClientRect();
    const x = (evt.clientX - rect.left) * (drawingCanvas.width  / rect.width);
    const y = (evt.clientY - rect.top)  * (drawingCanvas.height / rect.height);

    const delta = -evt.deltaY;
    const step  = 0.1;
    const factor = delta > 0 ? (1 + step) : (1 - step);

    const pageData = activeDrawPageData;

    if (currentPanelMode === "text") {
      const idx = findBalloonAt(x, y);
      if (idx === -1 || !pageData) return;
      const arr = pageData.text[currentPanelIndex] || [];
      const b = arr[idx];
      const base = b.scale || 1;
      b.scale = Math.min(3, Math.max(0.3, base * factor));
      saveDrawPage(pageData);
      redrawCanvas();
      return;
    }

    currentZoom *= factor;
    if (currentZoom < zoomMin) currentZoom = zoomMin;
    if (currentZoom > zoomMax) currentZoom = zoomMax;
    applyCanvasZoom();
  }

  function distanceTouches(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx*dx + dy*dy);
  }

  function centerTouches(t1, t2) {
    return {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2
    };
  }

  function onTouchStartZoom(evt) {
    if (evt.touches.length === 2 && drawingCanvas) {
      evt.preventDefault();
      pinchStartDistance = distanceTouches(evt.touches[0], evt.touches[1]);
      pinchStartCenter = centerTouches(evt.touches[0], evt.touches[1]);
      pinchStartPanX = panX;
      pinchStartPanY = panY;

      const pageData = activeDrawPageData;

      if (currentPanelMode === "text" && pageData) {
        const rect = drawingCanvas.getBoundingClientRect();
        const midX = pinchStartCenter.x;
        const midY = pinchStartCenter.y;
        const x = (midX - rect.left) * (drawingCanvas.width  / rect.width);
        const y = (midY - rect.top)  * (drawingCanvas.height / rect.height);

        const idx = findBalloonAt(x, y);
        if (idx !== -1) {
          const arr = pageData.text[currentPanelIndex] || [];
          pinchBalloonIndex = idx;
          pinchStartZoom = arr[idx].scale || 1;
          return;
        }
      }

      pinchBalloonIndex = null;
      pinchStartZoom = currentZoom;
    }
  }

  function onTouchMoveZoom(evt) {
    if (evt.touches.length === 2 && pinchStartDistance && drawingCanvas) {
      evt.preventDefault();
      const newDist = distanceTouches(evt.touches[0], evt.touches[1]);
      const newCenter = centerTouches(evt.touches[0], evt.touches[1]);
      const scale = newDist / pinchStartDistance;

      const pageData = activeDrawPageData;

      if (currentPanelMode === "text" && pinchBalloonIndex != null && pageData) {
        const arr = pageData.text[currentPanelIndex] || [];
        const b = arr[pinchBalloonIndex];
        if (!b) return;
        b.scale = Math.min(3, Math.max(0.3, pinchStartZoom * scale));
        saveDrawPage(pageData);
        redrawCanvas();
        return;
      }

      currentZoom = pinchStartZoom * scale;
      currentZoom = Math.min(zoomMax, Math.max(zoomMin, currentZoom));

      const dx = newCenter.x - pinchStartCenter.x;
      const dy = newCenter.y - pinchStartCenter.y;
      panX = pinchStartPanX + dx;
      panY = pinchStartPanY + dy;

      applyCanvasZoom();
    }
  }

  function onTouchEndZoom(evt) {
    if (evt.touches.length < 2) {
      pinchStartDistance = null;
      pinchStartCenter = null;
      pinchBalloonIndex = null;
    }
  }

  /* ===== レッスンごとのキャンバスセットアップ ===== */
  function setupCanvasForLesson(lesson) {
    selectedBalloon = null;
    const panelBody = document.getElementById("sidePanelBody");
    const exportBtn = document.getElementById("sidePanelExportBtn");
    const [group] = lesson.id.split("_");
    const index = getPanelIndexFromLesson(lesson.id);
    currentPanelIndex = index;

    if (group === "frame")      currentPanelMode = "frame";
    else if (group === "rough") currentPanelMode = "rough";
    else if (group === "text")  currentPanelMode = "text";
    else if (group === "pen")   currentPanelMode = "pen";
    else if (group === "beta")  currentPanelMode = "beta";
    else if (group === "tone")  currentPanelMode = "tone";
    else                        currentPanelMode = "info";

    if (["beta", "tone", "finish"].includes(group)) {
      exportBtn.style.display = "inline-block";
    } else {
      exportBtn.style.display = "none";
    }

    if (currentPanelMode === "info") {
      panelBody.innerHTML =
        "この後の作業は描画ソフトやアプリをご利用ください。\n" +
        "「書き出す」ボタンを押し、書き出した画像データをソフトやアプリに読み込んで作業を行ってください。";
      drawingCanvas = null;
      drawingCtx = null;
      activeDrawPageData = null;
      return;
    }

    let infoText = "";
    let toolbarHtml = "";

    if (currentPanelMode === "frame") {
      infoText = "ドラッグしてこのコマの枠線を引きます。（後の下描き・台詞・ペン入れの作業範囲になります）";
      toolbarHtml = `
        <div class="canvas-toolbar">
          <span>ドラッグで枠線作成 / このコマのみ保存されます。</span>
          <button id="clearFrameBtn">このコマの枠を消す</button>
        </div>`;
    } else if (currentPanelMode === "rough") {
      infoText = `マウス・ペン・指で下描きを行います。「${lesson.title}」のコマ内のみ描けます。`;
      toolbarHtml = `
        <div class="canvas-toolbar">
          <span>コマ内にラフを描いてください。</span>
        </div>`;
    } else if (currentPanelMode === "text") {
      infoText = `右クリックで吹き出しと台詞を追加します。左ドラッグで吹き出しを移動、スクロールで拡大縮小。`;
      toolbarHtml = `
        <div class="canvas-toolbar">
          <span>このコマ内だけ編集されます。（/ や ｜ を入れると簡易改行）</span>
          <button id="tailToggleBtn">尾を反転する</button>
          <button id="editBalloonTextBtn">台詞修正</button>
        </div>`;
    } else if (currentPanelMode === "pen") {
      infoText = `下描きを元にペン入れします。ラフ色を変更したり、不要になったら削除できます。`;
      toolbarHtml = `
        <div class="canvas-toolbar">
          <button id="draftBlueBtn">下描きを水色にする</button>
          <button id="draftGrayBtn">下描きをグレーにする</button>
          <button id="draftDeleteBtn">下描きを削除する</button>
        </div>`;
    } else if (currentPanelMode === "beta") {
      infoText = `ペン入れ済みの線で囲った部分をクリックしてベタ塗りを行います。`;
      toolbarHtml = `
        <div class="canvas-toolbar">
          <span>コマ内をクリックすると黒で塗りつぶします。</span>
          <button id="betaUndoBtn">取り消し</button>
        </div>`;
    } else if (currentPanelMode === "tone") {
      infoText = `ペン入れ済みの線で囲った部分をクリックしてトーン（網点）を貼ります。`;
      toolbarHtml = `
        <div class="canvas-toolbar">
          <span>コマ内をクリックすると網点（45°・20％程度）で塗りつぶします。</span>
          <button id="toneUndoBtn">取り消し</button>
        </div>`;
    }

    panelBody.innerHTML = `
      <div style="margin-bottom:0; font-size:13px;">${infoText}</div>
      ${toolbarHtml}
      <div class="canvas-wrapper">
        <canvas id="pageCanvas" width="${EDIT_CANVAS_WIDTH}" height="${EDIT_CANVAS_HEIGHT}"></canvas>
      </div>
    `;

    drawingCanvas = document.getElementById("pageCanvas");
    drawingCtx = drawingCanvas.getContext("2d");
    clearCanvasListeners(drawingCanvas);

    const { pageData } = getDrawPage(currentPage);
    if (!pageData.beta) pageData.beta = {};
    if (!pageData.tone) pageData.tone = {};
    activeDrawPageData = pageData;

    resetZoomForMode();
    redrawCanvas();

    if (currentPanelMode === "frame") {
      const clearBtn = document.getElementById("clearFrameBtn");
      if (clearBtn) {
        clearBtn.onclick = () => {
          delete pageData.frames[currentPanelIndex];
          const all = loadDrawAll();
          all[String(currentPage)] = pageData;
          saveDrawAll(all);
          redrawCanvas();
        };
      }

    } else if (currentPanelMode === "pen") {
      const blueBtn = document.getElementById("draftBlueBtn");
      const grayBtn = document.getElementById("draftGrayBtn");
      const delBtn  = document.getElementById("draftDeleteBtn");

      if (blueBtn) {
        blueBtn.onclick = () => {
          pageData.roughColor = "blue";
          saveDrawPage(pageData);
          redrawCanvas();
        };
      }
      if (grayBtn) {
        grayBtn.onclick = () => {
          pageData.roughColor = "gray";
          saveDrawPage(pageData);
          redrawCanvas();
        };
      }
      if (delBtn) {
        delBtn.onclick = () => {
          pageData.rough = {};
          saveDrawPage(pageData);
          redrawCanvas();
        };
      }

    } else if (currentPanelMode === "text") {
      const tailBtn = document.getElementById("tailToggleBtn");
      const editBtn = document.getElementById("editBalloonTextBtn");

      if (tailBtn) {
        tailBtn.onclick = () => {
          if (!selectedBalloon || selectedBalloon.panelIndex !== currentPanelIndex) return;
          const arr = pageData.text[currentPanelIndex] || [];
          const b = arr[selectedBalloon.balloonIndex];
          if (!b) return;
          b.tailSide = (b.tailSide === "right") ? "left" : "right";
          saveDrawPage(pageData);
          selectedBalloon = null;
          redrawCanvas();
        };
      }

      if (editBtn) {
        editBtn.onclick = () => {
          if (!selectedBalloon || selectedBalloon.panelIndex !== currentPanelIndex) return;
          const arr = pageData.text[currentPanelIndex] || [];
          const b = arr[selectedBalloon.balloonIndex];
          if (!b) return;
          const newText = window.prompt(
            "台詞を修正してください（/ や ｜ で簡易改行）",
            b.text || ""
          );
          if (newText == null) return;
          b.text = newText;
          saveDrawPage(pageData);
          selectedBalloon = null;
          redrawCanvas();
        };
      }
    } else if (currentPanelMode === "beta") {
      const undoBtn = document.getElementById("betaUndoBtn");
      if (undoBtn) {
        undoBtn.onclick = () => {
          const list = pageData.beta[currentPanelIndex] || [];
          if (list.length > 0) {
            list.pop();
            pageData.beta[currentPanelIndex] = list;
            saveDrawPage(pageData);
            redrawCanvas();
          }
        };
      }
    } else if (currentPanelMode === "tone") {
      const undoBtn = document.getElementById("toneUndoBtn");
      if (undoBtn) {
        undoBtn.onclick = () => {
          const list = pageData.tone[currentPanelIndex] || [];
          if (list.length > 0) {
            list.pop();
            pageData.tone[currentPanelIndex] = list;
            saveDrawPage(pageData);
            redrawCanvas();
          }
        };
      }
    }

    let frameStart = null;

    function handleDown(evt) {
      if (evt.touches && evt.touches.length > 1) return;
      evt.preventDefault();
      const { x, y } = getCanvasPos(evt);

      if (currentPanelMode === "frame") {
        frameStart = { x, y };
      } else if (currentPanelMode === "rough" || currentPanelMode === "pen") {
        isDrawing = true;
        lastX = x;
        lastY = y;

        const layer = currentPanelMode === "rough" ? pageData.rough : pageData.pen;
        if (!layer[currentPanelIndex]) layer[currentPanelIndex] = [];

        let w;
        if (currentPanelMode === "pen") w = getStrokeWidth(evt, "pen");
        else w = 2.0;

        layer[currentPanelIndex].push({ points: [{ x, y, w }] });
      }
    }

    function handleMove(evt) {
      if (!drawingCanvas) return;

      if (currentPanelMode === "frame") {
        if (!frameStart) return;
        const { x, y } = getCanvasPos(evt);
        redrawCanvas();
        drawingCtx.save();
        drawingCtx.strokeStyle = "#22c55e";
        drawingCtx.lineWidth = 2;
        drawingCtx.setLineDash([8, 4]);
        drawingCtx.strokeRect(frameStart.x, frameStart.y, x - frameStart.x, y - frameStart.y);
        drawingCtx.restore();
      } else if ((currentPanelMode === "rough" || currentPanelMode === "pen") && isDrawing) {
        const pos = getCanvasPos(evt);
        let x = pos.x;
        let y = pos.y;

        const dx = x - lastX;
        const dy = y - lastY;
        if (dx * dx + dy * dy < 4) return;

        const rect = pageData.frames[currentPanelIndex];
        if (rect && !pointInRect(x, y, rect)) {
          lastX = x; lastY = y;
          return;
        }

        const layer = currentPanelMode === "rough" ? pageData.rough : pageData.pen;
        const paths = layer[currentPanelIndex];
        if (!paths || paths.length === 0) return;
        const path = paths[paths.length - 1];

        let w;
        if (currentPanelMode === "pen") {
          w = getStrokeWidth(evt, "pen");
        } else {
          w = 2.0;
        }

        path.points.push({ x, y, w });
        lastX = x; lastY = y;
        redrawCanvas();
      }
    }

    function handleUp(evt) {
      if (currentPanelMode === "frame") {
        if (frameStart) {
          const { x, y } = getCanvasPos(evt);
          const rect = normalizeRect(frameStart.x, frameStart.y, x, y);
          pageData.frames[currentPanelIndex] = rect;
          saveDrawPage(pageData);
          frameStart = null;
          redrawCanvas();
        }
      } else if (currentPanelMode === "rough" || currentPanelMode === "pen") {
        if (isDrawing) {
          isDrawing = false;
          saveDrawPage(pageData);
        }
      }
    }

    function betaClick(evt) {
      evt.preventDefault();
      const { x, y } = getCanvasPos(evt);
      const rect = pageData.frames[currentPanelIndex];
      if (!rect || !pointInRect(x, y, rect)) return;

      if (!pageData.beta[currentPanelIndex]) pageData.beta[currentPanelIndex] = [];
      pageData.beta[currentPanelIndex].push({ x, y });
      saveDrawPage(pageData);
      redrawCanvas();
    }

    function toneClick(evt) {
      evt.preventDefault();
      const { x, y } = getCanvasPos(evt);
      const rect = pageData.frames[currentPanelIndex];
      if (!rect || !pointInRect(x, y, rect)) return;

      if (!pageData.tone[currentPanelIndex]) pageData.tone[currentPanelIndex] = [];
      pageData.tone[currentPanelIndex].push({ x, y });
      saveDrawPage(pageData);
      redrawCanvas();
    }

    function textMouseDown(evt) {
      evt.preventDefault();
      if (evt.touches && evt.touches.length > 1) return;

      const { x, y } = getCanvasPos(evt);
      const idx = findBalloonAt(x, y);

      const isTouch =
        evt.pointerType === "touch" ||
        (evt.touches && evt.touches.length > 0);

      if (isTouch) {
        if (evt.touches && evt.touches.length > 1) {
          return;
        }
        if (idx !== -1) {
          draggingBalloon = {
            index: idx,
            startX: x,
            startY: y,
            hasMoved: false
          };
        } else {
          selectedBalloon = null;
          redrawCanvas();
          textContextMenu(evt);
        }
        return;
      }

      if (idx !== -1) {
        draggingBalloon = {
          index: idx,
          startX: x,
          startY: y,
          hasMoved: false
        };
      } else {
        selectedBalloon = null;
        redrawCanvas();
      }
    }

    function textMouseMove(evt) {
      if (!draggingBalloon) return;
      evt.preventDefault();
      const { x, y } = getCanvasPos(evt);

      const dx = x - draggingBalloon.startX;
      const dy = y - draggingBalloon.startY;
      const dist2 = dx * dx + dy * dy;

      if (dist2 > 9) {
        draggingBalloon.hasMoved = true;
      } else if (!draggingBalloon.hasMoved) {
        return;
      }

      const arr = pageData.text[currentPanelIndex] || [];
      const b = arr[draggingBalloon.index];
      if (!b) return;
      const rect = pageData.frames[currentPanelIndex];
      if (rect && !pointInRect(x, y, rect)) return;

      b.x = x;
      b.y = y;
      saveDrawPage(pageData);
      redrawCanvas();
    }

    function textMouseUp(evt) {
      if (!draggingBalloon) return;

      if (!draggingBalloon.hasMoved) {
        selectedBalloon = {
          panelIndex: currentPanelIndex,
          balloonIndex: draggingBalloon.index
        };
        redrawCanvas();
      }

      draggingBalloon = null;
    }

    function textContextMenu(evt) {
      evt.preventDefault();
      const { x, y } = getCanvasPos(evt);
      const rect = pageData.frames[currentPanelIndex];
      if (rect && !pointInRect(x, y, rect)) return;
      const text = window.prompt("台詞（縦書き）を入力してください\n（/ や ｜ で簡易改行）", "");
      if (!text) return;
      if (!pageData.text[currentPanelIndex]) pageData.text[currentPanelIndex] = [];
      pageData.text[currentPanelIndex].push({
        x,
        y,
        text,
        scale: 1,
        tailSide: "left"
      });
      selectedBalloon = null;
      saveDrawPage(pageData);
      redrawCanvas();
    }

    if (currentPanelMode === "text") {
      drawingCanvas.onmousedown   = textMouseDown;
      drawingCanvas.onmousemove   = textMouseMove;
      drawingCanvas.onmouseup     = textMouseUp;
      drawingCanvas.onmouseleave  = textMouseUp;
      drawingCanvas.oncontextmenu = textContextMenu;

      drawingCanvas.ontouchstart  = textMouseDown;
      drawingCanvas.ontouchmove   = textMouseMove;
      drawingCanvas.ontouchend    = textMouseUp;
    } else if (currentPanelMode === "beta") {
      drawingCanvas.onmousedown   = betaClick;
      drawingCanvas.ontouchstart  = betaClick;
      drawingCanvas.onmousemove   = null;
      drawingCanvas.onmouseup     = null;
      drawingCanvas.onmouseleave  = null;
      drawingCanvas.oncontextmenu = evt => evt.preventDefault();
    } else if (currentPanelMode === "tone") {
      drawingCanvas.onmousedown   = toneClick;
      drawingCanvas.ontouchstart  = toneClick;
      drawingCanvas.onmousemove   = null;
      drawingCanvas.onmouseup     = null;
      drawingCanvas.onmouseleave  = null;
      drawingCanvas.oncontextmenu = evt => evt.preventDefault();
    } else {
      drawingCanvas.onmousedown   = handleDown;
      drawingCanvas.onmousemove   = handleMove;
      drawingCanvas.onmouseup     = handleUp;
      drawingCanvas.onmouseleave  = handleUp;

      drawingCanvas.ontouchstart  = handleDown;
      drawingCanvas.ontouchmove   = handleMove;
      drawingCanvas.ontouchend    = handleUp;
    }

    drawingCanvas.addEventListener("wheel", onWheelZoom, { passive: false });
    drawingCanvas.addEventListener("touchstart", onTouchStartZoom, { passive: false });
    drawingCanvas.addEventListener("touchmove",  onTouchMoveZoom,  { passive: false });
    drawingCanvas.addEventListener("touchend",   onTouchEndZoom,   { passive: false });

    // ここから下の pointer 系ハンドラを差し替え
    drawingCanvas.onpointerdown = evt => {
      // ペン入れ・ラフ：左ボタン or ペン先で描画開始、中ボタンでパン
      if (currentPanelMode === "pen" || currentPanelMode === "rough") {
        if (evt.button === 1) {
          // 中ボタンでパン開始
          isPanning = true;
          panStartClientX = evt.clientX;
          panStartClientY = evt.clientY;
          panStartX = panX;
          panStartY = panY;
        } else if (evt.button === 0) {
          // 左ボタン（マウス） / ペン先 で線を描く
          handleDown(evt);
        }
        return;
      }

      // ベタ・トーン：ペン先でクリック扱い
      if (currentPanelMode === "beta") {
        if (evt.button === 0) betaClick(evt);
        return;
      }
      if (currentPanelMode === "tone") {
        if (evt.button === 0) toneClick(evt);
        return;
      }

      // 台詞：ペン先でドラッグ開始
      if (currentPanelMode === "text") {
        if (evt.button === 0) textMouseDown(evt);
        return;
      }
    };

    drawingCanvas.onpointermove = evt => {
      // ペン入れ・ラフのときだけパン or 描画を更新
      if (currentPanelMode === "pen" || currentPanelMode === "rough") {
        if (isPanning) {
          const dx = evt.clientX - panStartClientX;
          const dy = evt.clientY - panStartClientY;
          panX = panStartX + dx;
          panY = panStartY + dy;
          applyCanvasZoom();
        } else if (isDrawing) {
          handleMove(evt);
        }
      }

      if (currentPanelMode === "text" && draggingBalloon) {
        textMouseMove(evt);
      }
    };

    drawingCanvas.onpointerup = evt => {
      if (currentPanelMode === "pen" || currentPanelMode === "rough") {
        if (isPanning) {
          isPanning = false;
        }
        if (isDrawing) {
          handleUp(evt);
        }
      }

      if (currentPanelMode === "text" && draggingBalloon) {
        textMouseUp(evt);
      }
    };

    drawingCanvas.onpointercancel = drawingCanvas.onpointerup;
  }

  /* ===== サイドパネル開閉 ===== */
  function openLessonPanel(lessonId) {
    const { progress } = loadPageProgress(currentPage);
    const lesson = LESSONS.find(l => l.id === lessonId);
    if (!lesson) return;

    const panel   = document.getElementById("sidePanel");
    const titleEl = document.getElementById("sidePanelTitle");
    if (!panel || !titleEl) return;

    titleEl.textContent = lesson.title;

    pendingLessonId = lessonId;
    setupCanvasForLesson(lesson);
    panel.classList.add("open");
  }

  function closeLessonPanel() {
    const panel = document.getElementById("sidePanel");
    if (panel) panel.classList.remove("open");
    pendingLessonId = null;
    drawingCanvas = null;
    drawingCtx = null;
    draggingBalloon = null;
    activeDrawPageData = null;
  }

  /* ===== マップ描画 ===== */
  function renderMap(progress) {
    const mapEl = document.getElementById("map");
    mapEl.innerHTML = "";

    const perRow = getPerRow();
    const positions = computeGridPositions(LESSONS.length, perRow);

    const nextLesson = getNextIncompleteLesson(progress);
    const nextId = nextLesson ? nextLesson.id : null;

    LESSONS.forEach((lesson, index) => {
      const completed = isLessonCompleted(lesson, progress);
      const isNext    = nextId && lesson.id === nextId;
      const isFuture  = !completed && !isNext;

      const pos = positions[index];

      const node = document.createElement("div");
      node.className = "node";
      node.dataset.lessonId = lesson.id;
      node.style.left = pos.x + "%";
      node.style.top  = pos.y + "%";

      if (completed) {
        node.classList.add("completed");
      } else if (isNext) {
        node.classList.add("unlocked");
      } else if (isFuture) {
        node.classList.add("locked");
      }

      if (isNext) {
        node.classList.add("next-node");
      }

      const circle = document.createElement("div");
      circle.className = "node-circle";
      circle.textContent = index + 1;

      const title = document.createElement("div");
      title.className = "node-title";
      title.textContent = lesson.title;

      const progressText = document.createElement("div");
      progressText.className = "node-progress";
      if (completed) {
        progressText.textContent = "クリア済み";
      } else if (isNext) {
        progressText.textContent = "クリックして進む";
      } else {
        progressText.textContent = "ロック中";
      }

      node.appendChild(circle);
      node.appendChild(title);
      node.appendChild(progressText);

      node.addEventListener("click", () => openLessonPanel(lesson.id));

      mapEl.appendChild(node);
    });

    requestAnimationFrame(drawLinesFromDom);
  }

  function drawLinesFromDom() {
    const mapEl = document.getElementById("map");
    if (!mapEl) return;

    const oldSvg = mapEl.querySelector(".map-lines");
    if (oldSvg) oldSvg.remove();

    const nodes = Array.from(mapEl.querySelectorAll(".node"));
    if (nodes.length < 2) return;

    const mapRect = mapEl.getBoundingClientRect();
    const centers = nodes.map(node => {
      const r = node.getBoundingClientRect();
      const cx = (r.left + r.right) / 2 - mapRect.left;
      const cy = (r.top + r.bottom) / 2 - mapRect.top;
      return { x: cx, y: cy };
    });

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "map-lines");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("viewBox", `0 0 ${mapRect.width} ${mapRect.height}`);
    svg.setAttribute("preserveAspectRatio", "none");

    for (let i = 0; i < centers.length - 1; i++) {
      const p1 = centers[i];
      const p2 = centers[i + 1];
      const path = document.createElementNS(svgNS, "path");
      const d = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
      path.setAttribute("d", d);
      path.setAttribute("class", "map-line");
      svg.appendChild(path);
    }

    mapEl.insertBefore(svg, mapEl.firstChild);
  }

function renderAll() {
  const { data, progress } = loadPageProgress(currentPage);

  // ★ 継続パネル用：「次にやること」を共有する
  const next = getNextIncompleteLesson(progress);
  if (next) {
    // 例: "枠線1コマ目を進めてみましょう"
    window.dailyNextTaskText = `${next.title}を進めてみましょう`;
  } else {
    // 全マス終わっている場合
    window.dailyNextTaskText = "このページは全部クリアしました";
  }

  renderMap(progress);
  updateStreakDisplay();
  updatePageLabel(data);
  updateNextTaskDisplay(progress);
}

// 書き出し用に座標だけ倍率をかけたページデータを作る
function createScaledPageData(pageData, factor) {
  const scaled = JSON.parse(JSON.stringify(pageData));

  // コマ枠
  for (const rect of Object.values(scaled.frames)) {
    rect.x *= factor;
    rect.y *= factor;
    rect.w *= factor;
    rect.h *= factor;
  }

  // ラフ線・ペン線
  ["rough", "pen"].forEach(layerName => {
    const layer = scaled[layerName] || {};
    for (const paths of Object.values(layer)) {
      paths.forEach(path => {
        path.points.forEach(p => {
          p.x *= factor;
          p.y *= factor;
          if (p.w != null) p.w *= factor; // 線幅も倍率をかける
        });
      });
    }
  });

  // 吹き出し（位置と大きさを拡大）
  const textLayer = scaled.text || {};
  for (const balloons of Object.values(textLayer)) {
    balloons.forEach(b => {
      b.x *= factor;
      b.y *= factor;
      b.scale = (b.scale || 1) * factor;  // ← これを追加
    });
  }

  // ベタ／トーンのクリック位置
  ["beta", "tone"].forEach(key => {
    const layer = scaled[key] || {};
    for (const fills of Object.values(layer)) {
      fills.forEach(f => {
        f.x *= factor;
        f.y *= factor;
      });
    }
  });

  return scaled;
}
  
/* ===== 書き出し（内部2倍解像度で再レンダリング） ===== */
function exportCurrentPageImage() {
  const { pageData } = getDrawPage(currentPage);

  // 編集キャンバスの 2倍解像度で一度ラスタライズする
  const WORK_SCALE = 2;
  const WORK_WIDTH  = EDIT_CANVAS_WIDTH  * WORK_SCALE;
  const WORK_HEIGHT = EDIT_CANVAS_HEIGHT * WORK_SCALE;

  const work = document.createElement("canvas");
  work.width  = WORK_WIDTH;
  work.height = WORK_HEIGHT;
  const wctx = work.getContext("2d");

  // ベクターデータを 2倍スケールしたコピーで描画
const scaledData = createScaledPageData(pageData, WORK_SCALE);
drawPageContent(wctx, scaledData, {
  activePanelIndex: null,
  selectedBalloon: null,
  skipPaperBase: true,   // 原稿用紙の枠線を描かない
  frameLineWidth: 10,    // ★ 書き出し用に枠線を太くする（お好みで調整）
  balloonStrokeBase: 2   // ★ 吹き出し線も少し太目にしたい場合は追加
});

  // ここから 600dpi(A4) サイズへ高品質リサイズ
  const off = document.createElement("canvas");
  off.width  = EXPORT_WIDTH;
  off.height = EXPORT_HEIGHT;
  const ctx = off.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, off.width, off.height);

  const scale = Math.min(
    off.width  / work.width,
    off.height / work.height
  );
  const drawW = work.width  * scale;
  const drawH = work.height * scale;
  const offsetX = (off.width  - drawW) / 2;
  const offsetY = (off.height - drawH) / 2;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(work, offsetX, offsetY, drawW, drawH);

  const url = off.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `manga_page${currentPage}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
  /* ===== 起動 ===== */
  window.addEventListener("DOMContentLoaded", () => {
    createTonePatternData();

    renderAll();

document.getElementById("resetProgressBtn").addEventListener("click", () => {
  if (!confirm("本当に全ページの進捗・枠線や下描き・台詞・ペン入れをすべてリセットしますか？\n※連続日数はリセットされません。")) return;
  resetAllPagesProgress();
  // resetStreakData();  // ← もう使わないので削除
  resetAllDrawData();
  renderAll();
});

    document.getElementById("prevPageBtn").addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderAll();
      }
    });
    document.getElementById("nextPageBtn").addEventListener("click", () => {
      const data = loadAllProgress();
      if (currentPage < data.maxPage) {
        currentPage++;
        renderAll();
      }
    });
    document.getElementById("addPageBtn").addEventListener("click", () => {
      const data = loadAllProgress();
      const newPage = data.maxPage + 1;
      data.maxPage = newPage;
      data.pages[String(newPage)] = createInitialProgressMap();
      saveAllProgress(data);
      currentPage = newPage;
      logMessage(`${newPage}ページ目を追加しました。`);
      renderAll();
    });
    document.getElementById("resetPagesBtn").addEventListener("click", () => {
      if (!confirm("全ページを削除して 1ページ目だけ残します。よろしいですか？")) return;
      const data = loadAllProgress();
      data.maxPage = 1;
      data.pages = { "1": createInitialProgressMap() };
      saveAllProgress(data);
      currentPage = 1;
      renderAll();
      logMessage("ページ数をリセットしました。");
    });

    const closeBtn = document.getElementById("sidePanelClose");
    const doneBtn  = document.getElementById("sidePanelDoneBtn");
    const exportBtn = document.getElementById("sidePanelExportBtn");

    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        pendingLessonId = null;
        closeLessonPanel();
      });
    }
    if (doneBtn) {
      doneBtn.addEventListener("click", () => {
        if (!pendingLessonId) {
          closeLessonPanel();
          return;
        }
        const id = pendingLessonId;
        pendingLessonId = null;
        closeLessonPanel();
        advanceLesson(id);
      });
    }
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        exportCurrentPageImage();
      });
    }

    window.addEventListener("resize", () => {
      renderAll();
    });

      setupMascot();  // マスコット機能の初期化を追加    
  });

// ===== 右下マスコット関連 =====
const PRAISE_MESSAGES = [
  "やった！",
  "えらい！",
  "すごい！",
  "今日も進んだね！",
  "コツコツ続けてて偉い！",
  "いいペースだよ！"
];

function mascotSayRandomPraise() {
  const speechEl = document.getElementById("helperSpeech");
  if (!speechEl) return;

  const msg =
    PRAISE_MESSAGES[Math.floor(Math.random() * PRAISE_MESSAGES.length)];

  speechEl.textContent = msg;

  // アニメーション用クラスをつけ直して「ポン」と出す
  speechEl.classList.remove("pop");
  // 強制再描画してからクラス付与（アニメをリセットするため）
  // eslint-disable-next-line no-unused-expressions
  speechEl.offsetWidth;
  speechEl.classList.add("pop");
}

function setupMascot() {
  const img = document.getElementById("helperImage");
  const fileInput = document.getElementById("mascotFileInput");
  if (!img || !fileInput) return;

  // 保存済みマスコットがあれば読み込む
  try {
    const saved = localStorage.getItem("genko_mascot_image");
    if (saved) {
      img.src = saved;
    }
  } catch (e) {
    console.warn("マスコット画像の読み込みに失敗しました", e);
  }

  // 画像クリックで変更確認 → ファイル選択
  img.addEventListener("click", () => {
    if (!confirm("マスコットを変更しますか？")) return;
    fileInput.value = "";  // 同じファイル選択でも change が発火するように
    fileInput.click();
  });

  // ファイル選択後の処理
  fileInput.addEventListener("change", e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("画像ファイルを選択してください。");
      return;
    }

    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target.result;
      if (typeof dataUrl !== "string") return;

      // 表示を変更
img.src = dataUrl;
img.style.backgroundSize = "contain";
img.style.backgroundRepeat = "no-repeat";
img.style.backgroundPosition = "center";

      // localStorage に保存（再読み込みしても同じマスコットにする）
      try {
        localStorage.setItem("genko_mascot_image", dataUrl);
      } catch (err) {
        console.warn("マスコット画像を保存できませんでした", err);
      }
    };
    reader.readAsDataURL(file);
  });
}

(function() {
  // ==== 設定：次にやることの文言 ====
  // 原稿マップ側で計算している「次のタスク」に差し替えてください。
  // 例: window.dailyNextTaskText = "枠線2コマ目を描こう！";
  const DEFAULT_NEXT_TASK_TEXT = "枠線1コマ目を進めてみましょう！";

  // ==== 日付の扱い（朝5時で日付切り替え） ====
  function getLogicalDateStr() {
    const now = new Date();

    // ローカル時間で 5:00 以前なら前日扱い
    if (now.getHours() < 5) {
      now.setDate(now.getDate() - 1);
    }

    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  // ==== 今日はパネルを出さない設定 ====
  function isHiddenToday() {
    const today = getLogicalDateStr();
    const hiddenDate = localStorage.getItem("dg_hide_today");
    return hiddenDate === today;
  }

  function setHiddenToday() {
    const today = getLogicalDateStr();
    localStorage.setItem("dg_hide_today", today);
  }

  // ==== パネルの表示 ====
  function openDailyPanel() {
    const overlay = document.getElementById("daily-panel-overlay");
    const line1 = document.getElementById("daily-panel-line1");
    const line2 = document.getElementById("daily-panel-line2");
    const startBtn = document.getElementById("daily-panel-start-btn");
    const hideCheckbox = document.getElementById("daily-panel-hide-checkbox");

    if (!overlay || !line1 || !line2 || !startBtn || !hideCheckbox) {
      return;
    }

    // 連続日数の更新
    const streak = calcCurrentStreak();

    // 次にやることのメッセージ
    const nextTaskText =
      window.dailyNextTaskText || DEFAULT_NEXT_TASK_TEXT;

    // テキストをセット
    line1.textContent = "現在" + streak + "日継続しています。";
    line2.textContent = "次は" + nextTaskText + "！";

    // パネルを表示
    overlay.style.display = "flex";

    // ボタンクリックで閉じる
    startBtn.addEventListener("click", function() {
      if (hideCheckbox.checked) {
        setHiddenToday();
      }

      overlay.style.display = "none";

      // 必要ならここで「作業開始」用の処理を呼ぶ
      // 例:
      // if (typeof window.onDailyPanelStartWork === "function") {
      //   window.onDailyPanelStartWork();
      // }
    }, { once: true });
  }

  // ==== ページ読み込み時の処理 ====
  document.addEventListener("DOMContentLoaded", function() {
    if (isHiddenToday()) {
      // 「今日は表示しない」がチェック済み
      return;
    }

    // renderAll() が window 側の DOMContentLoaded で実行されて
    // window.dailyNextTaskText がセットされてからパネルを開きたいので、
    // いったんタスクキューに回して少し遅らせる
    setTimeout(() => {
      openDailyPanel();
    }, 0);
  });
})();
