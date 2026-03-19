document.addEventListener('DOMContentLoaded', () => {
    // === 1. Setup & Table Generation ===
    const tableBody = document.getElementById('distance-table-body');
    const mobileTableBody = document.getElementById('mobile-distance-table-body'); // NEW
    const distances = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

    // Core inputs that exist in the static HTML
    const inputs = [
        'header-notes', 'shooter-name', 'date', 'time', 'caliber', 'zero', 'barrel', 'bullet', 'load', 'powder',
        'primer', 'col', 'rings', 'velocity', 'g1', 'weather', 'targetSize', 'groupSize', 'elevation', 'hold-data', 'final-dope',
        'rifle-notes', 'wind-notes', 'scope-notes', 'shooting-angle', 'direction-notes', 'lrf-notes', 'compass-range',
        'shooting-angle-2', 'compass-range-2', 'shooting-angle-3', 'compass-range-3'
    ];

    // Generate Distance Table Rows and collect their Input IDs
    distances.forEach(dist => {
        const clicksId = `clicks-${dist}`;
        const udlrId = `udlr-${dist}`;
        const distInputId = `dist-${dist}`;

        // Register these for syncing/saving
        inputs.push(clicksId, udlrId, distInputId);

        // 1. Original Table Row
        if (tableBody) {
            const row = document.createElement('div');
            row.className = 'grid grid-cols-4 border-b border-black flex-1 items-center text-center';
            row.innerHTML = `
                <div class="border-r border-black h-full flex items-center justify-center font-handwriting text-blue-800">
                    <span id="display-${clicksId}"></span>
                </div>
                <div class="col-span-2 border-r border-black h-full flex items-center justify-center bg-gray-50/30">
                    <span id="display-${distInputId}" class="text-sm font-bold">${dist}</span>
                </div>
                <div class="h-full flex items-center justify-center font-handwriting text-blue-800">
                    <span id="display-${udlrId}"></span>
                </div>
            `;
            tableBody.appendChild(row);
        }

        // 2. NEW: Mobile Table Row
        if (mobileTableBody) {
            const row = document.createElement('div');
            row.className = 'grid grid-cols-4 border-b border-black flex items-center text-center border-l-0 border-r-0'; // Mobile styling adjustments
            row.innerHTML = `
                <div class="border-r border-black h-full py-1 flex items-center justify-center font-handwriting text-blue-800">
                    <span id="mobile-display-${clicksId}"></span>
                </div>
                <div class="col-span-2 border-r border-black h-full py-1 flex items-center justify-center bg-gray-50/30">
                    <span id="mobile-display-${distInputId}" class="text-[10px] font-bold">${dist}</span>
                </div>
                <div class="h-full py-1 flex items-center justify-center font-handwriting text-blue-800">
                    <span id="mobile-display-${udlrId}"></span>
                </div>
            `;
            mobileTableBody.appendChild(row);
        }
    });

    // === 2. Data Syncing (Input -> Card) ===
    inputs.forEach(id => {
        const input = document.getElementById(id);
        const display = document.getElementById(`display-${id}`);
        const mobileDisplay = document.getElementById(`mobile-display-${id}`); // NEW

        if (input) {
            input.addEventListener('input', (e) => {
                if (display) display.textContent = e.target.value;
                if (mobileDisplay) mobileDisplay.textContent = e.target.value; // Sync to mobile field
            });
            // Initial sync
            if (display) display.textContent = input.value;
            if (mobileDisplay) mobileDisplay.textContent = input.value;
        }
    });

    // Special handling for date formatting
    const dateInput = document.getElementById('date');
    if (dateInput && !dateInput.value) {
        dateInput.valueAsDate = new Date();
        const displayDate = document.getElementById('display-date');
        const mobileDisplayDate = document.getElementById('mobile-display-date');
        const val = dateInput.value;
        if (displayDate) displayDate.textContent = val;
        if (mobileDisplayDate) mobileDisplayDate.textContent = val;
    }

    // === 3. Canvas Logic (Shots & Holds) ===
    // Unified target canvas initialization with mirroring
    function initTargetCanvases(desktopId, mobileId, type, clearBtnId) {
        const dCanvas = document.getElementById(desktopId);
        const mCanvas = document.getElementById(mobileId);
        if (!dCanvas || !mCanvas) return;

        const dCtx = dCanvas.getContext('2d');
        const mCtx = mCanvas.getContext('2d');
        let shots = [];

        function drawAll() {
            [dCanvas, mCanvas].forEach(canvas => {
                const ctx = canvas.getContext('2d');
                const { width, height } = canvas;
                const centerX = width / 2;
                const centerY = height / 2;

                ctx.clearRect(0, 0, width, height);
                ctx.strokeStyle = '#9ca3af';
                ctx.lineWidth = 1;

                [0.2, 0.4, 0.6, 0.8].forEach(scale => {
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, (width / 2) * scale, 0, Math.PI * 2);
                    ctx.stroke();
                });

                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(centerX, 0); ctx.lineTo(centerX, height);
                ctx.moveTo(0, centerY); ctx.lineTo(width, centerY);
                ctx.stroke();

                ctx.fillStyle = '#000';
                for (let i = 1; i < 5; i++) {
                    const offset = (width / 2) * (i * 0.2);
                    ctx.beginPath(); ctx.arc(centerX + offset, centerY, 2, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(centerX - offset, centerY, 2, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(centerX, centerY + offset, 2, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(centerX, centerY - offset, 2, 0, Math.PI * 2); ctx.fill();
                }

                if (type === 'shot') {
                    ctx.fillStyle = '#22c55e';
                    ctx.beginPath(); ctx.arc(centerX, centerY, 4, 0, Math.PI * 2); ctx.fill();
                }

                shots.forEach(shot => {
                    ctx.fillStyle = '#ef4444';
                    // Plot normalized to the specific canvas size
                    ctx.beginPath();
                    ctx.arc(shot.nx * width, shot.ny * height, 3, 0, Math.PI * 2);
                    ctx.fill();
                });
            });
        }

        const handlePointer = (e) => {
            // Prevent phantom dots: Only trigger on actual click/tap, not scroll/touch
            const rect = e.currentTarget.getBoundingClientRect();
            const nx = (e.clientX - rect.left) / rect.width;
            const ny = (e.clientY - rect.top) / rect.height;

            if (e.button === 2) shots.pop(); else shots.push({ nx, ny });
            drawAll();
        };

        [dCanvas, mCanvas].forEach(canvas => {
            // Use 'click' instead of 'pointerdown' for better mobile stability
            canvas.addEventListener('click', handlePointer);
            canvas.addEventListener('contextmenu', e => e.preventDefault());
        });

        if (clearBtnId) {
            const clearBtn = document.getElementById(clearBtnId);
            if (clearBtn) clearBtn.addEventListener('click', () => { shots = []; drawAll(); });
        }
        drawAll();
    }

    initTargetCanvases('canvas-hold', 'mobile-canvas-hold', 'hold', 'clear-hold-btn');
    initTargetCanvases('canvas-shot', 'mobile-canvas-shot', 'shot', 'clear-shot-btn');

    // === 4. Profile Management & Library ===
    const profileSelect = document.getElementById('profileSelect');
    const saveProfileBtn = document.getElementById('saveProfileBtnManual');
    const deleteProfileBtn = document.getElementById('deleteProfileBtn');
    const clearFormBtn = document.getElementById('clearFormBtn');
    const libraryModal = document.getElementById('libraryModal');
    const libraryList = document.getElementById('libraryList');
    const openLibraryBtn = document.getElementById('openLibraryBtn');
    const closeLibraryBtn = document.getElementById('closeLibraryBtn');

    if (clearFormBtn) {
        clearFormBtn.onclick = () => {
            if (confirm("Clear all tactical data and start fresh? This cannot be undone.")) {
                // Reset text inputs
                inputs.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        // Keep the default distance values
                        if (id.startsWith('dist-')) {
                            // do nothing to the distance labels themselves (100, 200, etc)
                        } else {
                            el.value = '';
                            el.dispatchEvent(new Event('input'));
                        }
                    }
                });

                // Reset specific defaults
                if (dateInput) {
                    dateInput.valueAsDate = new Date();
                    dateInput.dispatchEvent(new Event('input'));
                }

                // Clear Canvases by triggering clicks on existing clear buttons
                ['clear-hold-btn', 'clear-shot-btn', 'clear-pencil'].forEach(id => {
                    const btn = document.getElementById(id);
                    if (btn) btn.click();
                });

                // Reset Calculator
                if (window.clearCalc) window.clearCalc();

                // Clear Compass lines (manually trigger redraw)
                if (window.drawCompassVector) window.drawCompassVector();

                alert("Tactical data cleared.");
            }
        };
    }

    function getProfiles() { return JSON.parse(localStorage.getItem('rangeCardProfiles') || '{}'); }

    function updateProfileList() {
        const ps = getProfiles();
        // Update hidden select
        profileSelect.innerHTML = '<option value="">Select a profile...</option>';
        // Update Library List
        if (libraryList) libraryList.innerHTML = '';

        Object.keys(ps).sort().reverse().forEach(name => {
            // Dropdown
            const opt = document.createElement('option');
            opt.value = name; opt.textContent = name;
            profileSelect.appendChild(opt);

            // Library Item
            if (libraryList) {
                const item = document.createElement('div');
                item.className = "p-4 bg-gray-800/30 hover:bg-neon-green/10 rounded-lg border border-gray-800 hover:border-neon-green/40 cursor-pointer transition-all group";
                item.innerHTML = `
                    <div class="flex items-center justify-between gap-3">
                        <div class="min-w-0">
                            <div class="font-bold text-sm text-gray-200 truncate pr-4 group-hover:text-white">${name}</div>
                            <div class="text-[9px] text-gray-400 font-mono uppercase mt-1">
                                ${ps[name].caliber || 'No Caliber'} • ${ps[name].date || '--'}
                            </div>
                        </div>
                        <i data-lucide="chevron-right" class="w-4 h-4 text-gray-700 group-hover:text-neon-green"></i>
                    </div>
                `;
                item.onclick = () => previewProfile(name);
                libraryList.appendChild(item);
            }
        });
        if (window.lucide) lucide.createIcons();
    }

    function previewProfile(name) {
        const ps = getProfiles();
        const data = ps[name];
        if (!data) return;

        const emptyState = document.getElementById('noSelection');
        if (emptyState) emptyState.classList.add('hidden');

        document.getElementById('profilePreview').classList.remove('hidden');
        document.getElementById('previewName').textContent = name;
        document.getElementById('previewCaliber').textContent = `${data.caliber || '---'} • ${data.bullet || '---'}`;
        document.getElementById('prevDate').textContent = data.date || '--';

        // Populate Snapshot
        const img = document.getElementById('prevImage');
        const noImg = document.getElementById('noImageMsg');
        if (data.snapshot) {
            img.src = data.snapshot;
            img.classList.remove('hidden');
            noImg.classList.add('hidden');
        } else {
            img.src = "";
            img.classList.add('hidden');
            noImg.classList.remove('hidden');
        }

        // Expanded Data Fields
        document.getElementById('prevVel').textContent = data.velocity || '--';
        document.getElementById('prevZero').textContent = data.zero || '--';
        document.getElementById('prevBarrel').textContent = data.barrel || '--';
        document.getElementById('prevPowder').textContent = data.powder || '--';
        document.getElementById('prevLoad').textContent = data.load || '--';
        document.getElementById('prevCOL').textContent = data.col || '--';
        document.getElementById('prevRings').textContent = data.rings || '--';
        document.getElementById('prevG1').textContent = data.g1 || '--';
        document.getElementById('prevHeaderNotes').textContent = data['header-notes'] || '--';
        document.getElementById('prevShooter').textContent = data['shooter-name'] || '--';
        document.getElementById('prevTime').textContent = data.time || '--';
        document.getElementById('prevElev').textContent = data.elevation || '--';
        document.getElementById('prevHold').textContent = data['hold-data'] || '--';
        document.getElementById('prevFinal').textContent = data['final-dope'] || '--';
        document.getElementById('prevWeather').textContent = data.weather || '--';
        document.getElementById('prevRifleNotes').textContent = data['rifle-notes'] || '--';

        // Distance Table (100-500)
        const dTable = document.getElementById('prevDistanceTable');
        if (dTable) {
            dTable.innerHTML = '';
            [100, 200, 300, 400, 500].forEach(d => {
                const clicks = data[`clicks-${d}`] || '--';
                const udlr = data[`udlr-${d}`] || '--';
                const row = document.createElement('div');
                row.className = "p-2 bg-black/40 border border-gray-800 rounded flex flex-col items-center";
                row.innerHTML = `<span class="text-[8px] text-gray-400">${d}Y</span><span class="text-xs text-blue-400 font-bold">${clicks}</span><span class="text-[8px] text-gray-600">${udlr}</span>`;
                dTable.appendChild(row);
            });
        }

        // Toggle View Logic
        const viewDataBtn = document.getElementById('viewDataBtn');
        const viewImageBtn = document.getElementById('viewImageBtn');
        const dataView = document.getElementById('dataPreview');
        const imgView = document.getElementById('snapshotPreview');

        const activeClass = "bg-neon-green text-black";
        const inactiveClass = "text-gray-400 hover:text-white";

        viewDataBtn.onclick = () => {
            dataView.classList.remove('hidden');
            imgView.classList.add('hidden');
            viewDataBtn.className = `px-4 py-1.5 text-[10px] font-bold uppercase rounded transition-all ${activeClass}`;
            viewImageBtn.className = `px-4 py-1.5 text-[10px] font-bold uppercase rounded transition-all ${inactiveClass}`;
        };

        viewImageBtn.onclick = () => {
            dataView.classList.add('hidden');
            imgView.classList.remove('hidden');
            viewImageBtn.className = `px-4 py-1.5 text-[10px] font-bold uppercase rounded transition-all ${activeClass}`;
            viewDataBtn.className = `px-4 py-1.5 text-[10px] font-bold uppercase rounded transition-all ${inactiveClass}`;
        };

        // Default to Image (Visual) view as requested
        viewImageBtn.click();

        // Actions
        document.getElementById('loadSelectedBtn').onclick = () => {
            loadProfile(name);
            closeLibrary();
        };
        document.getElementById('deleteSelectedBtn').onclick = () => {
            if (confirm(`Trash record "${name}"?`)) {
                const ps_new = getProfiles();
                delete ps_new[name];
                localStorage.setItem('rangeCardProfiles', JSON.stringify(ps_new));
                updateProfileList();
                resetPreview();
            }
        };
    }

    function resetPreview() {
        document.getElementById('profilePreview').classList.add('hidden');
        const emptyState = document.getElementById('noSelection');
        if (emptyState) emptyState.classList.remove('hidden');
    }

    function loadProfile(name) {
        const ps = getProfiles();
        const data = ps[name];
        if (!data) return;
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.value = data[id] || '';
                el.dispatchEvent(new Event('input'));
            }
        });
        profileSelect.value = name;
    }

    function openLibrary() {
        libraryModal.classList.remove('hidden');
        updateProfileList();
        resetPreview();
    }
    function closeLibrary() { libraryModal.classList.add('hidden'); }

    openLibraryBtn.onclick = openLibrary;
    closeLibraryBtn.onclick = closeLibrary;

    saveProfileBtn.onclick = () => {
        const name = prompt("Enter profile name to save tactical record:");
        if (!name) return;

        const container = document.getElementById('card-container');
        const previewPanel = document.getElementById('previewPanel');

        // Save current states to restore later
        const isVisuallyHidden = previewPanel.classList.contains('opacity-0');
        const originalTransform = container.style.transform;
        const originalScrollY = window.scrollY;

        // PRE-CAPTURE NORMALIZATION
        // 1. Show panel if hidden
        if (isVisuallyHidden) {
            previewPanel.classList.remove('opacity-0', 'pointer-events-none', 'absolute');
            previewPanel.classList.add('flex');
        }
        // 2. Reset scaling transform to capture at full resolution
        container.style.transform = 'none';
        // 3. Scroll to top to ensure coordinate sync
        window.scrollTo(0, 0);

        // EXTRA SAFETY: Disable transitions temporarily to avoid animation interference with html2canvas
        const originalTransition = previewPanel.style.transition;
        previewPanel.style.transition = 'none';

        // INDUSTRIAL FIX: Force fixed capture context
        document.body.classList.add('is-capturing');

        // DELAY for layout reflow and animation suppression
        setTimeout(() => {
            html2canvas(container, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                logging: true,
                scrollX: 0,
                scrollY: 0,
                windowWidth: 1000,
                windowHeight: 750
            }).then(canvas => {
                // Restore context
                document.body.classList.remove('is-capturing');
                previewPanel.style.transition = originalTransition;

                // POST-CAPTURE RESTORATION
                if (isVisuallyHidden) {
                    previewPanel.classList.add('opacity-0', 'pointer-events-none', 'absolute');
                    previewPanel.classList.remove('flex');
                }
                container.style.transform = originalTransform;
                window.scrollTo(0, originalScrollY);

                const snapshot = canvas.toDataURL("image/png");
                const data = { snapshot };

                inputs.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) data[id] = el.value;
                });

                const ps = getProfiles();
                ps[name] = data;
                localStorage.setItem('rangeCardProfiles', JSON.stringify(ps));

                openLibrary();
                previewProfile(name);
            }).catch(err => {
                document.body.classList.remove('is-capturing');
                previewPanel.style.transition = originalTransition;
                if (isVisuallyHidden) {
                    previewPanel.classList.add('opacity-0', 'pointer-events-none', 'absolute');
                    previewPanel.classList.remove('flex');
                }
                container.style.transform = originalTransform;
                window.scrollTo(0, originalScrollY);
                console.error("Capture failure:", err);
                alert("Record save failed. Please check log.");
            });
        }, 500); // Increased to 500ms for absolute stability
    };

    updateProfileList();
    // === 5. Compass Vector Visualization ===
    const compassCanvas = document.getElementById('compass-vector');
    const mobileCompassCanvas = document.getElementById('mobile-compass-vector'); // NEW

    const targetConfigs = [
        { angleId: 'shooting-angle', rangeId: 'compass-range' },
        { angleId: 'shooting-angle-2', rangeId: 'compass-range-2' },
        { angleId: 'shooting-angle-3', rangeId: 'compass-range-3' }
    ];

    window.drawCompassVector = function () {
        [compassCanvas, mobileCompassCanvas].forEach(canvas => {
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const { width, height } = canvas;
            const centerX = width / 2, centerY = height / 2;
            ctx.clearRect(0, 0, width, height);

            const maxRadius = (Math.min(width, height) / 2) - 15;

            targetConfigs.forEach((config, index) => {
                const ai = document.getElementById(config.angleId);
                const ri = document.getElementById(config.rangeId);
                if (!ai || !ri) return;

                // Parse Angle
                let ang = parseFloat(ai.value);
                if (isNaN(ang)) {
                    const m = ai.value.match(/\d+/);
                    if (m) ang = parseFloat(m[0]);
                }
                if (isNaN(ang)) return;

                // Parse Range for Scaling (0 - 1000 yds)
                let rangeVal = 0;
                const rangeMatch = ri.value.match(/\d+/);
                if (rangeMatch) rangeVal = parseFloat(rangeMatch[0]);

                // Calculate Radius based on range (Min 15% for visibility, Max 100%)
                const scaleFactor = Math.min(Math.max(rangeVal / 1000, 0.15), 1.0);
                const currentRadius = maxRadius * scaleFactor;

                const rads = (ang - 90) * (Math.PI / 180);
                const ex = centerX + currentRadius * Math.cos(rads);
                const ey = centerY + currentRadius * Math.sin(rads);

                // Draw Dotted Line
                ctx.beginPath();
                ctx.setLineDash([4, 4]);
                ctx.strokeStyle = '#888';
                ctx.lineWidth = 1;
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(ex, ey);
                ctx.stroke();
                ctx.setLineDash([]);

                // Draw X Marker
                const xs = 5;
                ctx.lineWidth = 2.5;
                ctx.strokeStyle = '#000';
                ctx.beginPath();
                ctx.moveTo(ex - xs, ey - xs); ctx.lineTo(ex + xs, ey + xs);
                ctx.moveTo(ex + xs, ey - xs); ctx.lineTo(ex - xs, ey + xs);
                ctx.stroke();

                // Draw Label
                const txt = ri.value;
                if (txt) {
                    ctx.font = 'bold 8px Inter, sans-serif';
                    ctx.textBaseline = 'middle';

                    // User Request: Alternate sides (T1 left, T2 right, T3 left)
                    let textAlign = (index === 1) ? 'left' : 'right';
                    let labelX = (index === 1) ? ex + 10 : ex - 10;
                    let labelY = ey;

                    // Small vertical stagger to prevent overlap if angles are identical
                    if (index === 0) labelY -= 8;
                    if (index === 2) labelY += 8;

                    // Measure text to draw a small background for legibility
                    const metrics = ctx.measureText(txt);
                    const padding = 2;
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';

                    let bgX = labelX;
                    if (textAlign === 'right') bgX -= metrics.width;
                    if (textAlign === 'center') bgX -= metrics.width / 2;

                    ctx.fillRect(bgX - padding, labelY - 5, metrics.width + (padding * 2), 10);

                    // Draw the text
                    ctx.textAlign = textAlign;
                    ctx.fillStyle = '#1e3a8a';
                    ctx.fillText(txt, labelX, labelY);
                }
            });
        });
    }

    targetConfigs.forEach(c => {
        [c.angleId, c.rangeId].forEach(id => {
            const el = document.getElementById(id);
            if (el) ['input', 'change', 'blur'].forEach(ev => el.addEventListener(ev, window.drawCompassVector));
        });
    });
    setTimeout(window.drawCompassVector, 500);

    // === 6. Pencil Tool ===
    const canvases = [
        document.getElementById('pencil-canvas'),
        document.getElementById('mobile-pencil-canvas')
    ].filter(canvas => canvas !== null);

    const pencilToggle = document.getElementById('pencil-toggle');

    if (canvases.length > 0 && pencilToggle) {
        const contexts = canvases.map(c => c.getContext('2d'));
        let drawing = false;

        pencilToggle.addEventListener('change', (e) => {
            canvases.forEach(canvas => {
                canvas.classList.toggle('pointer-events-none', !e.target.checked);
                canvas.style.cursor = e.target.checked ? 'crosshair' : 'default';
            });
        });

        const getNormalizedPos = (e, canvas) => {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                nx: (clientX - rect.left) / rect.width,
                ny: (clientY - rect.top) / rect.height
            };
        };

        const start = (e) => {
            if (!pencilToggle.checked) return;
            // Prevent default to stop scrolling IF drawing
            if (e.type === 'touchstart' && e.cancelable) e.preventDefault();

            drawing = true;
            // SYNC: Get normalized position from the surface being touched
            const { nx, ny } = getNormalizedPos(e, e.currentTarget);

            canvases.forEach((canvas, idx) => {
                const pCtx = contexts[idx];
                pCtx.beginPath();
                pCtx.lineWidth = 1.5;
                pCtx.lineCap = 'round';
                pCtx.strokeStyle = '#6b7280';

                // Scale normalized pos to THIS canvas's dimensions
                pCtx.moveTo(nx * canvas.width, ny * canvas.height);
            });
        };

        const move = (e) => {
            if (!drawing) return;
            if (e.type === 'touchmove' && e.cancelable) e.preventDefault();

            const { nx, ny } = getNormalizedPos(e, e.currentTarget);

            // SYNC: Draw on ALL canvases
            canvases.forEach((canvas, idx) => {
                const pCtx = contexts[idx];
                pCtx.lineTo(nx * canvas.width, ny * canvas.height);
                pCtx.stroke();
            });
        };

        const stop = () => {
            if (!drawing) return;
            // SYNC: Finish path on all canvases
            contexts.forEach(ctx => ctx.closePath());
            drawing = false;
        };

        canvases.forEach(canvas => {
            ['mousedown', 'touchstart'].forEach(ev => canvas.addEventListener(ev, start, { passive: false }));
            ['mousemove', 'touchmove'].forEach(ev => canvas.addEventListener(ev, move, { passive: false }));
            ['mouseup', 'mouseleave', 'touchend'].forEach(ev => canvas.addEventListener(ev, stop, { passive: false }));
        });

        document.getElementById('clear-pencil').addEventListener('click', () => {
            if (confirm('Clear all drawings?')) {
                contexts.forEach((pCtx, i) => {
                    pCtx.clearRect(0, 0, canvases[i].width, canvases[i].height);
                });
            }
        });
    }

    // === 7. Download ===
    document.getElementById('downloadBtn').addEventListener('click', () => {
        const container = document.getElementById('card-container');
        const previewPanel = document.getElementById('previewPanel');

        const originalTransform = container.style.transform;
        const originalScrollY = window.scrollY;
        const isVisuallyHidden = previewPanel.classList.contains('opacity-0');

        // PRE-CAPTURE NORMALIZATION
        if (isVisuallyHidden) {
            previewPanel.classList.remove('opacity-0', 'pointer-events-none', 'absolute');
            previewPanel.classList.add('flex');
        }

        const originalTransition = previewPanel.style.transition;
        previewPanel.style.transition = 'none';

        // INDUSTRIAL FIX: Force fixed capture context
        document.body.classList.add('is-capturing');

        window.scrollTo(0, 0);

       /* setTimeout(() => {
            html2canvas(container, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                scrollX: 0,
                scrollY: 0,
                windowWidth: 1000,
                windowHeight: 750
            })*/setTimeout(() => {
            // FIX: Force Lucide icons to draw before the "camera" clicks
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            // NEW CODE STARTS HERE
            html2canvas(container, {
                scale: 3,             // Higher resolution for clearer text
                backgroundColor: '#ffffff',
                useCORS: true,        // Critical for CDN icons
                allowTaint: false,    // Security handshake
                logging: true,        // Prints errors to F12 Console
                scrollX: 0,
                scrollY: 0,
                windowWidth: 1000,
                windowHeight: 750,
                onclone: (clonedDoc) => {
                    // This forces the "X" and "Pencil" to be visible in the capture
                    const icons = clonedDoc.querySelectorAll('[data-lucide]');
                    icons.forEach(icon => icon.style.visibility = 'visible');
                }
            }).then(canvas => {
                // Restore context
                document.body.classList.remove('is-capturing');
                previewPanel.style.transition = originalTransition;

                // Restore view
                if (isVisuallyHidden) {
                    previewPanel.classList.add('opacity-0', 'pointer-events-none', 'absolute');
                    previewPanel.classList.remove('flex');
                }
                container.style.transform = originalTransform;
                window.scrollTo(0, originalScrollY);

                const link = document.createElement('a');
                link.download = `RangeCard-${document.getElementById('date').value || 'export'}.png`;
                link.href = canvas.toDataURL("image/png");

                // For mobile/WebView compatibility
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }).catch(err => {
                document.body.classList.remove('is-capturing');
                previewPanel.style.transition = originalTransition;
                if (isVisuallyHidden) {
                    previewPanel.classList.add('opacity-0', 'pointer-events-none', 'absolute');
                    previewPanel.classList.remove('flex');
                }
                container.style.transform = originalTransform;
                window.scrollTo(0, originalScrollY);
                console.error("Download capture failure:", err);
                alert("Download failed. See console.");
            });
        }, 500);
    });

    // === 8. Mobile Responsiveness & View Toggle ===
    const mobileViewToggle = document.getElementById('mobileViewToggle');
    // mainLayout and previewPanel are already declared above
    const toggleIcon = document.getElementById('toggleIcon');
    const aside = document.querySelector('aside');

    if (mobileViewToggle) {
        mobileViewToggle.onclick = () => {
            const isShowingPreview = previewPanel.classList.contains('active');
            if (isShowingPreview) {
                // Switch to Inputs
                previewPanel.classList.remove('active');
                aside.classList.remove('hidden');
                toggleIcon.setAttribute('data-lucide', 'eye');
                mobileViewToggle.classList.replace('bg-gray-800', 'bg-neon-green');
                mobileViewToggle.classList.replace('text-neon-green', 'text-black');
            } else {
                // Switch to Preview
                previewPanel.classList.add('active');
                aside.classList.add('hidden');
                toggleIcon.setAttribute('data-lucide', 'settings');
                mobileViewToggle.classList.replace('bg-neon-green', 'bg-gray-800');
                mobileViewToggle.classList.replace('text-black', 'text-neon-green');
            }
            if (window.lucide) lucide.createIcons();
            handleResponsiveScaling();
        };
    }

    // === TACTICAL FLAVOR COLOR CYCLING ===
    const colorCycleBtn = document.getElementById('colorCycleBtn');
    const flavors = [
        { name: "Neon Green", hex: "#22c55e", rgb: "34, 197, 94" },
        { name: "Tactical Amber", hex: "#f59e0b", rgb: "245, 158, 11" },
        { name: "Cyber Cyan", hex: "#06b6d4", rgb: "6, 182, 212" },
        { name: "Combat Red", hex: "#ef4444", rgb: "239, 68, 68" },
        { name: "Phantom Violet", hex: "#8b5cf6", rgb: "139, 92, 246" },
        { name: "Marine Blue", hex: "#3b82f6", rgb: "59, 130, 246" },
        { name: "Stealth Gray", hex: "#94a3b8", rgb: "148, 163, 184" },
        { name: "Desert Sand", hex: "#d97706", rgb: "217, 119, 6" },
        { name: "Plasma Pink", hex: "#ec4899", rgb: "236, 72, 153" },
        { name: "Nuclear Lime", hex: "#84cc16", rgb: "132, 204, 22" }
    ];

    function applyFlavor(index) {
        const flavor = flavors[index];
        document.documentElement.style.setProperty('--accent-color', flavor.hex);
        document.documentElement.style.setProperty('--accent-rgb', flavor.rgb);

        // Remove previous flavor classes
        flavors.forEach(f => {
            const classToRemove = `flavor-${f.name.toLowerCase().replace(/\s/g, '-')}`;
            document.body.classList.remove(classToRemove);
        });

        // Add current flavor class
        document.body.classList.add(`flavor-${flavor.name.toLowerCase().replace(/\s/g, '-')}`);

        if (colorCycleBtn) {
            colorCycleBtn.innerHTML = `<i data-lucide="palette" class="w-4 h-4"></i> Flavor: ${flavor.name}`;
            if (window.lucide) lucide.createIcons();
        }

        localStorage.setItem('tacticalFlavorIndex', index);
        // console.log(`Applied tactical flavor: ${flavor.name}`);
    }

    if (colorCycleBtn) {
        let currentFlavorIndex = parseInt(localStorage.getItem('tacticalFlavorIndex')) || 0;

        // Initial apply
        applyFlavor(currentFlavorIndex);

        colorCycleBtn.onclick = () => {
            currentFlavorIndex = (currentFlavorIndex + 1) % flavors.length;
            applyFlavor(currentFlavorIndex);
        };
    } else {
        // Fallback for startup if button isn't found immediately
        const savedIndex = parseInt(localStorage.getItem('tacticalFlavorIndex')) || 0;
        applyFlavor(savedIndex);
    }

    // === UNIVERSAL AUTO-SAVE SYSTEM ===
    function autoSaveAll() {
        const formData = {};
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.id) {
                formData[input.id] = input.value;
            }
        });
        localStorage.setItem('rangeCardAutoSave', JSON.stringify(formData));
        // console.log("Auto-save completed.");
    }

    function autoLoadAll() {
        const savedData = localStorage.getItem('rangeCardAutoSave');
        if (savedData) {
            try {
                const formData = JSON.parse(savedData);
                Object.keys(formData).forEach(id => {
                    const input = document.getElementById(id);
                    if (input) {
                        input.value = formData[id];
                        input.dispatchEvent(new Event('input'));
                    }
                });
                // console.log("Auto-load completed.");
            } catch (e) {
                console.error("Error loading auto-save data", e);
            }
        }
    }

    // Attach listeners to all inputs
    document.addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
            autoSaveAll();
        }
    });

    // Run load on startup
    window.addEventListener('load', () => {
        autoLoadAll();
        setTimeout(handleResponsiveScaling, 300);
    });

    // === RESPONSIVE SCALING ===
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            // console.log("Resize detected, recalibrating layout...");
            handleResponsiveScaling();
        }, 250);
    });

    function handleResponsiveScaling() {
        const wrapper = document.getElementById('card-scale-wrapper');
        const container = document.getElementById('card-container');
        if (!wrapper || !container) return;

        const targetWidth = 1000;
        const availableWidth = wrapper.offsetWidth - 32;
        let scale = availableWidth / targetWidth;

        container.style.transform = `scale(${scale})`;
        container.style.transformOrigin = 'top left';

        // Adjust wrapper height to accommodate scaled content
        wrapper.style.height = (targetWidth * 0.75 * scale) + 'px';
    }

    // Initial call
    handleResponsiveScaling();
});

function toggleSection(id) { document.getElementById(id).classList.toggle('hidden'); }
window.appendCalc = function (v) {
    const d = document.getElementById('calc-display');
    d.value = (d.value === '0' && v !== '.') ? v : d.value + v;
};
window.clearCalc = function () { document.getElementById('calc-display').value = '0'; };
window.executeCalc = function () {
    const d = document.getElementById('calc-display');
    try { d.value = eval(d.value.replace(/[^-0-9+*/.]/g, '')); } catch { d.value = 'Error'; setTimeout(clearCalc, 1000); }
};
window.calcCos = function () {
    const d = document.getElementById('calc-display');
    try { const v = parseFloat(d.value); if (!isNaN(v)) d.value = Math.cos(v * Math.PI / 180).toFixed(4); } catch { d.value = 'Error'; setTimeout(clearCalc, 1000); }
};
