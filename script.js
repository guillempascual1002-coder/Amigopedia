// drag threshold: minimum distance (pixels) before drag activates
const DRAG_THRESHOLD = 6;
// pack cooldown duration (ms)
const PACK_COOLDOWN = 10 * 1000;
const NEW_ALBUM_BADGES_KEY = 'newAlbumBadges';
const NEW_SLOT_BADGES_KEY = 'newSlotBadges';
// audio assets
const packOpenSound = new Audio("sounds/pack-open.mp3");
const cardRevealSound = new Audio("sounds/card-reveal.mp3");
const drawerOpenSound = new Audio("sounds/drawer.mp3");
const drawerCloseSound = new Audio("sounds/drawer.mp3");
const albumOpenSound = new Audio("sounds/open-album.mp3");
const conseguirFichasSound = new Audio("sounds/conseguirfichas.mp3");
const battleStartSound = new Audio("sounds/battlestart.mp3");
packOpenSound.volume = 0.6;
cardRevealSound.volume = 0.5;
// filenames that should render with holographic overlay (desktop only)
const HOLO_CARDS = [
    "especiales-01.png",
];

// collection state: track quantities per card number in each group
const collection = {
    "black-angus": {},
    "fuck-quesadilla": {},
    "blip-city": {},
    "helldivers": {},
    "otros": {},
    "especiales": {}
};

const newAlbumBadges = {};
const newSlotBadges = {};

// all card filenames that exist in images/
// this is the single source of truth for available cards
// only add filenames if the corresponding image file actually exists
const allAvailableCards = [

    "fuck-quesadilla-01.png",
    "fuck-quesadilla-02.png",
    "fuck-quesadilla-03.png",
    "fuck-quesadilla-04.png",
    "fuck-quesadilla-05.png",
    "blip-city-01.png",
    "blip-city-02.png",
    "blip-city-03.png",
    "blip-city-04.png",
    "black-angus-01.png",
    "black-angus-02.png",
    "black-angus-03.png",
    "black-angus-04.png",
    "helldivers-01.png",
    "helldivers-02.png",
    "otros-01.png",
    "otros-02.png",
    "fuck-quesadilla-06.png",
    "especiales-01.png",
    // add more existing card filenames here
];

const CARD_DESCRIPTIONS = {
    "fuck-quesadilla-01.png": "Rubén Osma",
    "fuck-quesadilla-02.png": "Julia Martinez",
    "fuck-quesadilla-03.png": "Javi Carrion",
    "fuck-quesadilla-04.png": "Miquel Serra",
    "fuck-quesadilla-05.png": "Pau Arlandis",
    "blip-city-01.png": "Guillem Pascual",
    "blip-city-02.png": "Asier Ribelles",
    "blip-city-03.png": "Yulian Krvavych",
    "blip-city-04.png": "Denis Anatoliev",
    "black-angus-01.png": "Sara Chacón",
    "black-angus-02.png": "Andrea Pastor",
    "black-angus-03.png": "Maria Xiaan",
    "black-angus-04.png": "Claudia Casanova",
    "helldivers-01.png": "Iván Soriano",
    "helldivers-02.png": "Hector Cervera",
    "otros-01.png": "Celia Calatayud",
    "otros-02.png": "Andreu Martinez",
    "fuck-quesadilla-06.png": "Julia Ak:Julss",
    "especiales-01.png": "Carmen Sánchez",
    // add descriptions here: "filename.png": "Texto descriptivo de la carta"
};

// helper: ensure card record exists
function ensureCardRecord(group, num) {
    if (!collection[group]) collection[group] = {};
    if (!collection[group][num]) {
        collection[group][num] = { quantity: 0, wins: 0 };
    }
    return collection[group][num];
}

function playSound(sound) {
    if (!sound) return;
    sound.currentTime = 0;
    sound.play().catch(() => {});
}

// helper to count unique collected cards across all groups
function getUniqueCollectedCount() {
    return Object.values(collection).reduce((sum, group) => {
        return sum + Object.keys(group || {}).length;
    }, 0);
}

// helper: shuffle array in place using Fisher-Yates
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// get list of cards not yet collected (unique check)
function getRemainingCards() {
    return allAvailableCards.filter(card => {
        const group = parseGroup(card);
        const num = parseSlotNumber(card);
        const groupMap = collection[group];
        return !(groupMap && groupMap[num]);
    });
}

// duplicates allowed: envelope remains usable
function hasRemainingCards() {
    return true;
}

// total slots per group (constant)
const groupTotals = {
    "black-angus": 5,
    "fuck-quesadilla": 16,
    "blip-city": 4,
    "helldivers": 11,
    "otros": 12,
    "especiales": 4
};

// initialization after DOM loads
window.addEventListener('DOMContentLoaded', init);

function init() {
    const accordion = document.getElementById('accordion');

    // create each group section
    Object.keys(groupTotals).forEach(key => {
        const section = document.createElement('section');
        section.className = 'group';
        section.dataset.group = key;

        const header = document.createElement('div');
        header.className = 'group-header';
        header.textContent = humanize(key);
        // assign random delay and slight variation in duration so headers drift independently
        header.style.animationDelay = Math.random() * 5 + 's';
        header.style.animationDuration = (6 + Math.random() * 4) + 's';

        const counter = document.createElement('span');
        counter.className = 'counter';
        header.appendChild(counter);

        header.addEventListener('click', () => {
            const isMobile = window.matchMedia && window.matchMedia('(max-width: 1024px)').matches;
            if (isMobile) {
                const hasUnlocked = Object.values(collection[key] || {}).some(record => record && record.quantity > 0);
                if (!hasUnlocked) return;
            }
            const willOpen = !section.classList.contains('open');
            section.classList.toggle('open');
            playSound(albumOpenSound);
            if (willOpen) {
                setAlbumNewBadge(key, false);
            }
            updateEnvelopeVisibilityForAlbum();
            updateDisplayZoneVisibility();
            updateScrollLockForAlbum();
        });

        section.appendChild(header);

        const panel = document.createElement('div');
        panel.className = 'group-panel';

        const grid = document.createElement('div');
        grid.className = 'card-grid';

        // create empty slots numbered 1..total
        for (let i = 1; i <= groupTotals[key]; i++) {
            const slot = document.createElement('div');
            slot.className = 'card-slot';
            slot.dataset.group = key;
            slot.dataset.slot = i;
            slot.addEventListener('pointerenter', () => {
                if (!slot.classList.contains('is-new')) return;
                if (!slot.classList.contains('has-card')) return;
                setSlotNewBadge(key, i, false);
            });
            grid.appendChild(slot);
        }
        panel.appendChild(grid);
        section.appendChild(panel);
        accordion.appendChild(section);

        updateCounter(key);
    });

    loadCollection();
    loadNewAlbumBadges();
    loadNewSlotBadges();
    renderCollectionToDom();
    updateAllCounters();
    applyAllAlbumNewBadges();
    applyAllSlotNewBadges();

    setupModal();
    setupEnvelope();
    setupConseguirFichasBtn();
    setupBottomDrawerControl();
    setupLeftDrawerControl();
        setupRightDrawerControl();
    setupDisplayZone();
    setupDrawerToggleSound();
    setupInfoOverlay();
    resumePackCooldown();
    updateEnvelopeState();
    updateEnvelopeVisibilityForAlbum();
    updateDisplayZoneVisibility();
    updateScrollLockForAlbum();
}

function setupDrawerToggleSound() {
    const battleToggle = document.getElementById('battle-drawer-toggle');
    const inspectToggle = document.getElementById('inspect-drawer-toggle');

    if (battleToggle) {
        battleToggle.addEventListener('change', () => {
            if (!battleToggle.checked) {
                if (battleActive || isFighting) {
                    battleToggle.checked = true;
                    return;
                }
                battleController.resetBattle();
            }
            playSound(battleToggle.checked ? drawerOpenSound : drawerCloseSound);
        });
    }

    if (inspectToggle) {
        inspectToggle.addEventListener('change', () => {
            playSound(inspectToggle.checked ? drawerOpenSound : drawerCloseSound);
        });
    }
}

function updateScrollLockForAlbum() {
    const anyOpen = !!document.querySelector('.group.open');
    document.body.classList.toggle('album-open', anyOpen);
    if (!anyOpen) {
        const battleToggle = document.getElementById('battle-drawer-toggle');
        const inspectToggle = document.getElementById('inspect-drawer-toggle');
        if (battleToggle) battleToggle.checked = false;
        if (inspectToggle) inspectToggle.checked = false;
    }
}

function setupBottomDrawerControl() {
    const control = document.querySelector('.open-pack-text-bottom');
    const panel = document.getElementById('bottom-drawer-panel');
    const battleZone = document.getElementById('battle-zone');
    if (!control || !panel) return;

    const plusEl = control.querySelector('.open-pack-plus');
    const labelEl = control.querySelector('.open-pack-label');
    if (!plusEl || !labelEl) return;

    const renderBottomDrawerState = () => {
        const open = bottomDrawerState.isOpen;
        const isMobile = window.matchMedia && window.matchMedia('(max-width: 1024px)').matches;
        panel.classList.toggle('is-open', open);
        panel.setAttribute('aria-hidden', open ? 'false' : 'true');
        control.classList.toggle('is-open', open);
        control.setAttribute('aria-expanded', open ? 'true' : 'false');
        control.setAttribute('aria-label', open ? 'Cerrar cajonera inferior' : 'Abrir cajonera inferior');
        labelEl.textContent = open ? 'CERRAR' : 'ABRIR';
        plusEl.textContent = open ? '-' : '+';
        if (battleZone) battleZone.classList.toggle('mobile-bottom-visible', isMobile && open);
    };

    const toggleBottomDrawer = () => {
        const isMobile = window.matchMedia && window.matchMedia('(max-width: 1024px)').matches;
        if (isMobile && bottomDrawerState.isOpen && isMobileBattleLocked()) {
            return;
        }
        bottomDrawerState.isOpen = !bottomDrawerState.isOpen;
        renderBottomDrawerState();
        playSound(drawerOpenSound);
    };

    control.addEventListener('click', (e) => {
        e.preventDefault();
        toggleBottomDrawer();
    });

    control.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        toggleBottomDrawer();
    });

    window.addEventListener('resize', renderBottomDrawerState);

    renderBottomDrawerState();
}

function setupLeftDrawerControl() {
    const control = document.querySelector('.open-pack-text-side');
    const panel = document.getElementById('left-drawer-panel');
    if (!control || !panel) return;

    const plusEl = control.querySelector('.open-pack-plus');
    const labelEl = control.querySelector('.open-pack-label');
    if (!plusEl || !labelEl) return;

    const battleZone = document.getElementById('battle-zone');

    const renderLeftDrawerState = () => {
        const open = leftDrawerState.isOpen;
        panel.classList.toggle('is-open', open);
        panel.setAttribute('aria-hidden', open ? 'false' : 'true');
        control.classList.toggle('is-open', open);
        control.setAttribute('aria-expanded', open ? 'true' : 'false');
        control.setAttribute('aria-label', open ? 'Cerrar cajonera izquierda' : 'Abrir cajonera izquierda');
        labelEl.textContent = open ? 'CERRAR' : 'ABRIR';
        plusEl.textContent = open ? '-' : '+';
        if (battleZone) battleZone.classList.toggle('visible', open);
    };

    const toggleLeftDrawer = () => {
        leftDrawerState.isOpen = !leftDrawerState.isOpen;
        renderLeftDrawerState();
        playSound(drawerOpenSound);
    };

    control.addEventListener('click', (e) => {
        e.preventDefault();
        toggleLeftDrawer();
    });

    control.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        toggleLeftDrawer();
    });

    renderLeftDrawerState();
}

function setupRightDrawerControl() {
    const control = document.querySelector('.open-pack-text-right');
    const panel = document.getElementById('right-drawer-panel');
    if (!control || !panel) return;

    const plusEl = control.querySelector('.open-pack-plus');
    const labelEl = control.querySelector('.open-pack-label');
    if (!plusEl || !labelEl) return;

    const renderRightDrawerState = () => {
        const open = rightDrawerState.isOpen;
        panel.classList.toggle('is-open', open);
        panel.setAttribute('aria-hidden', open ? 'false' : 'true');
        control.classList.toggle('is-open', open);
        control.setAttribute('aria-expanded', open ? 'true' : 'false');
        control.setAttribute('aria-label', open ? 'Cerrar cajonera derecha' : 'Abrir cajonera derecha');
        labelEl.textContent = open ? 'CERRAR' : 'ABRIR';
        plusEl.textContent = open ? '-' : '+';
        updateDisplayZoneVisibility();
    };

    const toggleRightDrawer = () => {
        rightDrawerState.isOpen = !rightDrawerState.isOpen;
        renderRightDrawerState();
        playSound(drawerOpenSound);
    };

    control.addEventListener('click', (e) => {
        e.preventDefault();
        toggleRightDrawer();
    });

    control.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        toggleRightDrawer();
    });

    renderRightDrawerState();
}

// convert key to display name
function humanize(key) {
    return key.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// update the counter in a section header based on collection state
function updateCounter(key) {
    const count = collection[key] ? Object.keys(collection[key]).length : 0;
    const total = groupTotals[key] || 0;
    const counterEl = document.querySelector(`.group[data-group="${key}"] .counter`);
    if (counterEl) counterEl.textContent = `${count}/${total}`;
    const section = document.querySelector(`.group[data-group="${key}"]`);
    if (section) {
        const completed = total > 0 && count >= total;
        section.classList.toggle('completed', completed);
    }
}

function updateAllCounters() {
    Object.keys(groupTotals).forEach(updateCounter);
}

function setAlbumNewBadge(group, enabled) {
    if (enabled) {
        newAlbumBadges[group] = true;
    } else {
        delete newAlbumBadges[group];
    }
    updateAlbumNewBadge(group);
    saveNewAlbumBadges();
}

function updateAlbumNewBadge(group) {
    const section = document.querySelector(`.group[data-group="${group}"]`);
    if (!section) return;
    section.classList.toggle('has-new', !!newAlbumBadges[group]);
}

function applyAllAlbumNewBadges() {
    Object.keys(groupTotals).forEach(updateAlbumNewBadge);
}

function getSlotBadgeKey(group, num) {
    return `${group}:${num}`;
}

function setSlotNewBadge(group, num, enabled) {
    const key = getSlotBadgeKey(group, num);
    if (enabled) {
        newSlotBadges[key] = true;
    } else {
        delete newSlotBadges[key];
    }
    updateSlotNewBadge(group, num);
    saveNewSlotBadges();
}

function updateSlotNewBadge(group, num) {
    const slot = document.querySelector(`.card-slot[data-group="${group}"][data-slot="${num}"]`);
    if (!slot) return;
    const key = getSlotBadgeKey(group, num);
    slot.classList.toggle('is-new', !!newSlotBadges[key]);
}

function applyAllSlotNewBadges() {
    document.querySelectorAll('.card-slot').forEach(slot => {
        const group = slot.dataset.group;
        const num = Number(slot.dataset.slot);
        if (!group || !num) return;
        updateSlotNewBadge(group, num);
    });
}

function saveNewAlbumBadges() {
    try {
        localStorage.setItem(NEW_ALBUM_BADGES_KEY, JSON.stringify(newAlbumBadges));
    } catch (e) {
        console.warn('Failed to save album badges', e);
    }
}

function saveNewSlotBadges() {
    try {
        localStorage.setItem(NEW_SLOT_BADGES_KEY, JSON.stringify(newSlotBadges));
    } catch (e) {
        console.warn('Failed to save slot badges', e);
    }
}

function loadNewAlbumBadges() {
    try {
        const raw = localStorage.getItem(NEW_ALBUM_BADGES_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        Object.keys(groupTotals).forEach(group => {
            if (data[group]) newAlbumBadges[group] = true;
        });
    } catch (e) {
        console.warn('Failed to load album badges', e);
    }
}

function loadNewSlotBadges() {
    try {
        const raw = localStorage.getItem(NEW_SLOT_BADGES_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        Object.keys(data || {}).forEach(key => {
            if (data[key]) newSlotBadges[key] = true;
        });
    } catch (e) {
        console.warn('Failed to load slot badges', e);
    }
}

// parse group portion of filename
function parseGroup(filename) {
    const base = filename.replace(/\.[^.]+$/, '');
    const parts = base.split('-');
    if (parts.length < 2) return '';
    parts.pop(); // drop numeric part
    return parts.join('-');
}

// parse numeric slot from filename
function parseSlotNumber(filename) {
    const base = filename.replace(/\.[^.]+$/, '');
    const parts = base.split('-');
    const numPart = parts[parts.length - 1];
    const num = parseInt(numPart, 10);
    return isNaN(num) ? null : num;
}

function buildFilename(group, num) {
    return `${group}-${String(num).padStart(2, '0')}.png`;
}

function isHoloCard(filename) {
    return HOLO_CARDS.includes(filename);
}

function isDepthCard(filename) {
    return !!filename;
}

function createDepthLayers(filename) {
    const depth = document.createElement('div');
    depth.className = 'card-depth';

    const baseImg = document.createElement('img');
    baseImg.className = 'depth-base';
    baseImg.src = 'images/' + filename;
    baseImg.alt = filename;
    baseImg.dataset.filename = filename;

    const upFilename = filename.replace(/\.png$/i, '-up.png');
    const topImg = document.createElement('img');
    topImg.className = 'depth-top';
    topImg.src = 'images/' + upFilename;
    topImg.alt = upFilename;
    topImg.setAttribute('aria-hidden', 'true');

    depth.appendChild(baseImg);
    depth.appendChild(topImg);

    return { depth, baseImg };
}

function createCardElement(filename, wrapperClass, { wrapNonHolo = false, allowHolo = false } = {}) {
    const img = document.createElement('img');
    img.src = "images/" + filename;
    img.alt = filename;
    img.dataset.filename = filename;

    const isDesktop = window.matchMedia && window.matchMedia('(min-width: 1024px)').matches;
    const applyHolo = allowHolo && isDesktop && isHoloCard(filename);
    const applyDepth = isDepthCard(filename);

    const getCardContent = () => {
        if (!applyDepth) return { node: img, displayImg: img };
        const { depth, baseImg } = createDepthLayers(filename);
        return { node: depth, displayImg: baseImg };
    };

    if (applyHolo) {
        const wrapper = document.createElement('div');
        wrapper.className = `${wrapperClass || 'card-wrapper'} holo`;
        if (applyDepth) wrapper.classList.add('depth-card');
        wrapper.dataset.filename = filename;
        const content = getCardContent();
        wrapper.appendChild(content.node);
        const overlay = document.createElement('div');
        overlay.className = 'holo-overlay';
        wrapper.appendChild(overlay);
        return { node: wrapper, img: content.displayImg, dragTarget: wrapper };
    }

    if (wrapNonHolo && wrapperClass) {
        const wrapper = document.createElement('div');
        wrapper.className = wrapperClass;
        if (applyDepth) wrapper.classList.add('depth-card');
        wrapper.dataset.filename = filename;
        const content = getCardContent();
        wrapper.appendChild(content.node);
        return { node: wrapper, img: content.displayImg, dragTarget: wrapper };
    }

    if (applyDepth) {
        const wrapper = document.createElement('div');
        wrapper.className = 'depth-card';
        wrapper.dataset.filename = filename;
        const content = getCardContent();
        wrapper.appendChild(content.node);
        return { node: wrapper, img: content.displayImg, dragTarget: wrapper };
    }

    return { node: img, img, dragTarget: img };
}

function getCardInfoFromImg(img) {
    const name = (img.dataset && img.dataset.filename) || img.alt || '';
    let filename = name || '';
    if (!filename && img.src) {
        filename = img.src.split('/').pop().split('\\').pop();
    }
    if (!filename && typeof img.querySelector === 'function') {
        const inner = img.querySelector('img');
        if (inner) {
            filename = inner.dataset.filename || inner.alt || filename;
        }
    }
    const group = parseGroup(filename);
    const num = parseSlotNumber(filename);
    return { group, num, filename };
}

// add a single card file to its exact slot if not already present
function addCard(filename) {
    const group = parseGroup(filename);
    const num = parseSlotNumber(filename);
    if (!group || num == null) return;
    const groupMap = collection[group];
    if (!groupMap) return;
    const record = ensureCardRecord(group, num);
    const hadCard = record.quantity > 0;
    const section = document.querySelector(`.group[data-group="${group}"]`);
    const isOpen = !!(section && section.classList.contains('open'));
    record.quantity += 1;
    const selector = `.card-slot[data-group="${group}"][data-slot="${num}"]`;
    const slot = document.querySelector(selector);
    if (slot && !slot.querySelector('img')) {
        const { node, img, dragTarget } = createCardElement(filename, 'card-wrapper', { wrapNonHolo: true, allowHolo: false });
        img.addEventListener('click', () => openModal(img.src, img.alt));
        enableCardDrag(dragTarget);
        slot.appendChild(node);
        // mark slot as containing a card so UI effects (gloss) only apply when present
        slot.classList.add('has-card');
    }
    updateCounter(group);
    if (!hadCard) {
        setSlotNewBadge(group, num, true);
    }
    if (!hadCard && !isOpen) {
        setAlbumNewBadge(group, true);
    }
    updateEnvelopeState();
    saveCollection();
}

function isFirstCopy(filename) {
    const group = parseGroup(filename);
    const num = parseSlotNumber(filename);
    if (!group || num == null) return false;
    const record = collection[group] && collection[group][num];
    return !record || record.quantity === 0;
}

function triggerSparkleOverlay() {
    const spark = document.createElement('div');
    spark.className = 'reveal-sparkles';
    document.body.appendChild(spark);
    const removeSpark = () => {
        if (spark.parentNode) spark.parentNode.removeChild(spark);
    };
    spark.addEventListener('animationend', removeSpark, { once: true });
    setTimeout(removeSpark, 1200);
}

function isFirstCopy(filename) {
    const group = parseGroup(filename);
    const num = parseSlotNumber(filename);
    if (!group || num == null) return false;
    const record = collection[group] && collection[group][num];
    return !record || record.quantity === 0;
}

function placeCardInSlot(group, num, filename) {
    const selector = `.card-slot[data-group="${group}"][data-slot="${num}"]`;
    const slot = document.querySelector(selector);
    if (!slot || slot.querySelector('img')) return;
    const { node, img, dragTarget } = createCardElement(filename, 'card-wrapper', { wrapNonHolo: true, allowHolo: false });
    img.addEventListener('click', () => openModal(img.src, img.alt));
    enableCardDrag(dragTarget);
    slot.appendChild(node);
    slot.classList.add('has-card');
}

// utility: external code can call to add multiple cards
function addImages(filenames) {
    filenames.forEach(addCard);
}

window.addImages = addImages;

// drag interaction for album cards ----------------------------------------
// threshold-based drag: requires minimum movement before activating
// uses transform translate for smooth physics animations
function enableCardDrag(img) {
    let isPressed = false;      // mouse button down
    let isDragging = false;     // threshold exceeded, dragging active
    let wasDragging = false;    // used to suppress click event after drag
    let inspectOpenedFromPointer = false;
    let startX = 0;             // initial mouse position
    let startY = 0;
    let currentX = 0;           // current mouse position
    let currentY = 0;
    let lastX = 0;              // last position (for velocity)
    let lastY = 0;
    let velocityX = 0;          // velocity for tilt effect
    let velocityY = 0;
    let translationX = 0;       // current translation offset
    let translationY = 0;
    let offsetX = 0;            // pointer offset from element left
    let offsetY = 0;            // pointer offset from element top
    let dragHomeParent = null;
    let dragHomeNextSibling = null;

    const captureDragHome = () => {
        if (dragHomeParent) return;
        dragHomeParent = img.parentNode || null;
        dragHomeNextSibling = img.nextSibling || null;
        img._dragHomeParent = dragHomeParent;
        img._dragHomeNextSibling = dragHomeNextSibling;
    };

    const restoreDragHome = () => {
        if (!dragHomeParent) return;
        if (img.parentNode !== dragHomeParent) {
            dragHomeParent.insertBefore(img, dragHomeNextSibling);
        }
        dragHomeParent = null;
        dragHomeNextSibling = null;
        img._dragHomeParent = null;
        img._dragHomeNextSibling = null;
    };

    // Click/tap: on desktop keep blocked; on mobile open inspect overlay when not dragged
    img.addEventListener('click', function(e) {
        const isDesktop = window.matchMedia && window.matchMedia('(min-width: 1024px)').matches;
        if (isDesktop) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
        if (inspectOpenedFromPointer) {
            inspectOpenedFromPointer = false;
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
        if (wasDragging) {
            wasDragging = false;
            return false;
        }
        e.preventDefault();
        e.stopPropagation();
        openMobileInspect(img);
        return false;
    });

    // Ensure pointer events work on all devices
    img.style.touchAction = 'none';

    // handle pointer move
    const handlePointerMove = (e) => {
        if (!isPressed) return;
        currentX = e.clientX;
        currentY = e.clientY;
        if (!isDragging) {
            const dx = currentX - startX;
            const dy = currentY - startY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > DRAG_THRESHOLD) {
                isDragging = true;
                wasDragging = true;
                img.classList.add('dragging');
                img.style.pointerEvents = 'auto';
            } else {
                return;
            }
        }
        velocityX = currentX - lastX;
        velocityY = currentY - lastY;
        lastX = currentX;
        lastY = currentY;
        translationX = currentX - startX;
        translationY = currentY - startY;
        const tilt = Math.max(-6, Math.min(6, velocityX * 0.2));
        const shadowIntensity = Math.min(0.3, Math.abs(velocityX) * 0.01 + 0.15);
        const shadowOffset = Math.abs(velocityX) * 0.5;
        img.style.transform = `translate(${translationX}px, ${translationY}px)`;
        img.style.boxShadow = `${shadowOffset}px ${20 + shadowOffset}px ${40 + shadowOffset}px rgba(0,0,0,${shadowIntensity})`;
    };

    // handle pointer up (stops drag immediately)
    const handleEndDrag = (e) => {
        if (!isPressed) return;
        isPressed = false;
        img.releasePointerCapture(e.pointerId);
        window.removeEventListener('pointermove', handlePointerMove);
        // if threshold was never exceeded, just a click - return without animation
        if (!isDragging) {
            restoreDragHome();
            img.classList.remove('dragging', 'returning');
            img.style.position = '';
            img.style.margin = '';
            img.style.width = '';
            img.style.height = '';
            img.style.left = '';
            img.style.top = '';
            img.style.zIndex = '';
            img.style.pointerEvents = '';
            img.style.transform = '';
            img.style.boxShadow = '';
            const isDesktop = window.matchMedia && window.matchMedia('(min-width: 1024px)').matches;
            if (!isDesktop) {
                inspectOpenedFromPointer = true;
                openMobileInspect(img);
            }
            return;
        }
        // check if we landed in the display zone (desktop only); if so move card and stop here
        if (tryPlaceInDisplayZone(img, currentX, currentY)) {
            wasDragging = true;
            isDragging = false;
            return;
        }

        // check if we landed in the battle zone; if so clone and stop here
        if (tryPlaceInBattleZone(img, currentX, currentY)) {
            wasDragging = true;
            isDragging = false;
            img.classList.remove('dragging');
            img.style.position = '';
            img.style.margin = '';
            img.style.width = '';
            img.style.height = '';
            img.style.left = '';
            img.style.top = '';
            img.style.zIndex = '';
            img.style.pointerEvents = '';
            img.style.transform = '';
            img.style.boxShadow = '';
            restoreDragHome();
            return;
        }
        isDragging = false;
        img.classList.remove('dragging');
        img.classList.add('returning');
        const inertiaX = translationX + (velocityX * 8);
        const inertiaY = translationY + (velocityY * 8);
        img.style.transform = `translate(${inertiaX}px, ${inertiaY}px)`;
        img.style.boxShadow = '0 0 0 rgba(0,0,0,0)';
        setTimeout(() => {
            img.style.transform = 'translate(0, 0)';
            setTimeout(() => {
                img.classList.remove('returning');
                img.style.position = '';
                img.style.margin = '';
                img.style.width = '';
                img.style.height = '';
                img.style.left = '';
                img.style.top = '';
                img.style.zIndex = '';
                img.style.pointerEvents = '';
                img.style.transform = '';
                img.style.boxShadow = '';
                restoreDragHome();
            }, 500);
        }, 50);
    };

    // pointerdown: store position, enable listeners, but don't drag yet
    img.addEventListener('pointerdown', (e) => {
        if (battleActive) return;
        if (img.dataset.displayLocked === 'true') return;
        wasDragging = false;
        e.preventDefault();
        const rect = img.getBoundingClientRect();
        const startLeft = rect.left;
        const startTop = rect.top;
        captureDragHome();

        // lock element to its visual position before any transform resets
        img.style.transform = 'none';
        img.style.position = 'fixed';
        img.style.margin = '0';
        img.style.left = `${startLeft}px`;
        img.style.top = `${startTop}px`;
        img.style.width = rect.width + 'px';
        img.style.height = rect.height + 'px';
        if (img.parentNode !== document.body) {
            document.body.appendChild(img);
        }

        // compute pointer offset relative to element
        offsetX = e.clientX - startLeft;
        offsetY = e.clientY - startTop;

        img.setPointerCapture(e.pointerId);
        isPressed = true;
        isDragging = false;
        startX = e.clientX;
        startY = e.clientY;
        currentX = e.clientX;
        currentY = e.clientY;
        lastX = e.clientX;
        lastY = e.clientY;
        velocityX = 0;
        velocityY = 0;
        translationX = 0;
        translationY = 0;
        window.addEventListener('pointermove', handlePointerMove);
    });
    window.addEventListener('pointerup', handleEndDrag);
}


let modal, modalImg, modalClose;
function setupModal() {
    modal = document.getElementById('modal');
    modalImg = document.getElementById('modal-img');
    modalClose = document.getElementById('modal-close');

    modalClose.addEventListener('click', () => closeModal());
    modal.addEventListener('click', e => {
        if (e.target === modal) closeModal();
    });

    // ESC key should dismiss while modal is visible
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal.classList.contains('visible')) {
            closeModal();
        }
    });
}

// Modal overlay logic for enlarged card view
let cardOverlay = null;
let cardOverlayImg = null;
let mobileInspect = { overlay: null, cleanup: null };
let gyroPermissionStatus = 'unknown';

function openModal(src, alt) {
    // Remove any existing overlay
    closeModal();
    // Create overlay
    cardOverlay = document.createElement('div');
    cardOverlay.className = 'card-overlay';
    cardOverlay.style.position = 'fixed';
    cardOverlay.style.inset = '0';
    cardOverlay.style.background = 'rgba(0,0,0,0.3)';
    cardOverlay.style.display = 'flex';
    cardOverlay.style.alignItems = 'center';
    cardOverlay.style.justifyContent = 'center';
    cardOverlay.style.zIndex = '9999';
    // Create enlarged card image
    cardOverlayImg = document.createElement('img');
    cardOverlayImg.src = src;
    cardOverlayImg.alt = alt;
    cardOverlayImg.style.maxWidth = '90vw';
    cardOverlayImg.style.maxHeight = '90vh';
    cardOverlayImg.style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)';
    cardOverlayImg.style.borderRadius = '12px';
    cardOverlayImg.style.background = '#fff';
    cardOverlayImg.style.display = 'block';
    cardOverlay.appendChild(cardOverlayImg);
    // Overlay click closes modal ONLY if click is on overlay itself
    cardOverlay.addEventListener('click', function(e) {
        if (e.target === cardOverlay) {
            closeModal();
        }
    });
    // Prevent scroll while modal is open
    document.body.style.overflow = 'hidden';
    document.body.appendChild(cardOverlay);
}

function closeModal() {
    if (cardOverlay) {
        cardOverlay.remove();
        cardOverlay = null;
        cardOverlayImg = null;
    }
    // Restore scroll
    document.body.style.overflow = '';
    // Re-enable interactions if needed (drag/battle logic is already handled elsewhere)
}

function applyHoloMask(holoOverlay, percentX, clamp) {
    if (!holoOverlay) return;
    holoOverlay.style.opacity = '0.85';
    const stripeWidth = 18;
    const start = clamp(percentX - stripeWidth, 0, 100);
    const end = clamp(percentX + stripeWidth, 0, 100);
    const gradient = `linear-gradient(105deg, transparent ${start}%, rgba(255,255,255,1) ${percentX}%, transparent ${end}%)`;
    holoOverlay.style.maskImage = gradient;
    holoOverlay.style.webkitMaskImage = gradient;
}

function attachMobileInspectPointer(wrapper, reflection, holoOverlay) {
    const baseTransform = 'translateX(-50%) perspective(800px) rotateX(0deg) rotateY(0deg)';
    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
    wrapper.style.transform = baseTransform;
    const depthBase = wrapper.querySelector('.depth-base');
    const depthTop = wrapper.querySelector('.depth-top');

    const applyLayerParallax = (shiftX, shiftY) => {
        if (depthBase) depthBase.style.transform = `translate3d(${shiftX * 0.6}px, ${shiftY * 0.6}px, 0)`;
        if (depthTop) depthTop.style.transform = `translate3d(${shiftX * 1.8}px, ${shiftY * 1.8}px, 0)`;
    };

    const resetLayerParallax = () => {
        if (depthBase) depthBase.style.transform = 'translate3d(0, 0, 0)';
        if (depthTop) depthTop.style.transform = 'translate3d(0, 0, 0)';
    };

    const handleMove = (e) => {
        const rect = wrapper.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const rotateX = clamp((e.clientY - centerY) / 20, -6, 6);
        const rotateY = clamp((centerX - e.clientX) / 20, -6, 6);
        wrapper.style.transform = `translateX(-50%) perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        const shiftX = clamp((e.clientX - centerX) / 14, -12, 12);
        const shiftY = clamp((e.clientY - centerY) / 14, -12, 12);
        applyLayerParallax(shiftX, shiftY);

        const percentX = ((e.clientX - rect.left) / rect.width) * 100;
        const percentY = ((e.clientY - rect.top) / rect.height) * 100;

        applyHoloMask(holoOverlay, percentX, clamp);
    };

    const handleLeave = () => {
        wrapper.style.transform = baseTransform;
        resetLayerParallax();
        if (holoOverlay) {
            holoOverlay.style.opacity = '0';
            holoOverlay.style.maskImage = 'none';
            holoOverlay.style.webkitMaskImage = 'none';
        }
    };

    wrapper.addEventListener('pointermove', handleMove);
    wrapper.addEventListener('pointerleave', handleLeave);

    return () => {
        wrapper.removeEventListener('pointermove', handleMove);
        wrapper.removeEventListener('pointerleave', handleLeave);
    };
}

function attachMobileInspectGyro(wrapper, reflection, holoOverlay) {
    const baseTransform = 'translateX(-50%) perspective(800px) rotateX(0deg) rotateY(0deg)';
    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
    wrapper.style.transform = baseTransform;
    const depthBase = wrapper.querySelector('.depth-base');
    const depthTop = wrapper.querySelector('.depth-top');

    const applyLayerParallax = (shiftX, shiftY) => {
        if (depthBase) depthBase.style.transform = `translate3d(${shiftX * 0.6}px, ${shiftY * 0.6}px, 0)`;
        if (depthTop) depthTop.style.transform = `translate3d(${shiftX * 1.8}px, ${shiftY * 1.8}px, 0)`;
    };

    const handleOrientation = (e) => {
        // Calibrate neutral front-back orientation at beta=30deg.
        const beta = clamp((e.beta == null ? 30 : e.beta) - 30, -45, 45);   // front-back tilt
        const gamma = clamp(e.gamma || 0, -45, 45); // left-right tilt
        const rotateX = clamp(beta / 3, -10, 10);
        const rotateY = clamp(gamma / 2, -10, 10);
        wrapper.style.transform = `translateX(-50%) perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        const shiftX = clamp(gamma / 4, -12, 12);
        const shiftY = clamp(beta / 4, -12, 12);
        applyLayerParallax(shiftX, shiftY);

        // Map tilt to a 0-100 range for light hotspot
        const percentX = clamp(((rotateY / 10) + 1) * 50, 0, 100);
        const percentY = clamp((1 - (rotateX / 10)) * 50, 0, 100);

        applyHoloMask(holoOverlay, percentX, clamp);
    };

    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
        window.removeEventListener('deviceorientation', handleOrientation);
    };
}

async function requestGyroPermission() {
    if (typeof DeviceOrientationEvent === 'undefined') return false;
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        if (gyroPermissionStatus === 'granted') return true;
        try {
            const res = await DeviceOrientationEvent.requestPermission();
            gyroPermissionStatus = res === 'granted' ? 'granted' : 'denied';
            return res === 'granted';
        } catch (e) {
            gyroPermissionStatus = 'denied';
            return false;
        }
    }
    // non-iOS browsers usually allow without prompt
    gyroPermissionStatus = 'granted';
    return true;
}

function closeMobileInspect() {
    if (mobileInspect.cleanup) mobileInspect.cleanup();
    if (mobileInspect.overlay && mobileInspect.overlay.parentNode) {
        mobileInspect.overlay.parentNode.removeChild(mobileInspect.overlay);
    }
    mobileInspect = { overlay: null, cleanup: null };
    document.body.classList.remove('mobile-inspect-open');
    document.body.style.overflow = '';
}

function openMobileInspect(img) {
    const isDesktop = window.matchMedia && window.matchMedia('(min-width: 1024px)').matches;
    if (isDesktop) return;

    closeInfoPanel();
    closeMobileInspect();

    const overlay = document.createElement('div');
    overlay.className = 'mobile-inspect-overlay';

    const panel = document.createElement('div');
    panel.className = 'mobile-inspect-panel';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'mobile-inspect-close';
    closeBtn.textContent = '';
    closeBtn.setAttribute('aria-label', 'Cerrar inspeccion');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMobileInspect();
    });

    const cardWrap = document.createElement('div');
    cardWrap.className = 'mobile-inspect-card';

    const clone = img.cloneNode(true);
    clone.removeAttribute('style');
    clone.classList.remove('dragging', 'returning');
    clone.classList.add('mobile-inspect-clone');
    clone.style.pointerEvents = 'none';

    const reflection = document.createElement('div');
    reflection.className = 'card-reflection';

    const holoOverlay = document.createElement('div');
    holoOverlay.className = 'holo-overlay';
    cardWrap.classList.add('holo');

    cardWrap.appendChild(clone);
    if (holoOverlay) cardWrap.appendChild(holoOverlay);
    cardWrap.appendChild(reflection);

    const infoBox = document.createElement('div');
    infoBox.className = 'mobile-inspect-info';

    const stats = document.createElement('div');
    stats.className = 'mobile-inspect-stats';

    const albumEl = document.createElement('p');
    const copiesEl = document.createElement('p');
    const winsEl = document.createElement('p');
    stats.appendChild(albumEl);
    stats.appendChild(copiesEl);
    stats.appendChild(winsEl);

    const desc = document.createElement('p');
    desc.className = 'mobile-inspect-description';
    desc.textContent = '';

    const info = getCardInfoFromImg(img);
    let albumText = '';
    let copiesText = '';
    let winsText = '';
    if (info.group && info.num != null) {
        const record = (collection[info.group] && collection[info.group][info.num]) || { quantity: 0, wins: 0 };
        albumText = `N.Álbum ${info.num}`;
        copiesText = `N.Copias ${record.quantity || 0}`;
        winsText = `N.Victorias ${record.wins || 0}`;
    }

    infoBox.appendChild(stats);
    infoBox.appendChild(desc);

    panel.appendChild(cardWrap);
    panel.appendChild(infoBox);
    panel.appendChild(closeBtn);
    overlay.appendChild(panel);

    let cleanupEffects = attachMobileInspectPointer(cardWrap, reflection, holoOverlay);

    panel.addEventListener('click', (e) => e.stopPropagation());

    document.body.classList.add('mobile-inspect-open');
    document.body.style.overflow = 'hidden';
    document.body.appendChild(overlay);

    const filename = (clone.dataset.filename || clone.alt || img.dataset.filename || img.alt || '');
    const descriptionText = CARD_DESCRIPTIONS[filename] || '';
    typewriterEl(albumEl, albumText, 600);
    typewriterEl(copiesEl, copiesText, 600);
    typewriterEl(winsEl, winsText, 600);
    typewriterEl(desc, descriptionText, 900);

    // Try to switch to gyro-based tilt if available
    requestGyroPermission().then(granted => {
        if (!granted) return;
        if (cleanupEffects) cleanupEffects();
        cleanupEffects = attachMobileInspectGyro(cardWrap, reflection, holoOverlay);
        mobileInspect.cleanup = cleanupEffects;
    }).catch(() => {});

    mobileInspect = { overlay, cleanup: cleanupEffects };
}

// function closeModal() {
//     if (!modal.classList.contains('visible')) return;
//     // trigger reverse animation by removing the visible class
//     modal.classList.remove('visible');

//     // once the overlay fade‑out has completed, clear the image
//     const onTransitionEnd = (e) => {
//         if (e.target === modal && e.propertyName === 'opacity' && !modal.classList.contains('visible')) {
//             modalImg.src = '';
//             modalImg.alt = '';
//             modal.removeEventListener('transitionend', onTransitionEnd);
//         }
//     };
//     modal.addEventListener('transitionend', onTransitionEnd);
// }

// envelope state machine -------------------------------------------------
let envelopeState = 'idle';
let closeInfoPanel = () => {};
const displayState = {
    card: null,
    originalParent: null,
    originalNextSibling: null,
    wrapper: null,
    reflection: null,
    cleanup: null
};
const bottomDrawerState = {
    isOpen: false
};
const leftDrawerState = {
    isOpen: false
};
const rightDrawerState = {
    isOpen: false
};

// battle arena globals ----------------------------------------------------
let battleActive = false;
let isFighting = false;
let cooldownInterval = null;

function isMobileBattleLocked() {
    const isMobile = window.matchMedia && window.matchMedia('(max-width: 1024px)').matches;
    if (!isMobile) return false;
    return !!(battleController.leftImg || battleController.rightImg || battleActive || isFighting);
}

function clearBattleSlots() {
    const zone = document.getElementById('battle-zone');
    if (!zone) return;

    zone.querySelectorAll('.battle-slot').forEach(slot => {
        Array.from(slot.children).forEach(child => {
            if (child.classList && child.classList.contains('dash-border')) return;
            child.remove();
        });
        slot.classList.remove('battle-attack', 'battle-shake', 'battle-jump', 'battle-lose');
    });

    const txt = zone.querySelector('.fight-text');
    if (txt) txt.classList.remove('show');
}

const battleController = {
    leftImg: null,
    rightImg: null,
    async start() {
        battleActive = true;
        isFighting = true;
        await showFightText();
        const turns = 4 + Math.floor(Math.random() * 2);
        let attackerLeft = true;
        for (let i = 0; i < turns; i++) {
            const attacker = attackerLeft ? this.leftImg : this.rightImg;
            const defender = attackerLeft ? this.rightImg : this.leftImg;
            await attackAnimation(attacker, attackerLeft ? 40 : -40);
            await shakeAnimation(defender);
            await wait(1000 + Math.random() * 1000);
            attackerLeft = !attackerLeft;
        }
        await this.declareWinner();
    },
    async declareWinner() {
        const winnerIsLeft = Math.random() < 0.5;
        const winner = winnerIsLeft ? this.leftImg : this.rightImg;
        const loser = winnerIsLeft ? this.rightImg : this.leftImg;
        await loseAnimation(loser);
        await winAnimation(winner);
        await wait(600); // victory animation duration
        winner.classList.add('battle-lose'); // fade out winner
        await wait(400); // pause before reset
        // Track a battle victory for the winning card and persist the collection.
        recordBattleWinFromImage(winner);
        this.resetBattle();
    },
    resetBattle() {
        clearBattleSlots();
        this.leftImg = null;
        this.rightImg = null;
        isFighting = false;
        battleActive = false;
        updateConseguirFichasBtnState();
        // Drag is automatically re-enabled by flag
    }
};

function wait(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function showFightText() {
    const txt = document.querySelector('#battle-zone .fight-text');
    txt.classList.add('show');
    return wait(300).then(() => txt.classList.remove('show'));
}

function attackAnimation(el, offset) {
    return new Promise(resolve => {
        el.classList.add('battle-attack');
        el.style.transform = `translateX(${offset}px)`;
        const cleanup = () => {
            el.removeEventListener('transitionend', cleanup);
            // return to original position
            el.style.transform = '';
            el.addEventListener('transitionend', () => {
                el.classList.remove('battle-attack');
                resolve();
            }, { once: true });
        };
        el.addEventListener('transitionend', cleanup, { once: true });
    });
}

function shakeAnimation(el) {
    return new Promise(resolve => {
        el.classList.add('battle-shake');
        el.addEventListener('animationend', () => {
            el.classList.remove('battle-shake');
            resolve();
        }, { once: true });
    });
}
        function displayStateCleanupOnResize() {
        }
function winAnimation(el) {
    return new Promise(resolve => {
        el.classList.add('battle-jump');
        // animation runs twice automatically via CSS
        el.addEventListener('animationend', () => {
            el.classList.remove('battle-jump');
            resolve();
        }, { once: true });
    });
}

function loseAnimation(el) {
    return new Promise(resolve => {
        el.classList.add('battle-lose');
        el.addEventListener('transitionend', () => resolve(), { once: true });
    });
}

function pointInRect(x, y, rect) {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function findAlbumHomeForCard(card) {
    if (!card) return null;
    const info = getCardInfoFromImg(card);
    if (!info.group || info.num == null) return null;
    return document.querySelector(`.card-slot[data-group="${info.group}"][data-slot="${info.num}"]`) || null;
}

function tryPlaceInDisplayZone(img, x, y) {
    if (!window.matchMedia || !window.matchMedia('(min-width: 1024px)').matches) return false;
    const zone = document.getElementById('display-zone');
    const container = zone ? zone.querySelector('.display-card-container') : null;
    if (!zone || !container || !zone.classList.contains('visible')) return false;

    const rect = zone.getBoundingClientRect();
    if (!pointInRect(x, y, rect)) return false;

    if (displayState.card && displayState.card !== img) {
        closeDisplayZone();
    }

    const homeFromDrag = img._dragHomeParent || null;
    const fallbackAlbumHome = findAlbumHomeForCard(img);
    const fallbackParentNode = (img.parentNode && img.parentNode !== document.body) ? img.parentNode : null;
    displayState.originalParent = homeFromDrag || fallbackAlbumHome || fallbackParentNode;
    displayState.originalNextSibling = img._dragHomeNextSibling || img.nextSibling;
    img._dragHomeParent = null;
    img._dragHomeNextSibling = null;
    displayState.card = img;

    if (img.parentNode) {
        img.parentNode.removeChild(img);
    }
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'display-card-wrapper enter active';
    const reflection = document.createElement('div');
    reflection.className = 'card-reflection';
    wrapper.appendChild(img);
    const isDesktop = window.matchMedia && window.matchMedia('(min-width: 1024px)').matches;
    if (isDesktop) {
        const overlay = document.createElement('div');
        overlay.className = 'holo-overlay';
        wrapper.classList.add('holo');
        wrapper.appendChild(overlay);
    }
    wrapper.appendChild(reflection);
    const drawCanvas = document.createElement('canvas');
    drawCanvas.className = 'display-draw-layer';
    wrapper.appendChild(drawCanvas);
    container.appendChild(wrapper);

    setupDisplayCardEffects(wrapper, reflection);
    displayState.wrapper = wrapper;
    displayState.reflection = reflection;

    img.classList.remove('dragging', 'returning');
    img.style.position = '';
    img.style.margin = '';
    img.style.width = '';
    img.style.height = '';
    img.style.left = '';
    img.style.top = '';
    img.style.zIndex = '';
    img.style.pointerEvents = 'auto';
    img.style.transform = '';
    img.style.boxShadow = '';
    img.dataset.displayLocked = 'true';

    zone.classList.add('active', 'visible');
    zone.classList.add('has-card');
    closeInfoPanel();
    updateDisplayStatsFromImage(img);
    return true;
}

function tryPlaceInBattleZone(img, x, y) {
    const leftSlot = document.querySelector('#battle-zone .battle-slot.left');
    const rightSlot = document.querySelector('#battle-zone .battle-slot.right');
    const battleToggle = document.getElementById('battle-drawer-toggle');
    const leftRect = leftSlot.getBoundingClientRect();
    const rightRect = rightSlot.getBoundingClientRect();

    if (pointInRect(x, y, leftRect) && !battleController.leftImg) {
        const clone = img.cloneNode(true);
        // remove any inline style left from dragging/resize
        clone.removeAttribute('style');
        clone.classList.remove('dragging', 'returning');
        clone.style.pointerEvents = 'none';
        clone.style.position = 'relative';
        leftSlot.appendChild(clone);
        battleController.leftImg = clone;
        if (battleToggle) battleToggle.checked = true;
        closeInfoPanel();
        checkBattleStart();
        return true;
    }
    if (pointInRect(x, y, rightRect) && !battleController.rightImg) {
        const clone = img.cloneNode(true);
        clone.removeAttribute('style');
        clone.classList.remove('dragging', 'returning');
        clone.style.pointerEvents = 'none';
        clone.style.position = 'relative';
        rightSlot.appendChild(clone);
        battleController.rightImg = clone;
        if (battleToggle) battleToggle.checked = true;
        closeInfoPanel();
        checkBattleStart();
        return true;
    }
    return false;
}

function checkBattleStart() {
    if (battleController.leftImg && battleController.rightImg && !battleActive) {
        updateConseguirFichasBtnState();
        playSound(battleStartSound);
        battleController.start();
    }
}

// hook modal close to clear battle zone when fight is done
const originalCloseModal = closeModal;
function closeModal() {
    originalCloseModal();
    // after modal fully hidden, clear zone
    const handler = (e) => {
        if (e.target === modal && e.propertyName === 'opacity' && !modal.classList.contains('visible')) {
            battleController.clear();
            modal.removeEventListener('transitionend', handler);
        }
    };
    modal.addEventListener('transitionend', handler);
}


function setupEnvelope() {
    const env = document.getElementById('envelope');
    if (!env) return;
    
    // initialize to idle state with idle animation
    env.classList.add('idle');
    
    env.addEventListener('click', () => {
        // ignore clicks if not in idle state
        if (envelopeState !== 'idle') return;
        if (!hasRemainingCards()) return;
        
        handleEnvelopeClick();
    });
}

function updateEnvelopeVisibilityForAlbum() {
    const container = document.querySelector('.envelope-container');
    const envelope = document.getElementById('envelope');
    const anyOpen = !!document.querySelector('.group.open');
    if (!container || !envelope) return;
    if (anyOpen) {
        container.classList.add('hidden-during-album');
        envelope.style.pointerEvents = 'none';
    } else {
        container.classList.remove('hidden-during-album');
        updateEnvelopeState();
    }
}

function setupDisplayZone() {
    const zone = document.getElementById('display-zone');
    if (!zone) return;
    const closeBtn = zone.querySelector('.display-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            closeDisplayZone();
            updateDisplayZoneVisibility();
        });
    }
}

function closeDisplayZone() {
    const zone = document.getElementById('display-zone');
    const container = zone ? zone.querySelector('.display-card-container') : null;
    if (displayState.cleanup) {
        displayState.cleanup();
        displayState.cleanup = null;
    }
    if (displayState.card) {
        const card = displayState.card;
        const restoreParent = displayState.originalParent || findAlbumHomeForCard(card);
        card.dataset.displayLocked = '';
        card.style.pointerEvents = '';
        card.style.position = '';
        card.style.margin = '';
        card.style.width = '';
        card.style.height = '';
        card.style.left = '';
        card.style.top = '';
        card.style.zIndex = '';
        card.style.transform = '';
        card.style.boxShadow = '';
        if (restoreParent) {
            if (displayState.originalNextSibling && displayState.originalNextSibling.parentNode === restoreParent) {
                restoreParent.insertBefore(card, displayState.originalNextSibling);
            } else {
                restoreParent.appendChild(card);
            }
        }
    }
    if (container) container.innerHTML = '';
    displayState.card = null;
    displayState.originalParent = null;
    displayState.originalNextSibling = null;
    displayState.wrapper = null;
    displayState.reflection = null;
    clearDisplayStats();
    if (zone) {
        zone.classList.remove('active');
        zone.classList.remove('has-card');
        // visibility will be handled by updateDisplayZoneVisibility
    }
}

function updateDisplayZoneVisibility() {
    const zone = document.getElementById('display-zone');
    if (!zone) return;
    if (!rightDrawerState.isOpen) {
        closeDisplayZone();
        zone.classList.remove('visible');
        return;
    }
    zone.classList.add('visible');
}

function getCooldownElements() {
    return {
        env: document.getElementById('envelope'),
        note: document.querySelector('.envelope-note'),
        timer: document.querySelector('.cooldown-timer')
    };
}

function isCooldownActive() {
    const stored = Number(localStorage.getItem('nextPackTime'));
    return !!stored && stored > Date.now();
}

function setupInfoOverlay() {
    const trigger = document.querySelector('.info-trigger');
    const panel = document.getElementById('info-panel');
    const infoMain = panel ? panel.querySelector('.info-main') : null;
    const infoMetaLeft = panel ? panel.querySelector('.info-meta-left') : null;
    const infoMetaRight = panel ? panel.querySelector('.info-meta-right') : null;
    if (!trigger || !panel || !infoMain || !infoMetaLeft || !infoMetaRight) return;

    const infoFullText = infoMain.dataset.fullText || '';
    const infoMetaLeftText = infoMetaLeft.dataset.fullText || '';
    const infoMetaRightText = infoMetaRight.dataset.fullText || '';
    let typeRaf = null;
    const isMobileViewport = () => window.matchMedia && window.matchMedia('(max-width: 1024px)').matches;

    const escapeHtml = (str) => str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const renderPlain = (el, fullText, count) => {
        el.textContent = fullText.slice(0, count);
    };

    const renderMeta = (el, fullText, count) => {
        const parts = fullText.split('\n');
        const label = parts[0] || '';
        const labelCount = Math.min(count, label.length);
        const labelHtml = `<span class="info-meta-label">${escapeHtml(label.slice(0, labelCount))}</span>`;

        if (count <= label.length) {
            el.innerHTML = labelHtml;
            return;
        }

        const restCount = count - label.length;
        const restRaw = fullText.slice(label.length, label.length + restCount);
        const restHtml = escapeHtml(restRaw).replace(/\n/g, '<br>');
        el.innerHTML = `${labelHtml}${restHtml}`;
    };

    const stopTypewriter = () => {
        if (typeRaf) {
            cancelAnimationFrame(typeRaf);
            typeRaf = null;
        }
        infoMain.classList.remove('typing');
    };

    const playTypewriter = () => {
        stopTypewriter();
        renderPlain(infoMain, infoFullText, 0);
        renderMeta(infoMetaLeft, infoMetaLeftText, 0);
        renderMeta(infoMetaRight, infoMetaRightText, 0);
        infoMain.classList.add('typing');

        const segments = [
            { el: infoMain, text: infoFullText, render: renderPlain },
            { el: infoMetaLeft, text: infoMetaLeftText, render: renderMeta },
            { el: infoMetaRight, text: infoMetaRightText, render: renderMeta }
        ];
        const totalChars = segments.reduce((sum, s) => sum + s.text.length, 0);
        const duration = 800;
        const start = performance.now();

        const frame = (now) => {
            const progress = Math.min(1, (now - start) / duration);
            let remaining = Math.floor(totalChars * progress);

            segments.forEach(seg => {
                const take = Math.max(0, Math.min(seg.text.length, remaining));
                seg.render(seg.el, seg.text, take);
                remaining -= take;
            });

            if (progress < 1) {
                typeRaf = requestAnimationFrame(frame);
            } else {
                stopTypewriter();
            }
        };

        typeRaf = requestAnimationFrame(frame);
    };

    const isAnyDrawerOpen = () => {
        return !!document.querySelector(
            '#battle-drawer-toggle:checked, #inspect-drawer-toggle:checked, #battle-zone .battle-slot img, #display-zone.has-card'
        );
    };

    const open = () => {
        panel.classList.add('visible');
        trigger.classList.add('open');
        panel.setAttribute('aria-hidden', 'false');
        if (isMobileViewport()) document.body.classList.add('mobile-info-open');
        playTypewriter();
    };

    const close = () => {
        panel.classList.remove('visible');
        trigger.classList.remove('open');
        panel.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('mobile-info-open');
        stopTypewriter();
    };

    closeInfoPanel = close;

    trigger.addEventListener('click', () => {
        if (!panel.classList.contains('visible') && isAnyDrawerOpen()) {
            return;
        }
        if (panel.classList.contains('visible')) {
            close();
        } else {
            open();
        }
    });

    const battleToggle = document.getElementById('battle-drawer-toggle');
    const inspectToggle = document.getElementById('inspect-drawer-toggle');
    [battleToggle, inspectToggle].forEach(toggle => {
        if (!toggle) return;
        toggle.addEventListener('change', () => {
            if (toggle.checked) close();
        });
    });

    window.addEventListener('resize', () => {
        if (!isMobileViewport()) document.body.classList.remove('mobile-info-open');
    });
}

function showEnvelopeNow() {
    const { env, note, timer } = getCooldownElements();
    if (timer) timer.style.display = 'none';
    if (env) {
        env.style.display = 'block';
        env.classList.add('hidden-envelope');
        // force reflow before revealing to trigger transition
        void env.offsetHeight;
        env.classList.remove('hidden-envelope');
        env.classList.add('idle');
        env.src = 'images/envelope-closed.gif';
        env.style.pointerEvents = 'auto';
        envelopeState = 'idle';
    }
    if (note) note.style.display = '';
}

function setupDisplayCardEffects(wrapper, reflection) {
    const baseTransform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
    wrapper.style.transform = baseTransform;

    const holoOverlay = wrapper.querySelector('.holo-overlay');
    const depthTopLayer = wrapper.querySelector('.depth-top');
    const drawCanvas = wrapper.querySelector('.display-draw-layer');
    const drawCtx = drawCanvas ? drawCanvas.getContext('2d') : null;
    let brushEnabled = false;
    let hasDrawPoint = false;
    let lastDrawX = 0;
    let lastDrawY = 0;

    const resizeDrawLayer = () => {
        if (!drawCanvas || !drawCtx) return;
        const rect = wrapper.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const targetWidth = Math.round(width * dpr);
        const targetHeight = Math.round(height * dpr);

        if (drawCanvas.width === targetWidth && drawCanvas.height === targetHeight) {
            return;
        }

        const snapshot = document.createElement('canvas');
        snapshot.width = drawCanvas.width;
        snapshot.height = drawCanvas.height;
        const snapshotCtx = snapshot.getContext('2d');
        if (snapshotCtx && snapshot.width > 0 && snapshot.height > 0) {
            snapshotCtx.drawImage(drawCanvas, 0, 0);
        }

        drawCanvas.width = targetWidth;
        drawCanvas.height = targetHeight;
        drawCanvas.style.width = width + 'px';
        drawCanvas.style.height = height + 'px';

        drawCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawCtx.lineCap = 'round';
        drawCtx.lineJoin = 'round';
        drawCtx.strokeStyle = '#000000';
        drawCtx.lineWidth = 4;

        if (snapshot.width > 0 && snapshot.height > 0) {
            drawCtx.drawImage(snapshot, 0, 0, width, height);
        }
    };

    const getDrawPoint = (e) => {
        if (!drawCanvas) return { x: 0, y: 0 };
        const rect = drawCanvas.getBoundingClientRect();
        const x = clamp(e.clientX - rect.left, 0, rect.width);
        const y = clamp(e.clientY - rect.top, 0, rect.height);
        return { x, y };
    };

    const handleToggleBrush = (e) => {
        if (e.button !== 0 || !drawCtx) return;
        brushEnabled = !brushEnabled;
        wrapper.classList.toggle('draw-enabled', brushEnabled);
        if (!brushEnabled) {
            hasDrawPoint = false;
            drawCtx.beginPath();
            return;
        }
        const point = getDrawPoint(e);
        lastDrawX = point.x;
        lastDrawY = point.y;
        hasDrawPoint = true;
    };

    const handleMove = (e) => {
        const rect = wrapper.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const rotateX = clamp((e.clientY - centerY) / 20, -6, 6);
        const rotateY = clamp((centerX - e.clientX) / 20, -6, 6);
        wrapper.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

        const percentX = ((e.clientX - rect.left) / rect.width) * 100;
        const percentY = ((e.clientY - rect.top) / rect.height) * 100;
        reflection.style.background = `radial-gradient(circle at ${percentX}% ${percentY}%, rgba(255,255,255,0.45), rgba(255,255,255,0.15) 30%, transparent 60%)`;
        wrapper.classList.add('active');

        if (holoOverlay) {
            holoOverlay.style.opacity = '0.85';
            const stripeWidth = 18; // width of the bright band in percent
            const start = clamp(percentX - stripeWidth, 0, 100);
            const end = clamp(percentX + stripeWidth, 0, 100);
            const gradient = `linear-gradient(105deg, transparent ${start}%, rgba(255,255,255,1) ${percentX}%, transparent ${end}%)`;
            holoOverlay.style.maskImage = gradient;
            holoOverlay.style.webkitMaskImage = gradient;
        }

        if (depthTopLayer) {
            const parallaxX = ((percentX - 50) / 50) * 8;
            const parallaxY = ((percentY - 50) / 50) * 8;
            const layerRotateX = rotateX * 0.55;
            const layerRotateY = rotateY * 0.55;
            depthTopLayer.style.transform = `translateZ(30px) rotateX(${layerRotateX}deg) rotateY(${layerRotateY}deg) translate3d(${parallaxX}px, ${parallaxY}px, 0)`;
        }

        if (brushEnabled && drawCtx) {
            const point = getDrawPoint(e);
            if (!hasDrawPoint) {
                lastDrawX = point.x;
                lastDrawY = point.y;
                hasDrawPoint = true;
                return;
            }
            drawCtx.beginPath();
            drawCtx.moveTo(lastDrawX, lastDrawY);
            drawCtx.lineTo(point.x, point.y);
            drawCtx.stroke();
            lastDrawX = point.x;
            lastDrawY = point.y;
        }
    };

    const handleLeave = () => {
        wrapper.style.transform = baseTransform;
        wrapper.classList.remove('active');
        hasDrawPoint = false;
        if (holoOverlay) {
            holoOverlay.style.opacity = '0';
            holoOverlay.style.maskImage = 'none';
            holoOverlay.style.webkitMaskImage = 'none';
        }
        if (depthTopLayer) {
            depthTopLayer.style.transform = 'translateZ(30px)';
        }
    };

    const handleAnimEnd = () => {
        wrapper.classList.remove('enter');
    };

    const resizeObserver = typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => resizeDrawLayer())
        : null;

    resizeDrawLayer();
    if (resizeObserver) resizeObserver.observe(wrapper);

    wrapper.addEventListener('mousemove', handleMove);
    wrapper.addEventListener('mouseleave', handleLeave);
    wrapper.addEventListener('mousedown', handleToggleBrush);
    wrapper.addEventListener('animationend', handleAnimEnd, { once: true });

    displayState.cleanup = () => {
        wrapper.removeEventListener('mousemove', handleMove);
        wrapper.removeEventListener('mouseleave', handleLeave);
        wrapper.removeEventListener('mousedown', handleToggleBrush);
        if (resizeObserver) resizeObserver.disconnect();
    };
}

function typewriterEl(el, text, duration) {
    if (el._typeRaf) cancelAnimationFrame(el._typeRaf);
    el.textContent = '';
    if (!text) return;
    const start = performance.now();
    const frame = (now) => {
        const count = Math.min(text.length, Math.floor(text.length * Math.min(1, (now - start) / duration)));
        el.textContent = text.slice(0, count);
        if (count < text.length) {
            el._typeRaf = requestAnimationFrame(frame);
        } else {
            el._typeRaf = null;
        }
    };
    el._typeRaf = requestAnimationFrame(frame);
}

function updateDisplayStatsFromImage(img) {
    const zone = document.getElementById('display-zone');
    if (!zone) return;
    const albumEl = zone.querySelector('.stat-album');
    const winsEl = zone.querySelector('.stat-wins');
    const copiesEl = zone.querySelector('.stat-copies');
    if (!albumEl || !winsEl || !copiesEl) return;

    const info = getCardInfoFromImg(img);
    if (!info.group || info.num == null) {
        albumEl.textContent = '';
        winsEl.textContent = '';
        copiesEl.textContent = '';
        return;
    }

    const record = (collection[info.group] && collection[info.group][info.num]) || { quantity: 0, wins: 0 };
    const albumNumber = info.num;
    typewriterEl(albumEl,  `N.Álbum ${albumNumber}`,   600);
    typewriterEl(copiesEl, `N.Copias ${record.quantity || 0}`, 600);
    typewriterEl(winsEl,   `N.Victorias ${record.wins || 0}`,  600);

    const descEl = zone.querySelector('.card-description');
    if (descEl) {
        const filename = img.dataset.filename || img.alt || '';
        const desc = CARD_DESCRIPTIONS[filename] || '';
        typewriterEl(descEl, desc, 900);
    }
}

function clearDisplayStats() {
    const zone = document.getElementById('display-zone');
    if (!zone) return;
    const fields = zone.querySelectorAll('.stat-album, .stat-wins, .stat-copies');
    fields.forEach(el => { el.textContent = ''; });
    const descEl = zone.querySelector('.card-description');
    if (descEl) descEl.textContent = '';
}

function recordBattleWinFromImage(img) {
    const info = getCardInfoFromImg(img);
    if (!info.group || info.num == null) return;
    const record = ensureCardRecord(info.group, info.num);
    record.wins += 1;
    saveCollection();
}

function updateConseguirFichasBtnState() {
    const btn = document.querySelector('.conseguir-fichas-btn');
    if (!btn) return;
    const canOpen = !isCooldownActive() && hasRemainingCards() && !isMobileBattleLocked();
    btn.disabled = !canOpen;
    btn.style.opacity = canOpen ? '1' : '0.4';
    btn.style.cursor = canOpen ? 'pointer' : 'not-allowed';
    if (canOpen) {
        btn.textContent = 'Conseguir fichas';
        btn.classList.remove('counting-down');
    } else if (isCooldownActive()) {
        const remaining = Math.max(0, Number(localStorage.getItem('nextPackTime')) - Date.now());
        const totalSeconds = Math.ceil(remaining / 1000);
        const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        btn.textContent = `${hours}/${minutes}/${seconds}`;
        btn.classList.add('counting-down');
    }
}

function setupConseguirFichasBtn() {
    const btn = document.querySelector('.conseguir-fichas-btn');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isCooldownActive() || !hasRemainingCards() || isMobileBattleLocked()) return;
        playSound(conseguirFichasSound);
        // Close bottom drawer first, then open pack after the click event fully resolves
        bottomDrawerState.isOpen = false;
        const panel = document.getElementById('bottom-drawer-panel');
        const control = document.querySelector('.open-pack-text-bottom');
        const battleZone = document.getElementById('battle-zone');
        if (panel) {
            panel.classList.remove('is-open');
            panel.setAttribute('aria-hidden', 'true');
        }
        if (control) {
            control.classList.remove('is-open');
            control.setAttribute('aria-expanded', 'false');
            const lbl = control.querySelector('.open-pack-label');
            const plus = control.querySelector('.open-pack-plus');
            if (lbl) lbl.textContent = 'ABRIR';
            if (plus) plus.textContent = '+';
        }
        if (battleZone) {
            battleZone.classList.remove('mobile-bottom-visible');
        }
        updateConseguirFichasBtnState();
        // Defer by one tick so pointer/click events from this interaction don't bleed into the overlay
        setTimeout(() => {
            openEnvelope();
            startCooldown();
        }, 50);
    });
    updateConseguirFichasBtnState();
}

function updateEnvelopeState() {
    const envelope = document.getElementById('envelope');
    const { note, timer } = getCooldownElements();
    updateConseguirFichasBtnState();
    if (!envelope) return;

    if (isCooldownActive()) {
        envelope.classList.add('disabled');
        envelope.style.pointerEvents = 'none';
        envelope.style.display = 'block';
        if (note) note.style.display = 'none';
        if (timer) timer.style.display = 'block';
        return;
    }

    if (!hasRemainingCards()) {
        envelope.classList.add('disabled');
        envelope.style.pointerEvents = 'none';
        envelope.style.display = 'none';
        const text = document.querySelector('.envelope-text') || document.querySelector('.envelope-note');
        if (text) text.textContent = 'no hay mas amigos por el momento';
        if (timer) timer.style.display = 'none';
    } else {
        envelope.classList.remove('disabled');
        envelope.style.pointerEvents = 'auto';
        envelope.style.display = 'block';
        if (note) note.style.display = '';
        if (timer) timer.style.display = 'none';
    }
}

function handleEnvelopeClick() {
    const env = document.getElementById('envelope');
    envelopeState = 'opening';
    
    // stop idle animations
    env.classList.remove('idle');
    
    // 1. press effect: scale(0.95) for 120ms
    env.style.transform = 'scale(0.95)';
    
    // swap to open art before movement so the slide uses the open graphic
    requestAnimationFrame(() => {
        env.src = 'images/envelope-open.gif';
        env.style.transform = '';
        playSound(packOpenSound);

        // next frame: start the slide with the open image already visible
        requestAnimationFrame(() => {
            setTimeout(() => {
                env.classList.add('hidden-envelope');

                // trigger card reveal slightly after starting the slide
                setTimeout(() => {
                    openEnvelope();
                    startCooldown();

                    // allow the slower slide animation to finish
                    setTimeout(() => {
                        envelopeState = 'hidden';
                    }, 1200);
                }, 150);
            }, 500); // allow open image to paint before sliding
        });
    });
}

function startCooldown(existingTime) {
    if (!hasRemainingCards()) return;
    const { env, note, timer } = getCooldownElements();
    if (!env || !timer) return;

    const targetTime = existingTime && existingTime > Date.now() ? existingTime : Date.now() + PACK_COOLDOWN;
    localStorage.setItem('nextPackTime', targetTime);

    if (cooldownInterval) {
        clearInterval(cooldownInterval);
        cooldownInterval = null;
    }

    env.classList.add('disabled');
    env.style.pointerEvents = 'none';
    env.style.display = 'block';
    if (note) note.style.display = 'none';
    timer.style.display = 'block';

    const updateCountdown = () => {
        const now = Date.now();
        const remaining = Math.max(0, targetTime - now);
        if (remaining <= 0) {
            clearInterval(cooldownInterval);
            cooldownInterval = null;
            localStorage.removeItem('nextPackTime');
            showEnvelopeNow();
            updateEnvelopeState();
            return;
        }
        const totalSeconds = Math.ceil(remaining / 1000);
        const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        timer.textContent = `Nuevo sobre en (${hours}/${minutes}/${seconds})`;
        updateConseguirFichasBtnState();
    };

    updateCountdown();
    cooldownInterval = setInterval(updateCountdown, 1000);
}

function resumePackCooldown() {
    const stored = Number(localStorage.getItem('nextPackTime'));
    if (stored && stored > Date.now() && hasRemainingCards()) {
        startCooldown(stored);
    } else {
        localStorage.removeItem('nextPackTime');
        showEnvelopeNow();
    }
}

// pack reveal logic ------------------------------------------------------
// overlay shows a stacked deck; click anywhere to reveal next card
function showPackOverlay(filenames) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay stack-overlay';

    const stack = document.createElement('div');
    stack.className = 'card-stack stack-enter';
    stack.style.touchAction = 'manipulation';

    filenames.forEach((name, index) => {
        const depth = filenames.length - 1 - index;
        const offsetY = depth * 4;
        const scale = 1 - depth * 0.02;
        const { node, img } = createCardElement(name, 'pack-card-wrapper', { wrapNonHolo: true, allowHolo: false });
        img.classList.add('stack-card');
        img.dataset.cardName = name;
        const baseTransform = `translate(-50%, -50%) translateY(${offsetY}px) scale(${scale})`;
        node.dataset.baseTransform = baseTransform;
        node.style.transform = baseTransform;
        node.style.zIndex = String(200 + index);
        stack.appendChild(node);
    });

    overlay.appendChild(stack);
    document.body.appendChild(overlay);

    const closeOverlay = () => {
        overlay.classList.remove('visible');
        setTimeout(() => {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            returnEnvelope();
        }, 300);
    };

    const showBadgeForTopCard = () => {
        const topCard = stack.lastElementChild;
        if (!topCard) return;
        const img = topCard.querySelector('img');
        const cardName = img ? img.dataset.cardName || img.alt : topCard.dataset.cardName;
        if (isFirstCopy(cardName) && !topCard.querySelector('.new-badge')) {
            const badge = document.createElement('div');
            badge.className = 'new-badge';
            badge.textContent = '¡Nueva!';
            const sparklesMask = document.createElement('div');
            sparklesMask.className = 'new-sparkles-mask';
            const sparkles = document.createElement('div');
            sparkles.className = 'new-sparkles';
            sparklesMask.appendChild(sparkles);
            topCard.appendChild(badge);
            topCard.appendChild(sparklesMask);
            triggerSparkleOverlay();
        }
    };

    // Single overlay-level listener — no per-card event juggling needed
    let advanceLocked = false;
    const advanceStack = () => {
        if (advanceLocked) return;
        const topCard = stack.lastElementChild;
        if (!topCard) {
            closeOverlay();
            return;
        }
        advanceLocked = true;

        const img = topCard.querySelector('img');
        const cardName = img ? img.dataset.cardName || img.alt : topCard.dataset.cardName;

        playSound(cardRevealSound);
        topCard.classList.add('stack-card-revealing');
        topCard.style.transform = `${topCard.dataset.baseTransform} translateX(300px) rotate(8deg)`;
        topCard.style.opacity = '0';

        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            addCard(cardName);
            if (topCard.parentNode === stack) stack.removeChild(topCard);
            advanceLocked = false;
            if (stack.lastElementChild) {
                showBadgeForTopCard();
            } else {
                closeOverlay();
            }
        };

        topCard.addEventListener('transitionend', finish, { once: true });
        setTimeout(finish, 700);
    };

    overlay.addEventListener('click', advanceStack);

    requestAnimationFrame(() => overlay.classList.add('visible'));
    setTimeout(showBadgeForTopCard, 350);
}


function returnEnvelope() {
    const env = document.getElementById('envelope');
    const { note, timer } = getCooldownElements();
    if (isCooldownActive()) {
        if (env) {
            env.style.display = 'none';
            env.classList.add('hidden-envelope');
        }
        if (note) note.style.display = 'none';
        if (timer) timer.style.display = 'block';
        return;
    }
    envelopeState = 'returning';
    
    // reset envelope position below viewport with closed image
    env.src = 'images/envelope-closed.gif';
    env.classList.add('hidden-envelope');
    
    // force reflow to ensure transition applies
    env.offsetHeight;
    
    // animate upward into view
    env.classList.remove('hidden-envelope');
    
    // after animation completes (400ms)
    setTimeout(() => {
        // restart idle animation
        env.classList.add('idle');
        envelopeState = 'idle';
    }, 400);
}

function openEnvelope() {
    // allow duplicates: draw from all available cards
    const shuffled = shuffleArray([...allAvailableCards]);
    const picked = shuffled.slice(0, 3);
    showPackOverlay(picked);
}

function renderCollectionToDom() {
    Object.entries(collection).forEach(([group, groupMap]) => {
        Object.keys(groupMap || {}).forEach(numKey => {
            const num = parseInt(numKey, 10);
            const record = groupMap[num];
            if (record && record.quantity > 0) {
                const filename = buildFilename(group, num);
                placeCardInSlot(group, num, filename);
            }
        });
    });
}

function resetCollection() {
    // clear state
    Object.keys(collection).forEach(group => { collection[group] = {}; });
    Object.keys(newAlbumBadges).forEach(group => { delete newAlbumBadges[group]; });
    Object.keys(newSlotBadges).forEach(key => { delete newSlotBadges[key]; });
    localStorage.removeItem('collection');
    localStorage.removeItem(NEW_ALBUM_BADGES_KEY);
    localStorage.removeItem(NEW_SLOT_BADGES_KEY);
    localStorage.removeItem('nextPackTime');

    // clear UI slots
    document.querySelectorAll('.card-slot').forEach(slot => {
        slot.innerHTML = '';
        slot.classList.remove('has-card');
        slot.classList.remove('is-new');
    });

    // close display zone if any card is shown
    closeDisplayZone();

    // reset counters and envelope state
    updateAllCounters();
    applyAllAlbumNewBadges();
    applyAllSlotNewBadges();
    showEnvelopeNow();
    updateEnvelopeState();

    // clear battle zone
    battleController.resetBattle();
}

function saveCollection() {
    try {
        localStorage.setItem('collection', JSON.stringify(collection));
    } catch (e) {
        console.warn('Failed to save collection', e);
    }
}

function loadCollection() {
    try {
        const raw = localStorage.getItem('collection');
        if (!raw) return;
        const data = JSON.parse(raw);
        Object.keys(collection).forEach(group => {
            if (data[group]) {
                collection[group] = data[group];
            }
        });
    } catch (e) {
        console.warn('Failed to load collection', e);
    }
}

