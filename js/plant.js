import { fetchWeeklyCompleted } from './api.js';

// ===== Plant Type Definitions (6 types) =====
var PLANT_TYPES = [
  {
    id: 'tulip', name: 'チューリップ',
    pot: '#d4956a', soil: '#8b6f47', stem: '#4a7c59', leaf: '#5a9e6f',
    petal: '#e74c6f', petalAlt: '#f06292', center: '#f5c542',
    drawFlower: function(cx, cy) {
      return '<ellipse cx="' + (cx-8) + '" cy="' + cy + '" rx="10" ry="16" fill="' + this.petal + '" transform="rotate(-15 ' + (cx-8) + ' ' + cy + ')"/>' +
        '<ellipse cx="' + (cx+8) + '" cy="' + cy + '" rx="10" ry="16" fill="' + this.petalAlt + '" transform="rotate(15 ' + (cx+8) + ' ' + cy + ')"/>' +
        '<ellipse cx="' + cx + '" cy="' + (cy-2) + '" rx="8" ry="14" fill="' + this.petal + '" opacity="0.9"/>';
    },
    drawBud: function(cx, cy) {
      return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="6" ry="10" fill="' + this.petal + '" opacity="0.7"/>' +
        '<ellipse cx="' + cx + '" cy="' + (cy+4) + '" rx="5" ry="4" fill="' + this.stem + '"/>';
    }
  },
  {
    id: 'sunflower', name: 'ひまわり',
    pot: '#d4956a', soil: '#8b6f47', stem: '#4a7c59', leaf: '#5a9e6f',
    petal: '#fbbf24', petalAlt: '#f59e0b', center: '#78350f',
    drawFlower: function(cx, cy) {
      var s = '';
      for (var i = 0; i < 12; i++) {
        s += '<ellipse cx="' + cx + '" cy="' + (cy-14) + '" rx="4" ry="10" fill="' + (i%2===0?this.petal:this.petalAlt) + '" transform="rotate(' + (i*30) + ' ' + cx + ' ' + cy + ')"/>';
      }
      return s + '<circle cx="' + cx + '" cy="' + cy + '" r="9" fill="' + this.center + '"/>';
    },
    drawBud: function(cx, cy) {
      return '<circle cx="' + cx + '" cy="' + cy + '" r="8" fill="' + this.petal + '" opacity="0.6"/>' +
        '<ellipse cx="' + cx + '" cy="' + (cy+5) + '" rx="5" ry="4" fill="' + this.stem + '"/>';
    }
  },
  {
    id: 'sakura', name: '桜',
    pot: '#d4956a', soil: '#8b6f47', stem: '#6b4226', leaf: '#5a9e6f',
    petal: '#f9a8d4', petalAlt: '#f472b6', center: '#fde68a',
    drawFlower: function(cx, cy) {
      var s = '';
      for (var i = 0; i < 5; i++) {
        s += '<ellipse cx="' + cx + '" cy="' + (cy-12) + '" rx="7" ry="11" fill="' + this.petal + '" transform="rotate(' + (i*72-90) + ' ' + cx + ' ' + cy + ')"/>';
      }
      return s + '<circle cx="' + cx + '" cy="' + cy + '" r="5" fill="' + this.center + '"/>';
    },
    drawBud: function(cx, cy) {
      return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="5" ry="8" fill="' + this.petal + '" opacity="0.6"/>' +
        '<ellipse cx="' + cx + '" cy="' + (cy+4) + '" rx="4" ry="3" fill="' + this.stem + '"/>';
    }
  },
  {
    id: 'rose', name: 'バラ',
    pot: '#d4956a', soil: '#8b6f47', stem: '#2d6a4f', leaf: '#40916c',
    petal: '#dc2626', petalAlt: '#ef4444', center: '#fca5a5',
    drawFlower: function(cx, cy) {
      return '<circle cx="' + cx + '" cy="' + cy + '" r="14" fill="' + this.petal + '"/>' +
        '<circle cx="' + (cx+3) + '" cy="' + (cy-2) + '" r="10" fill="' + this.petalAlt + '"/>' +
        '<circle cx="' + (cx-2) + '" cy="' + (cy+1) + '" r="8" fill="' + this.petal + '" opacity="0.8"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="5" fill="' + this.center + '"/>';
    },
    drawBud: function(cx, cy) {
      return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="6" ry="9" fill="' + this.petal + '" opacity="0.7"/>' +
        '<ellipse cx="' + cx + '" cy="' + (cy+5) + '" rx="5" ry="3" fill="' + this.stem + '"/>';
    }
  },
  {
    id: 'asagao', name: 'あさがお',
    pot: '#d4956a', soil: '#8b6f47', stem: '#4a7c59', leaf: '#5a9e6f',
    petal: '#7c3aed', petalAlt: '#a78bfa', center: '#fef3c7',
    drawFlower: function(cx, cy) {
      var s = '';
      for (var i = 0; i < 5; i++) {
        s += '<ellipse cx="' + cx + '" cy="' + (cy-11) + '" rx="9" ry="12" fill="' + (i%2===0?this.petal:this.petalAlt) + '" transform="rotate(' + (i*72-90) + ' ' + cx + ' ' + cy + ')"/>';
      }
      return s + '<circle cx="' + cx + '" cy="' + cy + '" r="6" fill="' + this.center + '"/>';
    },
    drawBud: function(cx, cy) {
      return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="5" ry="10" fill="' + this.petal + '" opacity="0.6"/>' +
        '<ellipse cx="' + cx + '" cy="' + (cy+4) + '" rx="4" ry="3" fill="' + this.stem + '"/>';
    }
  },
  {
    id: 'cosmos', name: 'コスモス',
    pot: '#d4956a', soil: '#8b6f47', stem: '#4a7c59', leaf: '#5a9e6f',
    petal: '#ec4899', petalAlt: '#f9a8d4', center: '#fbbf24',
    drawFlower: function(cx, cy) {
      var s = '';
      for (var i = 0; i < 8; i++) {
        s += '<ellipse cx="' + cx + '" cy="' + (cy-13) + '" rx="4" ry="11" fill="' + (i%2===0?this.petal:this.petalAlt) + '" transform="rotate(' + (i*45) + ' ' + cx + ' ' + cy + ')"/>';
      }
      return s + '<circle cx="' + cx + '" cy="' + cy + '" r="5" fill="' + this.center + '"/>';
    },
    drawBud: function(cx, cy) {
      return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="5" ry="8" fill="' + this.petal + '" opacity="0.6"/>' +
        '<ellipse cx="' + cx + '" cy="' + (cy+4) + '" rx="4" ry="3" fill="' + this.stem + '"/>';
    }
  }
];

var SVG_NS = 'http:/' + '/www.w3.org/2000/svg';
var THRESHOLDS = [0, 7, 14, 24, 35];
var STAGE_LABELS = ['種まき', '発芽', '成長中', 'つぼみ', '🌸 満開！'];
var STORAGE_KEY = 'plant_growth_state';

// ===== State Management =====
function getMonday() {
  var now = new Date();
  var day = now.getDay();
  var diff = day === 0 ? 6 : day - 1;
  var mon = new Date(now);
  mon.setDate(now.getDate() - diff);
  return mon.toISOString().split('T')[0];
}

function loadState() {
  try {
    var s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : null;
  } catch (e) { return null; }
}

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}

function getStage(count) {
  for (var i = THRESHOLDS.length - 1; i >= 0; i--) {
    if (count >= THRESHOLDS[i]) return i;
  }
  return 0;
}

function getPlantType(id) {
  return PLANT_TYPES.find(function(p) { return p.id === id; }) || PLANT_TYPES[0];
}

function pickRandomPlant(excludeId) {
  var choices = PLANT_TYPES.filter(function(p) { return p.id !== excludeId; });
  return choices[Math.floor(Math.random() * choices.length)];
}

function initState(weeklyCount) {
  var monday = getMonday();
  var state = loadState();

  if (!state || state.currentWeek !== monday) {
    var collection = (state && state.collection) ? state.collection : [];
    if (state && state.currentWeek && state.plantTypeId) {
      collection.push({
        type: state.plantTypeId,
        week: state.currentWeek,
        count: state.count || 0,
        stage: getStage(state.count || 0)
      });
      if (collection.length > 20) collection = collection.slice(-20);
    }
    var newPlant = pickRandomPlant(state ? state.plantTypeId : null);
    state = {
      currentWeek: monday,
      plantTypeId: newPlant.id,
      count: weeklyCount,
      collection: collection
    };
  } else {
    state.count = weeklyCount;
  }

  saveState(state);
  return state;
}

// ===== SVG Drawing =====
function drawPot(plant) {
  return '<path d="M38 142 L42 168 L78 168 L82 142 Z" fill="' + plant.pot + '"/>' +
    '<rect x="34" y="136" width="52" height="8" rx="3" fill="' + plant.pot + '"/>' +
    '<ellipse cx="60" cy="142" rx="22" ry="4" fill="' + plant.soil + '"/>';
}

function drawStem(plant, stage) {
  var heights = [0, 30, 55, 75, 80];
  var h = heights[stage] || 0;
  if (h === 0) return '';
  return '<rect x="58" y="' + (138 - h) + '" width="4" height="' + h + '" fill="' + plant.stem + '" rx="2"/>';
}

function drawSprout(plant) {
  return '<g class="plant-leaf plant-leaf-left">' +
    '<ellipse cx="55" cy="128" rx="6" ry="3" fill="' + plant.leaf + '" transform="rotate(-40 55 128)"/>' +
    '</g>' +
    '<g class="plant-leaf plant-leaf-right">' +
    '<ellipse cx="65" cy="128" rx="6" ry="3" fill="' + plant.leaf + '" transform="rotate(40 65 128)"/>' +
    '</g>';
}

function drawLeaves(plant, stage) {
  if (stage < 2) return '';
  var s = '';
  s += '<g class="plant-leaf plant-leaf-left">' +
    '<ellipse cx="48" cy="120" rx="12" ry="5" fill="' + plant.leaf + '" transform="rotate(-30 48 120)"/></g>';
  s += '<g class="plant-leaf plant-leaf-right">' +
    '<ellipse cx="72" cy="112" rx="12" ry="5" fill="' + plant.leaf + '" transform="rotate(30 72 112)"/></g>';
  if (stage >= 3) {
    s += '<g class="plant-leaf plant-leaf-left" style="animation-delay:0.5s">' +
      '<ellipse cx="50" cy="95" rx="9" ry="4" fill="' + plant.leaf + '" transform="rotate(-25 50 95)"/></g>';
    s += '<g class="plant-leaf plant-leaf-right" style="animation-delay:0.8s">' +
      '<ellipse cx="70" cy="88" rx="9" ry="4" fill="' + plant.leaf + '" transform="rotate(25 70 88)"/></g>';
  }
  return s;
}

function drawParticles() {
  var pos = [[25,30],[90,25],[15,60],[100,55],[30,15],[85,45]];
  var s = '';
  for (var i = 0; i < pos.length; i++) {
    s += '<circle cx="' + pos[i][0] + '" cy="' + pos[i][1] + '" r="1.5" fill="#fbbf24" class="plant-particle" style="animation-delay:' + (i*0.3) + 's"/>';
  }
  return s;
}

function renderPlantSVG(plantTypeId, stage) {
  var plant = getPlantType(plantTypeId);
  var svg = '<svg viewBox="0 0 120 180" xmlns="' + SVG_NS + '" class="plant-svg">';
  svg += drawPot(plant);
  if (stage >= 1) svg += drawStem(plant, stage);
  if (stage === 1) svg += drawSprout(plant);
  if (stage >= 2) svg += drawLeaves(plant, stage);

  var flowerCy = 138 - [0, 30, 55, 75, 80][stage];
  if (stage === 3) svg += plant.drawBud(60, flowerCy);
  if (stage >= 4) {
    svg += plant.drawFlower(60, flowerCy);
    svg += drawParticles();
  }
  svg += '</svg>';
  return svg;
}

// ===== Collection Modal =====
function renderCollectionModal(collection) {
  if (!collection || collection.length === 0) {
    return '<div class="plant-collection-empty">まだコレクションはありません<br>毎週花を咲かせましょう！</div>';
  }
  return '<div class="plant-collection-grid">' +
    collection.slice().reverse().map(function(entry) {
      var plant = getPlantType(entry.type);
      return '<div class="collection-item">' +
        '<div class="collection-plant-mini">' + renderPlantSVG(entry.type, entry.stage) + '</div>' +
        '<div class="collection-info">' +
          '<span class="collection-name">' + plant.name + '</span>' +
          '<span class="collection-week">' + entry.week + ' 週</span>' +
          '<span class="collection-count">' + entry.count + '件完了 / ' + STAGE_LABELS[entry.stage] + '</span>' +
        '</div>' +
      '</div>';
    }).join('') +
  '</div>';
}

// ===== Main Render =====
export async function renderPlant(container) {
  if (!container) return;

  try {
    var data = await fetchWeeklyCompleted();
    var state = initState(data.count);
    var stage = getStage(state.count);
    var plant = getPlantType(state.plantTypeId);

    var nextThreshold = stage < 4 ? THRESHOLDS[stage + 1] : THRESHOLDS[4];
    var remaining = Math.max(0, nextThreshold - state.count);
    var progressPct = stage >= 4 ? 100 :
      ((state.count - THRESHOLDS[stage]) / (nextThreshold - THRESHOLDS[stage])) * 100;

    var progressText = stage >= 4
      ? '🌸 今週は満開です！'
      : 'あと ' + remaining + ' つで' + STAGE_LABELS[stage + 1];

    var collCount = state.collection ? state.collection.length : 0;

    container.innerHTML =
      '<div class="plant-container">' +
        '<div class="plant-header">' +
          '<span>今週の成長 🌱</span>' +
          '<span class="plant-type-label">' + plant.name + '</span>' +
        '</div>' +
        '<div class="plant-svg-area">' + renderPlantSVG(state.plantTypeId, stage) + '</div>' +
        '<div class="plant-stage-label">' + STAGE_LABELS[stage] + '</div>' +
        '<div class="plant-progress">' +
          '<div class="plant-progress-bar"><div class="plant-progress-fill" style="width:' + progressPct + '%"></div></div>' +
          '<span class="plant-progress-text">' + progressText + '</span>' +
        '</div>' +
        '<div class="plant-footer">' +
          '<span class="plant-count">' + state.count + ' / ' + THRESHOLDS[4] + '</span>' +
          (collCount > 0 ? '<button class="plant-collection-btn" id="plant-collection-btn">🏆 ' + collCount + '</button>' : '') +
        '</div>' +
      '</div>';

    // Collection button event
    var collBtn = document.getElementById('plant-collection-btn');
    if (collBtn) {
      collBtn.addEventListener('click', function() {
        var overlay = document.getElementById('modal-overlay');
        var content = document.getElementById('modal-content');
        if (overlay && content) {
          content.innerHTML =
            '<div class="plant-collection-modal">' +
              '<div class="plant-collection-header">' +
                '<h3>🏆 コレクション</h3>' +
                '<button class="modal-close" id="plant-modal-close">✕</button>' +
              '</div>' +
              renderCollectionModal(state.collection) +
            '</div>';
          overlay.classList.remove('hidden');
          document.getElementById('plant-modal-close').addEventListener('click', function() {
            overlay.classList.add('hidden');
          });
        }
      });
    }
  } catch (err) {
    container.innerHTML = '<div class="plant-container plant-error">🌱 読み込み中...</div>';
    console.error('Plant render error:', err);
  }
}