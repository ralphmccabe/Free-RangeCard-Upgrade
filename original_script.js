document.addEventListener('DOMContentLoaded', () => {
    // === 0. Global Security & Layout Protection ===
    // Enforce a 25-character limit on ALL text boxes to prevent layout breakage
    document.querySelectorAll('input[type="text"]').forEach(el => {
        el.setAttribute('maxlength', '25');
    });

    // === 1. Setup & Table Generation ===
    const tableBody = document.getElementById('distance-table-body');
    const mobileTableBody = document.getElementById('mobile-distance-table-body'); // NEW
    const distances = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

    // Core inputs that exist in the static HTML
    const inputs = [
        'header-notes', 'shooter-name', 'date', 'time', 'caliber', 'zero', 'barrel', 'bullet', 'load', 'powder',
        'primer', 'col', 'rings', 'velocity', 'g1', 'weather', 'targetSize', 'groupSize', 'elevation', 'hold-data', 'final-dope',
        'rifle-notes', 'wind-notes', 'scope-notes', 'shooting-angle', 'direction-notes', 'lrf-notes', 'compass-range',
        'compass-range-2', 'box-count-input'
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
    function calculateGroupMetrics(points) {
        if (points.length < 5) return null;
        let minSpread = Infinity;
        let bestSubset = [];
        const n = points.length;

        // Combinations generator of size 5
        for (let i = 0; i < (1 << n); i++) {
            let subset = [];
            for (let j = 0; j < n; j++) {
                if ((i & (1 << j)) !== 0) subset.push(points[j]);
            }
            if (subset.length === 5) {
                let maxDist = 0;
                for (let a = 0; a < 5; a++) {
                    for (let b = a + 1; b < 5; b++) {
                        const dx = subset[a].nx - subset[b].nx;
                        const dy = subset[a].ny - subset[b].ny;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        if (dist > maxDist) maxDist = dist;
                    }
                }
                if (maxDist < minSpread) {
                    minSpread = maxDist;
                    bestSubset = subset;
                }
            }
        }
        return { minSpread, bestSubset };
    }

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

                shots.forEach((shot, index) => {
                    const x = shot.nx * width;
                    const y = shot.ny * height;
                    
                    if (index === 0 && type === 'shot') {
                        // COLD BORE SHOT (Shot #1) in Blue
                        ctx.fillStyle = '#3b82f6';
                        ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
                        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();
                    } else {
                        // Standard Shots in Theme Red
                        ctx.fillStyle = '#ef4444';
                        ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
                    }

                    // Number above shot
                    ctx.fillStyle = '#000000';
                    ctx.font = 'bold 8px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(index + 1, x, y - 6);
                });

                // TIGHTEST 5-SHOT GROUP ANALYZER & OVERLAY
                if (type === 'shot' && shots.length >= 5) {
                    const metrics = calculateGroupMetrics(shots);
                    if (metrics) {
                        const moa = (metrics.minSpread * 10).toFixed(2);
                        let gradeText = '🥉 C-CLASS RECRUIT';
                        if (moa < 0.5) gradeText = '👑 S-CLASS SNIPER';
                        else if (moa < 1.0) gradeText = '🥇 A-CLASS EXPERT';
                        else if (moa < 1.5) gradeText = '🥈 B-CLASS MARKSMAN';

                        // Draw best 5-shot subset connect lines (subtle overlay)
                        ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
                        ctx.lineWidth = 1;
                        ctx.setLineDash([2, 2]);
                        ctx.beginPath();
                        metrics.bestSubset.forEach((pt, i) => {
                            const px = pt.nx * width;
                            const py = pt.ny * height;
                            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                        });
                        ctx.closePath();
                        ctx.stroke();
                        ctx.setLineDash([]); // Reset line dash

                        // Update HUD display
                        const moaEl = document.getElementById('best-group-moa');
                        const gradeEl = document.getElementById('shooter-grade');
                        const hudEl = document.getElementById('shot-metrics-hud');
                        if (moaEl) moaEl.textContent = moa;
                        if (gradeEl) {
                            gradeEl.textContent = gradeText;
                        }
                        if (hudEl) hudEl.classList.remove('hidden');
                    }
                } else if (type === 'shot') {
                    const hudEl = document.getElementById('shot-metrics-hud');
                    if (hudEl) hudEl.classList.add('hidden');
                }
            });
        }

        const handlePointer = (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const nx = (e.clientX - rect.left) / rect.width;
            const ny = (e.clientY - rect.top) / rect.height;

            if (e.button === 2) {
                shots.pop();
            } else if (shots.length < 20) {
                shots.push({ nx, ny });
            }
            drawAll();
        };

        [dCanvas, mCanvas].forEach(canvas => {
            canvas.getShots = () => shots;
            canvas.setShots = (newShots) => { shots = newShots; drawAll(); };
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
                ['clear-hold-btn', 'clear-shot-btn', 'clear-pencil', 'clear-grade'].forEach(id => {
                    const btn = document.getElementById(id);
                    if (btn) btn.click();
                });

                // Reset Calculator
                if (window.clearCalc) window.clearCalc();

                // Clear Compass lines (manually trigger redraw)
                if (window.drawCompassVector) window.drawCompassVector();

                // === EXTENDED CLEAR: RECON MAPPER ===
                // Clear Inputs & trigger displays
                const recName = document.getElementById('recon-scenario-name');
                const recRep = document.getElementById('recon-report');
                if (recName) { recName.value = ''; recName.dispatchEvent(new Event('input')); }
                if (recRep) { recRep.value = ''; recRep.dispatchEvent(new Event('input')); }

                // Remove map markers
                document.querySelectorAll('.recon-marker').forEach(m => m.remove());

                // Clear drawing canvases
                ['clear-recon-drawings', 'clear-recon-pencil'].forEach(id => {
                    const b = document.getElementById(id);
                    if (b) b.click();
                });

                // Reset Map background to default grid
                const recBg = document.getElementById('recon-bg-image');
                const recGrid = document.getElementById('recon-default-grid');
                const mobBg = document.getElementById('mobile-recon-bg-image');
                const mobGrid = document.getElementById('mobile-recon-default-grid');
                const recUpload = document.getElementById('map-bg-upload');

                if (recBg) { recBg.src = ''; recBg.classList.add('hidden'); }
                if (recGrid) recGrid.classList.remove('hidden');
                if (mobBg) { mobBg.src = ''; mobBg.classList.add('hidden'); }
                if (mobGrid) mobGrid.classList.remove('hidden');
                if (recUpload) recUpload.value = '';

                alert("Tactical data cleared.");
            }
        };
    }

    window.loadedProfilesCache = {};
    window.currentLibraryFilter = 'all';

    window.getProfiles = function() { return window.loadedProfilesCache || {}; };

    if (window.TRC_IDB) {
        window.TRC_IDB.migrateFromLocalStorage().then(() => {
            return window.TRC_IDB.getAll('rangeCardProfiles');
        }).then(profiles => {
            window.loadedProfilesCache = profiles || {};
            if (window.updateProfileList) window.updateProfileList();
        }).catch(err => {
            console.error("IDB load failed, falling back to localStorage:", err);
            window.loadedProfilesCache = JSON.parse(localStorage.getItem('rangeCardProfiles') || '{}');
            if (window.updateProfileList) window.updateProfileList();
        });
    } else {
        window.loadedProfilesCache = JSON.parse(localStorage.getItem('rangeCardProfiles') || '{}');
    }

    window.updateProfileList = function() {
        const ps = getProfiles();
        // Update hidden select
        profileSelect.innerHTML = '<option value="">Select a profile...</option>';
        // Update Library List
        if (libraryList) libraryList.innerHTML = '';

        let names = Object.keys(ps).sort().reverse();
        if (window.currentLibraryFilter === 'zero') {
            names = names.filter(name => !ps[name].isReconScenario);
        } else if (window.currentLibraryFilter === 'recon') {
            names = names.filter(name => !!ps[name].isReconScenario);
        }
        names.forEach((name, index) => {
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
                        <div class="min-w-0 flex items-center gap-3">
                            <span class="text-[9px] font-mono text-neon-green opacity-40">${names.length - index}.</span>
                            <div class="min-w-0">
                                <div class="font-bold text-sm text-gray-200 truncate pr-4 group-hover:text-white">${name}</div>
                                <div class="text-[9px] text-gray-400 font-mono uppercase mt-1">
                                    ${ps[name].isReconScenario ? '🗺️ RECON SITREP' : (ps[name].caliber || 'No Caliber')} • ${ps[name].isReconScenario ? (ps[name].timestamp ? new Date(ps[name].timestamp).toLocaleDateString() : '--') : (ps[name].date || '--')}
                                </div>
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

    window.previewProfile = function(name) {
        const ps = getProfiles();
        const data = ps[name];
        if (!data) return;

        const emptyState = document.getElementById('noSelection');
        if (emptyState) emptyState.classList.add('hidden');

        document.getElementById('profilePreview').classList.remove('hidden');
        document.getElementById('previewName').textContent = name;
        
        if (data.isReconScenario) {
            document.getElementById('previewCaliber').textContent = `🗺️ RECON SCENARIO SITREP`;
            document.getElementById('prevDate').textContent = data.timestamp ? new Date(data.timestamp).toLocaleDateString() : '--';
        } else {
            document.getElementById('previewCaliber').textContent = `${data.caliber || '---'} • ${data.bullet || '---'}`;
            document.getElementById('prevDate').textContent = data.date || '--';
        }

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

        // Distance Table (100-1000)
        const dTable = document.getElementById('prevDistanceTable');
        if (dTable) {
            dTable.innerHTML = '';
            [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].forEach(d => {
                const clicks = data[`clicks-${d}`] || '--';
                const udlr = data[`udlr-${d}`] || '--';
                const row = document.createElement('div');
                row.className = "p-2 bg-black/60 border border-gray-800 rounded-lg flex flex-col items-center justify-center transition-all hover:border-neon-green/30";
                row.innerHTML = `
                    <span class="text-[7px] text-gray-500 font-bold uppercase tracking-tighter">${d}Y</span>
                    <span class="text-[11px] text-neon-green font-black leading-tight">${clicks}</span>
                    <span class="text-[7px] text-blue-400/70 font-bold uppercase">${udlr}</span>
                `;
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
            window.closeLibrary();
        };
        document.getElementById('deleteSelectedBtn').onclick = () => {
            if (confirm(`Trash record "${name}"?`)) {
                const ps_new = getProfiles();
                delete ps_new[name];
                if (window.TRC_IDB) {
                    window.TRC_IDB.delete('rangeCardProfiles', name).then(() => {
                        updateProfileList();
                        resetPreview();
                    }).catch(err => {
                        console.error("IDB delete failed:", err);
                        updateProfileList();
                        resetPreview();
                    });
                } else {
                    localStorage.setItem('rangeCardProfiles', JSON.stringify(ps_new));
                    updateProfileList();
                    resetPreview();
                }
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

        if (data.isReconScenario) {
            const toggleBtn = document.getElementById('toggleReconMapperBtn');
            const isCurrentlyActive = toggleBtn && toggleBtn.textContent.includes('BACK TO RANGE CARD');
            if (!isCurrentlyActive && toggleBtn) {
                toggleBtn.click();
            }

            const rScenarioInput = document.getElementById('recon-scenario-name');
            const rReportInput = document.getElementById('recon-report');
            
            if (rScenarioInput) {
                rScenarioInput.value = data.name || '';
                rScenarioInput.dispatchEvent(new Event('input'));
            }
            if (rReportInput) {
                rReportInput.value = data.report || '';
                rReportInput.dispatchEvent(new Event('input'));
            }

            const rBgImage = document.getElementById('recon-bg-image');
            const rDefaultGrid = document.getElementById('recon-default-grid');
            const mBgImage = document.getElementById('mobile-recon-bg-image');
            const mDefaultGrid = document.getElementById('mobile-recon-default-grid');

            if (rBgImage) {
                if (data.bgImage) {
                    rBgImage.src = data.bgImage;
                    rBgImage.classList.remove('hidden');
                    if (rDefaultGrid) rDefaultGrid.classList.add('hidden');
                    if (mBgImage) {
                        mBgImage.src = data.bgImage;
                        mBgImage.classList.remove('hidden');
                    }
                    if (mDefaultGrid) mDefaultGrid.classList.add('hidden');
                } else {
                    rBgImage.classList.add('hidden');
                    rBgImage.src = '';
                    if (rDefaultGrid) rDefaultGrid.classList.remove('hidden');
                    if (mBgImage) {
                        mBgImage.classList.add('hidden');
                        mBgImage.src = '';
                    }
                    if (mDefaultGrid) mDefaultGrid.classList.remove('hidden');
                }
            }

            document.querySelectorAll('.recon-marker').forEach(m => m.remove());
            if (data.markers && Array.isArray(data.markers)) {
                data.markers.forEach(m => {
                    if (typeof window.createMarker === 'function') {
                        window.createMarker(m.x, m.y, m.emoji, m.note || '');
                    }
                });
            }

            const rCanvas = document.getElementById('recon-canvas');
            const mCanvas = document.getElementById('mobile-recon-canvas');

            if (rCanvas) {
                const rCtx = rCanvas.getContext('2d');
                const mCtx = mCanvas ? mCanvas.getContext('2d') : null;
                rCtx.clearRect(0, 0, rCanvas.width, rCanvas.height);
                if (mCtx) mCtx.clearRect(0, 0, mCanvas.width, mCanvas.height);
                if (data.drawing) {
                    const img = new Image();
                    img.onload = () => {
                        rCtx.drawImage(img, 0, 0);
                        if (mCtx) mCtx.drawImage(img, 0, 0);
                    };
                    img.src = data.drawing;
                }
            }
            return;
        }

        const toggleBtn = document.getElementById('toggleReconMapperBtn');
        const isCurrentlyActive = toggleBtn && toggleBtn.textContent.includes('BACK TO RANGE CARD');
        if (isCurrentlyActive && toggleBtn) {
            toggleBtn.click();
        }
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.value = data[id] || '';
                el.dispatchEvent(new Event('input'));
            }
        });
        profileSelect.value = name;

        // Restore interactive clicked coordinates and redraw them instantly!
        const canvasShot = document.getElementById('canvas-shot');
        const canvasHold = document.getElementById('canvas-hold');
        if (canvasShot && canvasShot.setShots) canvasShot.setShots(data.shotPoints || []);
        if (canvasHold && canvasHold.setShots) canvasHold.setShots(data.holdPoints || []);

        // Restore pencil and grade drawings onto both desktop and mobile canvases
        ['pencil-canvas', 'mobile-pencil-canvas'].forEach(id => {
            const canvas = document.getElementById(id);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (data.pencilDrawing) {
                    const img = new Image();
                    img.onload = () => ctx.drawImage(img, 0, 0);
                    img.src = data.pencilDrawing;
                }
            }
        });
        ['grade-canvas', 'mobile-grade-canvas'].forEach(id => {
            const canvas = document.getElementById(id);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (data.gradeDrawing) {
                    const img = new Image();
                    img.onload = () => ctx.drawImage(img, 0, 0);
                    img.src = data.gradeDrawing;
                }
            }
        });
    }

    window.openLibrary = function() {
        libraryModal.classList.remove('hidden');
        const modalTitle = document.getElementById('libraryModalTitle');
        if (modalTitle) {
            modalTitle.textContent = 'TACTICAL DATA REPOSITORY';
        }
        window.updateProfileList();
        resetPreview();
    };
    window.closeLibrary = function() { libraryModal.classList.add('hidden'); };

    openLibraryBtn.onclick = () => {
        window.currentLibraryFilter = 'all';
        window.openLibrary();
    };
    closeLibraryBtn.onclick = window.closeLibrary;

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

                const snapshot = canvas.toDataURL("image/jpeg", 0.7);
                const data = { snapshot };

                inputs.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) data[id] = el.value;
                });

                // Read and save interactive canvas coordinates
                const canvasShot = document.getElementById('canvas-shot');
                const canvasHold = document.getElementById('canvas-hold');
                if (canvasShot && canvasShot.getShots) data.shotPoints = canvasShot.getShots();
                if (canvasHold && canvasHold.getShots) data.holdPoints = canvasHold.getShots();

                // Save drawings as data URLs
                const pCanvas = document.getElementById('pencil-canvas');
                const gCanvas = document.getElementById('grade-canvas');
                if (pCanvas) data.pencilDrawing = pCanvas.toDataURL();
                if (gCanvas) data.gradeDrawing = gCanvas.toDataURL();

                const ps = getProfiles();
                ps[name] = data;
                
                const postSave = () => {
                    window.currentLibraryFilter = 'all';
                    window.openLibrary();
                    window.previewProfile(name);
                };

                if (window.TRC_IDB) {
                    window.TRC_IDB.set('rangeCardProfiles', name, data).then(() => {
                        postSave();
                    }).catch(err => {
                        console.error("IDB save failed, falling back to localStorage:", err);
                        localStorage.setItem('rangeCardProfiles', JSON.stringify(ps));
                        postSave();
                    });
                } else {
                    localStorage.setItem('rangeCardProfiles', JSON.stringify(ps));
                    postSave();
                }
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
        { angleId: 'shooting-angle', rangeId: 'compass-range' }
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

                    // Base positioning relative to X marker (index 0 is T1, index 1 is Location/T2)
                    let baseAlign = (index === 1) ? 'left' : 'right';
                    let labelX = (index === 1) ? ex + 10 : ex - 10;
                    let labelY = ey;

                    // Small vertical stagger to prevent overlap if angles are identical
                    if (index === 0) labelY -= 8;

                    // Measure text to draw a small background for legibility
                    const metrics = ctx.measureText(txt);
                    const padding = 2;
                    const bgWidth = metrics.width + (padding * 2);
                    const bgHeight = 10;

                    // Calculate initial background left (X) coordinate based on alignment
                    let bgX = labelX;
                    if (baseAlign === 'right') bgX -= metrics.width;
                    let bgY = labelY - 5;

                    // BULLETPROOF BOUNDARY CLAMPING: Prevent text/background from running off the canvas
                    bgX = Math.max(12, Math.min(bgX, width - bgWidth - 12));
                    bgY = Math.max(12, Math.min(bgY, height - bgHeight - 12));

                    // Draw background rectangle
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
                    ctx.fillRect(bgX, bgY, bgWidth, bgHeight);

                    // Draw the text perfectly aligned inside the clamped background
                    ctx.textAlign = 'left';
                    ctx.fillStyle = '#1e3a8a';
                    ctx.fillText(txt, bgX + padding, bgY + 5);
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
                pCtx.lineWidth = 1.0;
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

    // === 6b. Grade Tool ===
    const gradeCanvases = [
        document.getElementById('grade-canvas'),
        document.getElementById('mobile-grade-canvas')
    ].filter(canvas => canvas !== null);

    const gradeToggle = document.getElementById('grade-toggle');

    if (gradeCanvases.length > 0 && gradeToggle) {
        const gradeContexts = gradeCanvases.map(c => c.getContext('2d'));
        let gradeDrawing = false;

        // Mutual exclusion: Checking Grade Tool unchecks Pencil Tool
        gradeToggle.addEventListener('change', (e) => {
            if (e.target.checked && pencilToggle) {
                pencilToggle.checked = false;
                pencilToggle.dispatchEvent(new Event('change'));
            }
            gradeCanvases.forEach(canvas => {
                canvas.classList.toggle('pointer-events-none', !e.target.checked);
                canvas.style.cursor = e.target.checked ? 'crosshair' : 'default';
            });
        });

        // Mutual exclusion: Checking Pencil Tool unchecks Grade Tool
        if (pencilToggle) {
            pencilToggle.addEventListener('change', (e) => {
                if (e.target.checked && gradeToggle) {
                    gradeToggle.checked = false;
                    gradeToggle.dispatchEvent(new Event('change'));
                }
            });
        }

        const getNormalizedPos = (e, canvas) => {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                nx: (clientX - rect.left) / rect.width,
                ny: (clientY - rect.top) / rect.height
            };
        };

        const startGrade = (e) => {
            if (!gradeToggle.checked) return;
            if (e.type === 'touchstart' && e.cancelable) e.preventDefault();

            gradeDrawing = true;
            const { nx, ny } = getNormalizedPos(e, e.currentTarget);

            gradeCanvases.forEach((canvas, idx) => {
                const gCtx = gradeContexts[idx];
                gCtx.beginPath();
                gCtx.lineWidth = 1.0;
                gCtx.lineCap = 'round';
                gCtx.strokeStyle = '#ef4444'; // Red color

                gCtx.moveTo(nx * canvas.width, ny * canvas.height);
            });
        };

        const moveGrade = (e) => {
            if (!gradeDrawing) return;
            if (e.type === 'touchmove' && e.cancelable) e.preventDefault();

            const { nx, ny } = getNormalizedPos(e, e.currentTarget);

            gradeCanvases.forEach((canvas, idx) => {
                const gCtx = gradeContexts[idx];
                gCtx.lineTo(nx * canvas.width, ny * canvas.height);
                gCtx.stroke();
            });
        };

        const stopGrade = () => {
            if (!gradeDrawing) return;
            gradeContexts.forEach(ctx => ctx.closePath());
            gradeDrawing = false;
        };

        gradeCanvases.forEach(canvas => {
            ['mousedown', 'touchstart'].forEach(ev => canvas.addEventListener(ev, startGrade, { passive: false }));
            ['mousemove', 'touchmove'].forEach(ev => canvas.addEventListener(ev, moveGrade, { passive: false }));
            ['mouseup', 'mouseleave', 'touchend'].forEach(ev => canvas.addEventListener(ev, stopGrade, { passive: false }));
        });

        document.getElementById('clear-grade').addEventListener('click', () => {
            if (confirm('Clear all grade drawings?')) {
                gradeContexts.forEach((gCtx, i) => {
                    gCtx.clearRect(0, 0, gradeCanvases[i].width, gradeCanvases[i].height);
                });
            }
        });
    }

    document.getElementById('downloadBtn').addEventListener('click', () => {
        const isReconActive = !document.getElementById('recon-card-container').classList.contains('hidden');
        
        // Restore workspace to desktop for correct capture
        if (isReconActive && typeof restoreWorkspaceToDesktop === 'function') {
            restoreWorkspaceToDesktop();
        }

        const container = isReconActive ? document.getElementById('recon-card-container') : document.getElementById('card-container');
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

                // Portal back to mobile if active
                if (isReconActive && typeof syncReconPortal === 'function') {
                    syncReconPortal();
                }

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

                // Portal back to mobile if active
                if (isReconActive && typeof syncReconPortal === 'function') {
                    syncReconPortal();
                }

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
        { name: "Nuclear Lime", hex: "#84cc16", rgb: "132, 204, 22" },
        // 10 Tactical Camouflage Flavors added by Antigravity
        { name: "MultiCam OCP", hex: "#8c7d55", rgb: "140, 125, 85" },
        { name: "Woodland M81", hex: "#3f5c35", rgb: "63, 92, 53" },
        { name: "Coyote Brown", hex: "#876445", rgb: "135, 100, 69" },
        { name: "Flat Dark Earth (FDE)", hex: "#bfa16f", rgb: "191, 161, 111" },
        { name: "Olive Drab Green (OD)", hex: "#556b2f", rgb: "85, 107, 47" },
        { name: "Tiger Stripe", hex: "#4a5340", rgb: "74, 83, 64" },
        { name: "Urban Digital", hex: "#5a6268", rgb: "90, 98, 104" },
        { name: "Typhon Charcoal", hex: "#343a40", rgb: "52, 58, 64" },
        { name: "Arctic White", hex: "#e9ecef", rgb: "233, 236, 239" },
        { name: "Navy Seal Gray", hex: "#495057", rgb: "73, 80, 87" },
        // Standard White added for basic users who want no colored borders
        { name: "Standard White", hex: "#ffffff", rgb: "255, 255, 255" }
    ];

    function applyFlavor(index) {
        const flavor = flavors[index];
        document.documentElement.style.setProperty('--accent-color', flavor.hex);
        document.documentElement.style.setProperty('--accent-rgb', flavor.rgb);
        
        // High-contrast tab text coloring for white backgrounds
        const tabTextColor = flavor.hex === "#ffffff" ? "#000000" : "#ffffff";
        document.documentElement.style.setProperty('--tab-text-color', tabTextColor);

        // Remove previous flavor classes
        flavors.forEach(f => {
            const classToRemove = `flavor-${f.name.toLowerCase().replace(/\s/g, '-')}`;
            document.body.classList.remove(classToRemove);
        });

        // Add current flavor class
        document.body.classList.add(`flavor-${flavor.name.toLowerCase().replace(/\s/g, '-')}`);

        if (colorCycleBtn) {
            colorCycleBtn.innerHTML = `<i data-lucide="palette" class="w-4 h-4"></i> Flavor: ${flavor.name}`;
            
            // Dynamic theme styling applied by Antigravity
            colorCycleBtn.style.backgroundColor = `rgba(${flavor.rgb}, 0.2)`;
            colorCycleBtn.style.borderColor = flavor.hex;
            colorCycleBtn.style.color = flavor.hex;
            
            // Interactive hover feedback using the selected flavor colors
            colorCycleBtn.onmouseenter = () => {
                colorCycleBtn.style.backgroundColor = `rgba(${flavor.rgb}, 0.4)`;
            };
            colorCycleBtn.onmouseleave = () => {
                colorCycleBtn.style.backgroundColor = `rgba(${flavor.rgb}, 0.2)`;
            };
            
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
            if (typeof syncReconPortal === 'function') syncReconPortal();
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
    if (typeof syncReconPortal === 'function') syncReconPortal();
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

// --- Vault Swipe Controller (V1.6 Connected) ---
document.addEventListener('DOMContentLoaded', () => {
    let profileNames = [];
    let currentProfileIndex = -1;

    function refreshProfileNames() {
        if (!window.getProfiles) return;
        const ps = window.getProfiles();
        // Align carousel perfectly with the displayed/filtered list logic
        let names = Object.keys(ps).sort().reverse();
        if (window.currentLibraryFilter === 'zero') {
            names = names.filter(n => !ps[n].isReconScenario);
        } else if (window.currentLibraryFilter === 'recon') {
            names = names.filter(n => !!ps[n].isReconScenario);
        }
        profileNames = names;
    }

    // Hook into the original update logic
    const originalUpdate = window.updateProfileList;
    window.updateProfileList = function() {
        if (originalUpdate) originalUpdate.apply(this, arguments);
        refreshProfileNames();
        updateGalleryStats();
    };

    const originalPreview = window.previewProfile;
    window.previewProfile = function(name) {
        if (originalPreview) originalPreview.apply(this, arguments);
        refreshProfileNames(); 
        currentProfileIndex = profileNames.indexOf(name);
        
        updateGalleryStats();
    };

    function updateGalleryStats() {
        const counter = document.getElementById('galleryCounter');
        if (counter && currentProfileIndex !== -1 && profileNames.length > 0) {
            counter.classList.remove('hidden');
            counter.textContent = `Card ${currentProfileIndex + 1} of ${profileNames.length}`;
        }
    }

    function navigate(dir, event) {
        if (event) { event.preventDefault(); event.stopPropagation(); }
        refreshProfileNames(); 
        if (profileNames.length === 0) return;
        
        // Use the public window function to force the flip
        let nextIndex = currentProfileIndex + dir;
        if (nextIndex >= profileNames.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = profileNames.length - 1;
        
        const nextName = profileNames[nextIndex];
        if (nextName && window.previewProfile) {
            window.previewProfile(nextName);
            if (window.lucide) lucide.createIcons();
        }
    }

    // Attach Click Events
    const prevBtn = document.getElementById('prevProfileBtn');
    const nextBtn = document.getElementById('nextProfileBtn');
    if (prevBtn) prevBtn.onclick = (e) => navigate(-1, e);
    if (nextBtn) nextBtn.onclick = (e) => navigate(1, e);

    // Swipe Logic
    let startX = 0;
    const swipeArea = document.getElementById('snapshotPreview');
    if (swipeArea) {
        const handleEnd = (endX, target) => {
            if (target.closest('button')) return;
            const diff = startX - endX;
            if (Math.abs(diff) > 50) navigate(diff > 0 ? 1 : -1);
        };
        swipeArea.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, {passive: true});
        swipeArea.addEventListener('touchend', (e) => { handleEnd(e.changedTouches[0].clientX, e.target); }, {passive: true});
        swipeArea.addEventListener('mousedown', (e) => { startX = e.clientX; });
        swipeArea.addEventListener('mouseup', (e) => { handleEnd(e.clientX, e.target); });
    }

    // === AMMO LIBRARY CONTROLLER BY ANTIGRAVITY ===
    const ammoLibraryModal = document.getElementById('ammoLibraryModal');
    const openAmmoLibraryBtn = document.getElementById('openAmmoLibraryBtn');
    const closeAmmoLibraryBtn = document.getElementById('closeAmmoLibraryBtn');
    const saveAmmoProfileBtn = document.getElementById('saveAmmoProfileBtn');
    const ammoLibraryList = document.getElementById('ammoLibraryList');

    // Input elements for ammo form
    const ammoInputs = {
        name: document.getElementById('ammo-name'),
        caliber: document.getElementById('ammo-caliber'),
        bullet: document.getElementById('ammo-bullet'),
        powder: document.getElementById('ammo-powder'),
        primer: document.getElementById('ammo-primer'),
        col: document.getElementById('ammo-col'),
        velocity: document.getElementById('ammo-velocity'),
        count: document.getElementById('ammo-count')
    };

    function getAmmoProfiles() {
        return JSON.parse(localStorage.getItem('rangeCardAmmoProfiles') || '{}');
    }

    function saveAmmoProfiles(profiles) {
        localStorage.setItem('rangeCardAmmoProfiles', JSON.stringify(profiles));
    }

    function updateAmmoList() {
        if (!ammoLibraryList) return;
        const profiles = getAmmoProfiles();
        ammoLibraryList.innerHTML = '';

        const keys = Object.keys(profiles);
        if (keys.length === 0) {
            ammoLibraryList.innerHTML = `
                <div class="col-span-1 md:col-span-2 flex flex-col items-center justify-center py-12 text-center text-gray-600 font-mono text-xs uppercase tracking-wider">
                    <i data-lucide="info" class="w-8 h-8 opacity-20 mb-2"></i>
                    No saved ammo batches found.
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            return;
        }

        keys.forEach(key => {
            const p = profiles[key];
            const card = document.createElement('div');
            card.className = "bg-gray-900 border border-gray-800 p-4 rounded-xl flex flex-col justify-between hover:border-emerald-500/50 transition-all shadow-md relative";
            card.innerHTML = `
                <div class="space-y-2 text-left">
                    <div class="flex justify-between items-start border-b border-gray-800 pb-2 mb-2">
                        <div>
                            <h4 class="text-white font-bold uppercase text-sm tracking-wide truncate max-w-[150px]">${key}</h4>
                            <span class="text-[9px] text-emerald-400 font-mono uppercase">${p.caliber || 'General'}</span>
                        </div>
                        <button class="delete-ammo-btn text-red-500 hover:text-red-400 p-1 bg-black/40 hover:bg-red-950/20 rounded transition-colors" data-name="${key}">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-y-1.5 text-[10px] font-mono text-gray-400">
                        <div class="truncate">Bullet: <span class="text-gray-200 font-bold">${p.bullet || '--'}</span></div>
                        <div class="truncate">Powder: <span class="text-gray-200 font-bold">${p.powder || '--'}</span></div>
                        <div class="truncate">Primer: <span class="text-gray-200 font-bold">${p.primer || '--'}</span></div>
                        <div class="truncate">C.O.L: <span class="text-gray-200 font-bold">${p.col || '--'}</span></div>
                        <div class="truncate col-span-2">Velocity: <span class="text-gray-200 font-bold">${p.velocity || '--'} FPS</span></div>
                    </div>
                </div>
                
                <div class="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between gap-4">
                    <!-- Adjustment Counter -->
                    <div class="flex items-center gap-1.5 bg-black/40 p-1 rounded border border-gray-800">
                        <button class="adjust-ammo-btn bg-gray-800 text-white font-bold text-xs w-6 h-6 rounded flex items-center justify-center hover:bg-gray-700 active:bg-gray-600 transition-colors" data-name="${key}" data-amount="-1">-1</button>
                        <span class="text-white font-black text-xs px-2 min-w-[32px] text-center">${p.count || '0'} rds</span>
                        <button class="adjust-ammo-btn bg-gray-800 text-white font-bold text-xs w-6 h-6 rounded flex items-center justify-center hover:bg-gray-700 active:bg-gray-600 transition-colors" data-name="${key}" data-amount="1">+1</button>
                    </div>
                    
                    <button class="load-ammo-btn bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-[10px] uppercase font-bold py-1.5 px-3 rounded hover:bg-emerald-600/40 transition-colors" data-name="${key}">
                        Load to Card
                    </button>
                </div>
            `;
            ammoLibraryList.appendChild(card);
        });

        // Add event listeners inside list
        document.querySelectorAll('.delete-ammo-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const name = btn.getAttribute('data-name');
                if (confirm(`Delete ammo profile "${name}"?`)) {
                    const profiles = getAmmoProfiles();
                    delete profiles[name];
                    saveAmmoProfiles(profiles);
                    updateAmmoList();
                }
            };
        });

        document.querySelectorAll('.adjust-ammo-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const name = btn.getAttribute('data-name');
                const amt = parseInt(btn.getAttribute('data-amount')) || 0;
                const profiles = getAmmoProfiles();
                if (profiles[name]) {
                    profiles[name].count = Math.max(0, (parseInt(profiles[name].count) || 0) + amt);
                    saveAmmoProfiles(profiles);
                    updateAmmoList();
                }
            };
        });

        document.querySelectorAll('.load-ammo-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const name = btn.getAttribute('data-name');
                const profiles = getAmmoProfiles();
                const p = profiles[name];
                if (p) {
                    // Populate inputs in range-card form
                    if (p.caliber) document.getElementById('caliber').value = p.caliber;
                    if (p.bullet) document.getElementById('bullet').value = p.bullet;
                    if (p.powder) document.getElementById('powder').value = p.powder;
                    if (p.primer) document.getElementById('primer').value = p.primer;
                    if (p.col) document.getElementById('col').value = p.col;
                    if (p.velocity) document.getElementById('velocity').value = p.velocity;
                    if (p.count) document.getElementById('box-count-input').value = p.count;

                    // Manually trigger input events to sync display card
                    ['caliber', 'bullet', 'powder', 'primer', 'col', 'velocity', 'box-count-input'].forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.dispatchEvent(new Event('input'));
                    });

                    alert(`Loaded specifications for "${name}" into card!`);
                    if (ammoLibraryModal) ammoLibraryModal.classList.add('hidden');
                }
            };
        });

        if (window.lucide) lucide.createIcons();
    }

    if (openAmmoLibraryBtn && ammoLibraryModal) {
        openAmmoLibraryBtn.onclick = () => {
            ammoLibraryModal.classList.remove('hidden');
            updateAmmoList();
        };
    }

    if (closeAmmoLibraryBtn && ammoLibraryModal) {
        closeAmmoLibraryBtn.onclick = () => {
            ammoLibraryModal.classList.add('hidden');
        };
    }

    if (saveAmmoProfileBtn) {
        saveAmmoProfileBtn.onclick = () => {
            const name = ammoInputs.name.value.trim();
            if (!name) {
                alert("Please enter a load/batch name.");
                return;
            }

            const profiles = getAmmoProfiles();
            profiles[name] = {
                caliber: ammoInputs.caliber.value.trim(),
                bullet: ammoInputs.bullet.value.trim(),
                powder: ammoInputs.powder.value.trim(),
                primer: ammoInputs.primer.value.trim(),
                col: ammoInputs.col.value.trim(),
                velocity: ammoInputs.velocity.value.trim(),
                count: parseInt(ammoInputs.count.value) || 0
            };

            saveAmmoProfiles(profiles);
            updateAmmoList();

            // Clear inputs
            Object.values(ammoInputs).forEach(input => {
                if (input) input.value = '';
            });

            alert(`Successfully saved batch "${name}" to Ammo Library!`);
        };
    }

    // === 10. Tactical Recon Mapper ===
    let isReconActive = false;
    let selectedEmoji = null;
    const toggleReconMapperBtn = document.getElementById('toggleReconMapperBtn');
    const normalSidebarView = document.getElementById('normal-sidebar-view');
    const reconSidebarView = document.getElementById('recon-sidebar-view');
    const normalCardContainer = document.getElementById('card-container');
    const reconCardContainer = document.getElementById('recon-card-container');

    function syncReconPortal() {
        const normalMobilePreview = document.getElementById('mobile-live-preview-complete');
        const reconMobilePreview = document.getElementById('mobile-recon-preview-complete');
        
        if (isReconActive) {
            if (reconMobilePreview) reconMobilePreview.classList.remove('hidden');
            if (normalMobilePreview) normalMobilePreview.classList.add('hidden');
            
            // Sync labels to the mobile stacked form
            const titleLabel = document.getElementById('mobile-display-recon-title-label');
            const reportLabel = document.getElementById('mobile-display-recon-report-label');
            const timestampLabel = document.getElementById('mobile-display-recon-timestamp-label');
            
            if (titleLabel) titleLabel.textContent = document.getElementById('display-recon-title').textContent;
            if (reportLabel) reportLabel.textContent = document.getElementById('display-recon-report').textContent;
            if (timestampLabel) timestampLabel.textContent = document.getElementById('display-recon-timestamp').textContent;
        } else {
            if (reconMobilePreview) reconMobilePreview.classList.add('hidden');
            if (normalMobilePreview) normalMobilePreview.classList.remove('hidden');
        }
    }
    window.syncReconPortal = syncReconPortal;
    
    if (toggleReconMapperBtn) {
        toggleReconMapperBtn.addEventListener('click', () => {
            isReconActive = !isReconActive;
            if (isReconActive) {
                toggleReconMapperBtn.innerHTML = '<i data-lucide="crosshair" class="w-4 h-4"></i> BACK TO RANGE CARD';
                toggleReconMapperBtn.classList.replace('bg-indigo-950/40', 'bg-emerald-950/40');
                toggleReconMapperBtn.classList.replace('border-indigo-500', 'border-emerald-500');
                toggleReconMapperBtn.classList.replace('text-indigo-400', 'text-emerald-400');
                
                normalSidebarView.classList.add('hidden');
                reconSidebarView.classList.remove('hidden');
                normalCardContainer.classList.add('hidden');
                reconCardContainer.classList.remove('hidden');
                
                // Prevent accidentally clicking the standard save button while in Recon View
                const stdSave = document.getElementById('saveProfileBtnManual');
                if (stdSave) stdSave.classList.add('hidden');
            } else {
                toggleReconMapperBtn.innerHTML = '<i data-lucide="map" class="w-4 h-4"></i> TACTICAL RECON MAPPER';
                toggleReconMapperBtn.classList.replace('bg-emerald-950/40', 'bg-indigo-950/40');
                toggleReconMapperBtn.classList.replace('border-emerald-500', 'border-indigo-500');
                toggleReconMapperBtn.classList.replace('text-emerald-400', 'text-indigo-400');
                
                normalSidebarView.classList.remove('hidden');
                reconSidebarView.classList.add('hidden');
                normalCardContainer.classList.remove('hidden');
                reconCardContainer.classList.add('hidden');

                const stdSave = document.getElementById('saveProfileBtnManual');
                if (stdSave) stdSave.classList.remove('hidden');
            }
            syncReconPortal();
            if (window.lucide) window.lucide.createIcons();
        });
    }

    // SITREP & Scenario Title Synchronizer
    const reconScenarioName = document.getElementById('recon-scenario-name');
    const displayReconTitle = document.getElementById('display-recon-title');
    const reconReport = document.getElementById('recon-report');
    const displayReconReport = document.getElementById('display-recon-report');
    const displayReconTimestamp = document.getElementById('display-recon-timestamp');

    if (reconScenarioName && displayReconTitle) {
        reconScenarioName.addEventListener('input', () => {
            displayReconTitle.textContent = reconScenarioName.value.trim().toUpperCase() || 'NEW SCENARIO';
            syncReconPortal();
        });
    }
    if (reconReport && displayReconReport) {
        reconReport.addEventListener('input', () => {
            displayReconReport.textContent = reconReport.value.trim() || 'NO SITREP FILED';
            const now = new Date();
            if (displayReconTimestamp) {
                displayReconTimestamp.textContent = now.toLocaleTimeString() + " | " + now.toLocaleDateString();
            }
            syncReconPortal();
        });
    }

    const mapBgUpload = document.getElementById('map-bg-upload');
    const reconBgImage = document.getElementById('recon-bg-image');
    const reconDefaultGrid = document.getElementById('recon-default-grid');

    if (mapBgUpload && reconBgImage) {
        mapBgUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
                    alert("Note: Apple HEIC/HEIF image formats are not natively supported by standard web browsers. Please convert your screenshot to PNG or JPG to upload successfully.");
                    return;
                }
                const reader = new FileReader();
                reader.onload = (event) => {
                    // Update main desktop workspace background
                    reconBgImage.src = event.target.result;
                    reconBgImage.classList.remove('hidden');
                    if (reconDefaultGrid) reconDefaultGrid.classList.add('hidden');

                    // Update twin mobile workspace background
                    const mobileBg = document.getElementById('mobile-recon-bg-image');
                    const mobileGrid = document.getElementById('mobile-recon-default-grid');
                    if (mobileBg) {
                        mobileBg.src = event.target.result;
                        mobileBg.classList.remove('hidden');
                    }
                    if (mobileGrid) mobileGrid.classList.add('hidden');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Emoji Marker Placement & Management
    const emojiButtons = document.querySelectorAll('.emoji-btn');
    const workspace = document.getElementById('recon-map-workspace');

    emojiButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            emojiButtons.forEach(b => b.classList.remove('border-neon-green', 'bg-gray-800'));
            if (selectedEmoji === btn.dataset.emoji) {
                selectedEmoji = null;
            } else {
                selectedEmoji = btn.dataset.emoji;
                btn.classList.add('border-neon-green', 'bg-gray-800');
                
                // SPARK OF TOUCHSCREEN GENIUS: Spawn the marker at 50%, 50% automatically!
                if (typeof createMarker === 'function') {
                    createMarker(50, 50, selectedEmoji, '');
                }
            }
        });
    });

    if (workspace) {
        workspace.addEventListener('click', (e) => {
            if (e.target !== workspace && e.target.id !== 'recon-canvas' && e.target.id !== 'recon-default-grid') return;
            if (!selectedEmoji) return;
            
            const drawToggle = document.getElementById('recon-pencil-toggle');
            if (drawToggle && drawToggle.checked) return;

            const rect = workspace.getBoundingClientRect();
            const clickX = ((e.clientX - rect.left) / rect.width) * 100;
            const clickY = ((e.clientY - rect.top) / rect.height) * 100;

            createMarker(clickX, clickY, selectedEmoji, '');
        });
    }

    function createSingleMarker(x, y, emoji, note, isMobileTwin = false) {
        const targetWorkspace = isMobileTwin 
            ? document.getElementById('mobile-recon-map-workspace') 
            : document.getElementById('recon-map-workspace');
        if (!targetWorkspace) return null;

        const marker = document.createElement('div');
        marker.className = 'absolute select-none cursor-move z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-1 rounded border border-emerald-500/40 hover:border-emerald-400 hover:scale-105 transition-all shadow-md recon-marker';
        if (isMobileTwin) marker.classList.add('mobile-recon-marker');
        marker.style.left = `${x}%`;
        marker.style.top = `${y}%`;
        marker.dataset.emoji = emoji;
        marker.dataset.note = note;

        const emojiSpan = document.createElement('span');
        emojiSpan.className = 'text-xl filter drop-shadow-sm select-none';
        emojiSpan.textContent = emoji;

        const noteSpan = document.createElement('span');
        noteSpan.className = 'text-[8px] font-extrabold text-white font-mono bg-emerald-950/80 border border-emerald-500/40 px-1 py-0.5 rounded uppercase leading-none tracking-wider select-none whitespace-nowrap marker-note-span';
        noteSpan.textContent = note || 'LABEL';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'text-[12px] text-red-400 hover:text-red-300 transition-colors bg-red-950/40 border border-red-500/30 w-5 h-5 rounded flex items-center justify-center p-0 ml-1 cursor-pointer font-sans font-black';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Delete Marker';
        
        // Stop drag & click propagation on contact
        deleteBtn.addEventListener('mousedown', (e) => e.stopPropagation());
        deleteBtn.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (confirm('Delete this marker?')) {
                if (marker.twin) marker.twin.remove();
                marker.remove();
            }
        });

        marker.appendChild(emojiSpan);
        marker.appendChild(noteSpan);
        marker.appendChild(deleteBtn);

        marker.addEventListener('click', (e) => {
            e.stopPropagation();
            const newNote = prompt('Enter notes / yardage for this marker:', marker.dataset.note);
            if (newNote !== null) {
                const trimmed = newNote.trim();
                marker.dataset.note = trimmed;
                noteSpan.textContent = trimmed || 'LABEL';
                if (marker.twin) {
                    marker.twin.dataset.note = trimmed;
                    const twinNoteSpan = marker.twin.querySelector('.marker-note-span');
                    if (twinNoteSpan) twinNoteSpan.textContent = trimmed || 'LABEL';
                }
            }
        });

        let isDragging = false;

        const dragStart = (e) => {
            isDragging = true;
            e.stopPropagation();
        };

        const dragMove = (e) => {
            if (!isDragging) return;
            const touch = e.touches && e.touches.length > 0 ? e.touches[0] : (e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0] : null);
            const clientX = touch ? touch.clientX : e.clientX;
            const clientY = touch ? touch.clientY : e.clientY;
            
            const rect = targetWorkspace.getBoundingClientRect();
            let pctX = ((clientX - rect.left) / rect.width) * 100;
            let pctY = ((clientY - rect.top) / rect.height) * 100;

            pctX = Math.max(1, Math.min(pctX, 88));
            pctY = Math.max(1, Math.min(pctY, 92));

            marker.style.left = `${pctX}%`;
            marker.style.top = `${pctY}%`;
            
            if (marker.twin) {
                marker.twin.style.left = `${pctX}%`;
                marker.twin.style.top = `${pctY}%`;
            }

            if (e.cancelable) e.preventDefault();
        };

        const dragEnd = () => {
            isDragging = false;
        };

        marker.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', dragMove);
        document.addEventListener('mouseup', dragEnd);

        marker.addEventListener('touchstart', dragStart, { passive: false });
        document.addEventListener('touchmove', dragMove, { passive: false });
        document.addEventListener('touchend', dragEnd);

        targetWorkspace.appendChild(marker);
        return marker;
    }

    function createMarker(x, y, emoji, note) {
        const desktopMarker = createSingleMarker(x, y, emoji, note, false);
        const mobileMarker = createSingleMarker(x, y, emoji, note, true);
        if (desktopMarker && mobileMarker) {
            desktopMarker.twin = mobileMarker;
            mobileMarker.twin = desktopMarker;
        }
    }
    window.createMarker = createMarker;

    // Recon Drawing Canvas Logic
    const reconCanvas = document.getElementById('recon-canvas');
    const mobileReconCanvas = document.getElementById('mobile-recon-canvas');
    const mobileReconBgImage = document.getElementById('mobile-recon-bg-image');
    const mobileReconDefaultGrid = document.getElementById('mobile-recon-default-grid');

    if (reconCanvas) {
        const rCtx = reconCanvas.getContext('2d');
        const mCtx = mobileReconCanvas ? mobileReconCanvas.getContext('2d') : null;
        let rDrawing = false;
        const reconPencilToggle = document.getElementById('recon-pencil-toggle');

        const getReconPos = (e, canvasEl) => {
            const rect = canvasEl.getBoundingClientRect();
            const touch = e.touches && e.touches.length > 0 ? e.touches[0] : (e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0] : null);
            const clientX = touch ? touch.clientX : e.clientX;
            const clientY = touch ? touch.clientY : e.clientY;
            return {
                x: ((clientX - rect.left) / rect.width) * canvasEl.width,
                y: ((clientY - rect.top) / rect.height) * canvasEl.height
            };
        };

        const startRDraw = (e) => {
            if (!reconPencilToggle || !reconPencilToggle.checked) return;
            if (e.type === 'touchstart' && e.cancelable) e.preventDefault();
            rDrawing = true;
            
            const pos = getReconPos(e, e.currentTarget);
            rCtx.beginPath();
            rCtx.lineWidth = 1.0;
            rCtx.lineCap = 'round';
            rCtx.strokeStyle = '#ef4444';
            rCtx.moveTo(pos.x, pos.y);

            if (mCtx) {
                mCtx.beginPath();
                mCtx.lineWidth = 1.0;
                mCtx.lineCap = 'round';
                mCtx.strokeStyle = '#ef4444';
                mCtx.moveTo(pos.x, pos.y);
            }
        };

        const moveRDraw = (e) => {
            if (!rDrawing) return;
            if (e.type === 'touchmove' && e.cancelable) e.preventDefault();
            
            const pos = getReconPos(e, e.currentTarget);
            rCtx.lineTo(pos.x, pos.y);
            rCtx.stroke();

            if (mCtx) {
                mCtx.lineTo(pos.x, pos.y);
                mCtx.stroke();
            }
        };

        const stopRDraw = () => {
            if (!rDrawing) return;
            rCtx.closePath();
            if (mCtx) mCtx.closePath();
            rDrawing = false;
        };

        reconCanvas.addEventListener('mousedown', startRDraw);
        reconCanvas.addEventListener('mousemove', moveRDraw);
        reconCanvas.addEventListener('mouseup', stopRDraw);
        reconCanvas.addEventListener('touchstart', startRDraw, { passive: false });
        reconCanvas.addEventListener('touchmove', moveRDraw, { passive: false });
        reconCanvas.addEventListener('touchend', stopRDraw);

        if (mobileReconCanvas) {
            mobileReconCanvas.addEventListener('mousedown', startRDraw);
            mobileReconCanvas.addEventListener('mousemove', moveRDraw);
            mobileReconCanvas.addEventListener('mouseup', stopRDraw);
            mobileReconCanvas.addEventListener('touchstart', startRDraw, { passive: false });
            mobileReconCanvas.addEventListener('touchmove', moveRDraw, { passive: false });
            mobileReconCanvas.addEventListener('touchend', stopRDraw);
        }

        if (reconPencilToggle) {
            reconPencilToggle.addEventListener('change', () => {
                const label = reconPencilToggle.parentElement;
                if (reconPencilToggle.checked) {
                    label.classList.add('bg-emerald-950/40', 'border-emerald-500', 'text-emerald-400', 'shadow-lg', 'shadow-emerald-500/20');
                    label.querySelector('span').textContent = '🖊️ DRAWING ACTIVE';
                    reconCanvas.classList.remove('pointer-events-none');
                    if (mobileReconCanvas) mobileReconCanvas.classList.remove('pointer-events-none');
                } else {
                    label.classList.remove('bg-emerald-950/40', 'border-emerald-500', 'text-emerald-400', 'shadow-lg', 'shadow-emerald-500/20');
                    label.querySelector('span').textContent = '🖊️ DRAW PATH';
                    reconCanvas.classList.add('pointer-events-none');
                    if (mobileReconCanvas) mobileReconCanvas.classList.add('pointer-events-none');
                }
            });
        }

        document.getElementById('clear-recon-drawings').addEventListener('click', () => {
            if (confirm('Clear drawings and markers?')) {
                rCtx.clearRect(0, 0, reconCanvas.width, reconCanvas.height);
                if (mCtx) mCtx.clearRect(0, 0, mobileReconCanvas.width, mobileReconCanvas.height);
                
                document.querySelectorAll('.recon-marker').forEach(m => m.remove());
                
                reconBgImage.classList.add('hidden');
                reconBgImage.src = '';
                if (mobileReconBgImage) {
                    mobileReconBgImage.classList.add('hidden');
                    mobileReconBgImage.src = '';
                }
                
                if (reconDefaultGrid) reconDefaultGrid.classList.remove('hidden');
                if (mobileReconDefaultGrid) mobileReconDefaultGrid.classList.remove('hidden');
            }
        });

        const clearReconPencilBtn = document.getElementById('clear-recon-pencil');
        if (clearReconPencilBtn) {
            clearReconPencilBtn.addEventListener('click', () => {
                if (confirm('Clear pencil drawings only?')) {
                    rCtx.clearRect(0, 0, reconCanvas.width, reconCanvas.height);
                    if (mCtx) mCtx.clearRect(0, 0, mobileReconCanvas.width, mobileReconCanvas.height);
                }
            });
        }
    }

    // Save and Load from library using our robust IndexedDB
    const saveReconMapBtn = document.getElementById('saveReconMapBtn');
    const openReconLibraryBtn = document.getElementById('openReconLibraryBtn');

    if (saveReconMapBtn) {
        saveReconMapBtn.addEventListener('click', async () => {
            const name = reconScenarioName.value.trim();
            if (!name) {
                alert('Please set a Scenario Name first.');
                return;
            }

            // Friendly loading indicator
            saveReconMapBtn.disabled = true;
            const originalHTML = saveReconMapBtn.innerHTML;
            saveReconMapBtn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> GENERATING PREVIEW...';
            if (window.lucide) window.lucide.createIcons();

            const container = document.getElementById('recon-card-container');
            const previewPanel = document.getElementById('previewPanel');
            const isVisuallyHidden = previewPanel.classList.contains('opacity-0');

            // Force visual activation for html2canvas
            if (isVisuallyHidden) {
                previewPanel.classList.remove('opacity-0', 'pointer-events-none', 'absolute');
                previewPanel.classList.add('flex');
            }

            const originalTransform = container.style.transform;
            container.style.transform = 'none';
            const originalScrollY = window.scrollY;
            window.scrollTo(0, 0);

            const originalTransition = previewPanel.style.transition;
            previewPanel.style.transition = 'none';
            document.body.classList.add('is-capturing');

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
                    document.body.classList.remove('is-capturing');
                    previewPanel.style.transition = originalTransition;

                    if (isVisuallyHidden) {
                        previewPanel.classList.add('opacity-0', 'pointer-events-none', 'absolute');
                        previewPanel.classList.remove('flex');
                    }
                    container.style.transform = originalTransform;
                    window.scrollTo(0, originalScrollY);

                    const snapshotUrl = canvas.toDataURL("image/jpeg", 0.7);

                    const markers = [];
                    document.querySelectorAll('.recon-marker:not(.mobile-recon-marker)').forEach(m => {
                        markers.push({
                            x: parseFloat(m.style.left),
                            y: parseFloat(m.style.top),
                            emoji: m.dataset.emoji,
                            note: m.dataset.note
                        });
                    });

                    const drawingUrl = reconCanvas.toDataURL();

                    const reconData = {
                        id: 'recon-' + name.toLowerCase().replace(/\s+/g, '-'),
                        name: name,
                        isReconScenario: true,
                        snapshot: snapshotUrl,
                        bgImage: reconBgImage.classList.contains('hidden') ? '' : reconBgImage.src,
                        report: reconReport.value,
                        markers: markers,
                        drawing: drawingUrl,
                        timestamp: new Date().toISOString()
                    };

                    const ps = getProfiles();
                    ps[name] = reconData;

                    const postSave = () => {
                        saveReconMapBtn.disabled = false;
                        saveReconMapBtn.innerHTML = originalHTML;
                        if (window.lucide) window.lucide.createIcons();

                        window.currentLibraryFilter = 'all';
                        window.openLibrary();
                        if (window.previewProfile) window.previewProfile(name);
                    };

                    if (window.TRC_IDB) {
                        window.TRC_IDB.set('rangeCardProfiles', name, reconData).then(() => {
                            postSave();
                        }).catch(err => {
                            console.error("IDB save failed, falling back to localStorage:", err);
                            localStorage.setItem('rangeCardProfiles', JSON.stringify(ps));
                            postSave();
                        });
                    } else {
                        localStorage.setItem('rangeCardProfiles', JSON.stringify(ps));
                        postSave();
                    }

                }).catch(err => {
                    document.body.classList.remove('is-capturing');
                    previewPanel.style.transition = originalTransition;
                    if (isVisuallyHidden) {
                        previewPanel.classList.add('opacity-0', 'pointer-events-none', 'absolute');
                        previewPanel.classList.remove('flex');
                    }
                    container.style.transform = originalTransform;
                    window.scrollTo(0, originalScrollY);

                    saveReconMapBtn.disabled = false;
                    saveReconMapBtn.innerHTML = originalHTML;
                    if (window.lucide) window.lucide.createIcons();

                    console.error("Recon capture failure:", err);
                    alert("Recon save failed. Please check log.");
                });
            }, 500);
        });
    }

    if (openReconLibraryBtn) {
        openReconLibraryBtn.addEventListener('click', () => {
            window.currentLibraryFilter = 'all';
            window.openLibrary();
        });
    }

    // === TACTICAL STOPWATCH CONTROLLER ===
    let timerInterval = null;
    let timerMilliseconds = 0;
    let isTimerRunning = false;

    const timerDisplay = document.getElementById('stopwatch-display');
    const timerStartBtn = document.getElementById('stopwatch-start');
    const timerResetBtn = document.getElementById('stopwatch-reset');

    function updateTimerDisplay() {
        if (!timerDisplay) return;
        let totalSeconds = Math.floor(timerMilliseconds / 1000);
        let mins = Math.floor(totalSeconds / 60);
        let secs = totalSeconds % 60;
        let tenths = Math.floor((timerMilliseconds % 1000) / 100);

        let displayMins = mins.toString().padStart(2, '0');
        let displaySecs = secs.toString().padStart(2, '0');
        
        timerDisplay.innerHTML = `${displayMins}:${displaySecs}<span class="text-xs text-neon-green/50">.${tenths}</span>`;
    }

    if (timerStartBtn) {
        timerStartBtn.addEventListener('click', () => {
            if (isTimerRunning) {
                // Pause
                clearInterval(timerInterval);
                timerStartBtn.innerHTML = '<i data-lucide="play" class="w-4 h-4"></i>';
                timerStartBtn.classList.replace('bg-amber-950/40', 'bg-emerald-950/40');
                timerStartBtn.classList.replace('text-amber-500', 'text-emerald-400');
                timerStartBtn.classList.replace('border-amber-800', 'border-emerald-800');
                isTimerRunning = false;
            } else {
                // Start
                const startTime = Date.now() - timerMilliseconds;
                timerInterval = setInterval(() => {
                    timerMilliseconds = Date.now() - startTime;
                    updateTimerDisplay();
                }, 100);
                timerStartBtn.innerHTML = '<i data-lucide="pause" class="w-4 h-4"></i>';
                timerStartBtn.classList.replace('bg-emerald-950/40', 'bg-amber-950/40');
                timerStartBtn.classList.replace('text-emerald-400', 'text-amber-500');
                timerStartBtn.classList.replace('border-emerald-800', 'border-amber-800');
                isTimerRunning = true;
            }
            if (window.lucide) window.lucide.createIcons();
        });
    }

    if (timerResetBtn) {
        timerResetBtn.addEventListener('click', () => {
            clearInterval(timerInterval);
            isTimerRunning = false;
            timerMilliseconds = 0;
            updateTimerDisplay();
            if (timerStartBtn) {
                timerStartBtn.innerHTML = '<i data-lucide="play" class="w-4 h-4"></i>';
                timerStartBtn.className = "bg-emerald-950/40 border border-emerald-800 text-emerald-400 p-2 rounded hover:bg-emerald-900/60 hover:border-emerald-600 transition-colors";
            }
            if (window.lucide) window.lucide.createIcons();
        });
    }

    // Force initial sync
    if (window.updateProfileList) window.updateProfileList();
});
