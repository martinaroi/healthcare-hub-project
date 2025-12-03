document.addEventListener('DOMContentLoaded', () => {
    // Progressive enhancement flag
    document.body.classList.add('js-enhanced');

    // Booking storage helpers
    function getBookedSlots(doctor, date) {
        try {
            const key = `bookings_${doctor}_${date}`;
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    function addBooking(doctor, date, time) {
        try {
            const key = `bookings_${doctor}_${date}`;
            const slots = getBookedSlots(doctor, date);
            if (!slots.includes(time)) {
                slots.push(time);
                localStorage.setItem(key, JSON.stringify(slots));
            }
        } catch (err) {
            console.error('Failed to save booking:', err);
        }
    }

    // Make these functions globally accessible for the booking form
    window.__getBookedSlots = getBookedSlots;
    window.__addBooking = addBooking;

    // Make logo link to home across all pages
    document.querySelectorAll('header img.logo').forEach(img => {
        if (img.closest('a')) return; // already wrapped
        const link = document.createElement('a');
        link.href = 'index.html';
        link.className = 'logo-link';
        link.setAttribute('aria-label', 'Go to home');
        // Insert link before the image and move the image inside it
        img.parentNode.insertBefore(link, img);
        link.appendChild(img);
    });

    // Mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const pageHeader = menuToggle ? menuToggle.closest('header') : null;
    const navContainer = pageHeader ? pageHeader.querySelector('nav') : null;
    if (menuToggle && navLinks) {
        menuToggle.setAttribute('aria-label', 'Open menu');
        menuToggle.addEventListener('click', () => {
            const isOpen = navLinks.classList.toggle('open');
            menuToggle.setAttribute('aria-expanded', String(isOpen));
            if (navContainer) navContainer.classList.toggle('is-open', isOpen);
            document.body.classList.toggle('nav-open', isOpen);
            if (pageHeader) pageHeader.classList.toggle('nav-open', isOpen);
            menuToggle.textContent = isOpen ? '✕' : '☰';
            menuToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
        });

        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.matchMedia('(max-width: 900px)').matches) {
                    navLinks.classList.remove('open');
                    menuToggle.setAttribute('aria-expanded', 'false');
                    if (navContainer) navContainer.classList.remove('is-open');
                    document.body.classList.remove('nav-open');
                    if (pageHeader) pageHeader.classList.remove('nav-open');
                    menuToggle.textContent = '☰';
                    menuToggle.setAttribute('aria-label', 'Open menu');
                }
            });
        });

        const mobileQuery = window.matchMedia('(max-width: 900px)');
        const handleBreakpointChange = (event) => {
            if (!event.matches) {
                navLinks.classList.remove('open');
                menuToggle.setAttribute('aria-expanded', 'false');
                if (navContainer) navContainer.classList.remove('is-open');
                document.body.classList.remove('nav-open');
                if (pageHeader) pageHeader.classList.remove('nav-open');
                menuToggle.textContent = '☰';
                menuToggle.setAttribute('aria-label', 'Open menu');
            }
        };

        if (typeof mobileQuery.addEventListener === 'function') {
            mobileQuery.addEventListener('change', handleBreakpointChange);
        } else if (typeof mobileQuery.addListener === 'function') {
            mobileQuery.addListener(handleBreakpointChange);
        }
    }

    // Submenu toggle (e.g., Doctors) for button-based menus
    document.querySelectorAll('.has-submenu .submenu-toggle').forEach(btn => {
        const parent = btn.closest('.has-submenu');
        const submenu = parent?.querySelector('.submenu');
        if (!submenu) return;
        const setOpen = (open) => {
            btn.setAttribute('aria-expanded', String(open));
            submenu.style.display = open ? (window.matchMedia('(min-width: 1024px)').matches ? 'block' : 'block') : 'none';
        };
        // Initialize closed on load (CSS handles hover on desktop as well)
        setOpen(false);
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = btn.getAttribute('aria-expanded') === 'true';
            setOpen(!isOpen);
        });
        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!parent.contains(e.target)) setOpen(false);
        });
        // Keyboard support: Escape to close
        parent.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') setOpen(false);
        });
    });
    // Booking form handling (only if present)
    const form = document.getElementById('booking-form');
    if (form) {
        // Calendar/time enhancement
        (function initSchedulePicker() {
            const picker = document.querySelector('.schedule-picker');
            const dateInput = document.getElementById('date');
            const timeInput = document.getElementById('time');
            if (!picker || !dateInput || !timeInput) return;

            // Utilities
            const today = new Date();
            today.setHours(0,0,0,0);
            let view = new Date(today.getFullYear(), today.getMonth(), 1);
            let selectedDate = null;
            let selectedTime = null;

            const calTitle = picker.querySelector('#cal-title');
            const grid = picker.querySelector('.cal-grid');
            const prevBtn = picker.querySelector('.cal-prev');
            const nextBtn = picker.querySelector('.cal-next');
            const slotsWrap = picker.querySelector('.slots');

            // Week starts on Monday
            const weekdays = ['Mon','Tue','Wed','Thu','Fri'];
            const defaultSlots = ['09:00','09:30','10:00','10:30','11:00','11:30','13:00','13:30','14:00','14:30','15:00','15:30'];
            // Per-doctor weekly schedule (Mon=1..Sun=0 for getDay())
            // Keys match the booking select values
            const schedules = {
                'pediatrics-captaincare': {
                    1: ['09:00','09:30','10:00','10:30','11:00'], // Monday
                    2: ['09:00','09:30','10:00','10:30','11:00'], // Tuesday
                    3: ['13:00','13:30','14:00','14:30'],         // Wednesday
                    4: ['09:00','09:30','10:00','10:30','11:00'], // Thursday
                    5: ['09:00','09:30','10:00']                  // Friday
                },
                'cardiology-hearthero': {
                    1: ['13:00','13:30','14:00','14:30','15:00'], // Monday
                    3: ['09:00','09:30','10:00','10:30'],         // Wednesday
                    4: ['13:00','13:30','14:00','14:30']          // Thursday
                },
                'orthopedics-ironbones': {
                    2: ['09:00','09:30','10:00','10:30','11:00','11:30'], // Tuesday
                    4: ['09:00','09:30','10:00','10:30']                  // Thursday
                },
                'oncology-starhealer': {
                    1: ['13:00','13:30','14:00','14:30','15:00'], // Monday
                    3: ['09:00','09:30','10:00','10:30'],         // Wednesday
                    4: ['13:00','13:30','14:00','14:30']          // Thursday
                }
            };
            const doctorRadios = Array.from(document.querySelectorAll('.doctor-picker input[type="radio"]'));
            const getSelectedDoctor = () => doctorRadios.find(radio => radio.checked)?.value || '';

            function fmtDateISO(d) {
                const y = d.getFullYear();
                const m = String(d.getMonth()+1).padStart(2,'0');
                const day = String(d.getDate()).padStart(2,'0');
                return `${y}-${m}-${day}`;
            }

            // Enforce minimum date and block weekends on native input as well
            dateInput.min = fmtDateISO(today);
            dateInput.addEventListener('change', () => {
                if (!dateInput.value) return;
                const d = new Date(dateInput.value + 'T00:00:00');
                const isWeekend = [0,6].includes(d.getDay());
                const isPast = d < today;
                if (isWeekend || isPast) {
                    alert('Appointments are not available on weekends or past dates. Please choose a weekday.');
                    dateInput.value = '';
                    selectedDate = null;
                    selectedTime = null;
                    timeInput.value = '';
                    updateSlots();
                    renderCalendar();
                    return;
                }
                selectedDate = d;
                selectedTime = null;
                timeInput.value = '';
                updateSlots();
                renderCalendar();
            });

            function handleDoctorChange() {
                selectedTime = null;
                if (timeInput) timeInput.value = '';
                updateSlots();
                renderCalendar();
            }

            function renderCalendar() {
                const month = view.getMonth();
                const year = view.getFullYear();
                calTitle.textContent = view.toLocaleString(undefined, { month: 'long', year: 'numeric' });

                grid.innerHTML = '';
                // Weekday headers
                weekdays.forEach(w => {
                    const h = document.createElement('div');
                    h.className = 'weekday';
                    h.textContent = w;
                    grid.appendChild(h);
                });

                const firstDay = new Date(year, month, 1);
                // getDay(): 0=Sun..6=Sat; convert to Monday-first index (0=Mon..6=Sun)
                let startWeekday = (firstDay.getDay() + 6) % 7;
                const daysInMonth = new Date(year, month+1, 0).getDate();

                if (startWeekday > 4) {
                    startWeekday = 0;
                }

                for (let i=0; i<startWeekday; i++) {
                    const blank = document.createElement('div');
                    blank.className = 'calendar-blank';
                    grid.appendChild(blank);
                }

                for (let d=1; d<=daysInMonth; d++) {
                    const date = new Date(year, month, d);
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'day';
                    btn.textContent = String(d);
                    const isPast = date < today;
                    const isWeekend = [0,6].includes(date.getDay());
                    const dayOfWeek = date.getDay(); // 0=Sun..6=Sat
                    
                    if (isWeekend) {
                        continue;
                    }

                    // Check if selected doctor has availability on this day
                    const doctorKey = getSelectedDoctor();
                    const hasAvailability = doctorKey && schedules[doctorKey] && schedules[doctorKey][dayOfWeek] && schedules[doctorKey][dayOfWeek].length > 0;
                    
                    if (isPast) {
                        btn.disabled = true;
                    } else if (doctorKey && !hasAvailability) {
                        // Doctor selected but no availability this day
                        btn.classList.add('no-availability');
                        btn.title = 'Selected doctor not available this day';
                    } else if (doctorKey && hasAvailability) {
                        // Doctor has availability - color code it
                        btn.classList.add('has-availability');
                        btn.title = 'Doctor available - click to see times';
                    }
                    
                    if (selectedDate && fmtDateISO(date) === fmtDateISO(selectedDate)) {
                        btn.classList.add('selected');
                    }
                    btn.addEventListener('click', () => {
                        selectedDate = date;
                        dateInput.value = fmtDateISO(date);
                        // Reset previous time selection when changing date
                        selectedTime = null;
                        timeInput.value = '';
                        updateSlots();
                        renderCalendar();
                    });
                    grid.appendChild(btn);
                }
            }

            function updateSlots() {
                slotsWrap.innerHTML = '';
                const info = document.createElement('div');
                info.className = 'slots__message';
                if (!selectedDate) {
                    info.textContent = 'Pick a date to see available times.';
                    slotsWrap.appendChild(info);
                    return;
                }

                const dateStr = fmtDateISO(selectedDate);
                // Block weekends entirely
                const dow = selectedDate.getDay(); // 0=Sun..6=Sat
                const isWeekend = [0,6].includes(dow);
                const doctorKey = getSelectedDoctor();
                if (!doctorKey) {
                    info.textContent = 'Select a doctor to see available times.';
                    slotsWrap.appendChild(info);
                    return;
                }
                let slots = [];
                if (!isWeekend) {
                    const docSched = schedules[doctorKey];
                    slots = docSched?.[dow] || []; // if no specific schedule that weekday, no slots
                }
                if (slots.length === 0) {
                    info.textContent = 'No times available for this date.';
                    slotsWrap.appendChild(info);
                    return;
                }

                // Get booked slots from localStorage
                const bookedSlots = (doctorKey && window.__getBookedSlots)
                    ? window.__getBookedSlots(doctorKey, dateStr)
                    : [];

                slots.forEach(t => {
                    const b = document.createElement('button');
                    b.type = 'button';
                    b.className = 'slot';
                    b.textContent = t;
                    
                    // Check if this slot is already booked
                    const isBooked = bookedSlots.includes(t);
                    if (isBooked) {
                        b.classList.add('unavailable');
                        b.disabled = true;
                        b.title = 'This time is already booked';
                    } else {
                        if (selectedTime === t) b.classList.add('selected');
                        b.addEventListener('click', () => {
                            selectedTime = t;
                            timeInput.value = t;
                            // reflect selection
                            slotsWrap.querySelectorAll('button.slot.selected').forEach(el => el.classList.remove('selected'));
                            b.classList.add('selected');
                        });
                    }
                    slotsWrap.appendChild(b);
                });
            }

            prevBtn.addEventListener('click', () => {
                view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
                renderCalendar();
            });
            nextBtn.addEventListener('click', () => {
                view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
                renderCalendar();
            });

            // Initialize
            renderCalendar();
            updateSlots();

            // Expose a function to refresh slots when doctor changes via card picker
            window.__refreshSlotsForDoctor = () => {
                handleDoctorChange();
            };
        })();

        // Optional message UX: auto-resize and counter
        (function initMessageEnhancements() {
            const ta = document.getElementById('message');
            const counter = document.getElementById('message-count');
            if (!ta || !counter) return;
            const max = parseInt(ta.getAttribute('maxlength') || '300', 10);
            const updateCounter = () => {
                const len = ta.value.length;
                counter.textContent = `${len} / ${max}`;
            };
            const autoResize = () => {
                ta.style.height = 'auto';
                ta.style.height = Math.min(220, Math.max(44, ta.scrollHeight)) + 'px';
            };
            ta.addEventListener('input', () => { updateCounter(); autoResize(); });
            // Initialize on load
            updateCounter();
            autoResize();
        })();

        // Doctor card picker sync
        (function initDoctorPicker() {
            const picker = document.querySelector('.doctor-picker');
            if (!picker) return;
            const cards = Array.from(picker.querySelectorAll('.doc-card'));

            const refreshSelected = () => {
                cards.forEach(card => {
                    const radio = card.querySelector('input[type="radio"]');
                    card.classList.toggle('selected', !!(radio && radio.checked));
                });
            };

            cards.forEach(card => {
                const radio = card.querySelector('input[type="radio"]');
                if (!radio) return;
                if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '0');

                radio.addEventListener('change', () => {
                    refreshSelected();
                    if (typeof window.__refreshSlotsForDoctor === 'function') window.__refreshSlotsForDoctor();
                });
                card.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        radio.checked = true;
                        radio.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
            });

            picker.addEventListener('change', refreshSelected);

            const parentForm = picker.closest('form');
            if (parentForm) {
                parentForm.addEventListener('reset', () => {
                    setTimeout(refreshSelected, 0);
                });
            }

            refreshSelected();
        })();

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // Basic client-side validation fallback 
            if (!data.name || !data.dob || !data.doctor || !data.date || !data.time) {
                alert('Please complete all required fields.');
                return;
            }

            try {
                // Disable button during submit
                const submitBtn = document.getElementById('book-submit');
                if (submitBtn) submitBtn.disabled = true;
                const response = await fetch('/submit-appointment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                // If no backend exists yet, treat non-OK as success in demo mode
                if (!response.ok) {
                    console.warn('No backend connected; simulating success.');
                    
                    // Save booking to localStorage
                    if (window.__addBooking) {
                        window.__addBooking(data.doctor, data.date, data.time);
                    }
                    
                    triggerStarFireworks();
                    alert('Appointment booked successfully!');
                    form.reset();
                    // Reset any dynamic UI states
                    if (typeof window.__refreshSlotsForDoctor === 'function') window.__refreshSlotsForDoctor();
                    if (submitBtn) submitBtn.disabled = false;
                    return;
                }

                const result = await response.json().catch(() => ({}));
                
                // Save booking to localStorage on successful backend response too
                if (window.__addBooking) {
                    window.__addBooking(data.doctor, data.date, data.time);
                }
                
                triggerStarFireworks();
                alert('Appointment booked successfully!');
                form.reset();
                console.log('Booking result:', result);
                if (submitBtn) submitBtn.disabled = false;
            } catch (error) {
                console.error('Error:', error);
                alert('There was an error booking your appointment. Please try again.');
                const submitBtn = document.getElementById('book-submit');
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // Dyslexia font toggle (persistent across pages)
    const dysToggle = document.getElementById('dyslexia-toggle');
    const applyDysSetting = (enabled) => {
        const isEnabled = Boolean(enabled);
        document.body.classList.toggle('dyslexia-font', isEnabled);
        if (dysToggle) dysToggle.setAttribute('aria-pressed', String(isEnabled));
        // Persist setting
        try { localStorage.setItem('dyslexiaEnabled', isEnabled ? '1' : '0'); } catch {}
    };
    // Initialize from storage
    try {
        const saved = localStorage.getItem('dyslexiaEnabled');
        applyDysSetting(saved === '1');
    } catch {
        applyDysSetting(false);
    }
    if (dysToggle) {
        dysToggle.addEventListener('click', () => {
            const enabled = !document.body.classList.contains('dyslexia-font');
            console.log('Dyslexia button clicked. Will set dyslexia-font:', enabled);
            applyDysSetting(enabled);
        });
    }

    // Breadcrumbs
    (function renderBreadcrumbs() {
        const container = document.querySelector('.breadcrumbs');
        if (!container) return;

        const file = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
        const trail = [{ name: 'Home', url: 'index.html' }];

        // Page-specific mapping
        const pageMap = {
            'index.html': [],
            'doctors.html': [{ name: 'Doctors' }],
            'departments.html': [{ name: 'Departments' }],
            'booking.html': [{ name: 'Book Visit' }],
            'contact.html': [{ name: 'Contact' }],
            'search.html': [{ name: 'Search' }],
            'search-results.html': [{ name: 'Search' }, { name: 'Results' }],
            'doctor-detail.html': [{ name: 'Doctors', url: 'doctors.html' }, { name: 'Captain Care' }],
            'detail_captaincare.html': [{ name: 'Doctors', url: 'doctors.html' }, { name: 'Captain Care' }],
            'detail_ironbone.html': [{ name: 'Doctors', url: 'doctors.html' }, { name: 'Iron Bones' }],
            'detail_hearthero.html': [{ name: 'Doctors', url: 'doctors.html' }, { name: 'Heart Hero' }],
            'detail_starhealer.html': [{ name: 'Doctors', url: 'doctors.html' }, { name: 'Star Healer' }]
        };

        const additions = pageMap[file] ?? [{ name: (document.title || '').replace(/\s+—.*/, '') || 'Current' }];
        trail.push(...additions);

        // Build markup
        const ol = document.createElement('ol');
        trail.forEach((item, idx) => {
            if (idx > 0) {
                const sep = document.createElement('li');
                sep.className = 'sep';
                sep.textContent = '›';
                ol.appendChild(sep);
            }
            const li = document.createElement('li');
            if (item.url && idx !== trail.length - 1) {
                const a = document.createElement('a');
                a.href = item.url;
                a.textContent = item.name;
                li.appendChild(a);
            } else if (idx === trail.length - 1) {
                const span = document.createElement('span');
                span.className = 'current';
                span.textContent = item.name;
                li.appendChild(span);
            } else {
                li.textContent = item.name;
            }
            ol.appendChild(li);
        });

        container.setAttribute('aria-label', 'Breadcrumb');
        container.innerHTML = '';
        container.appendChild(ol);
    })();

    // Air quality widget
    (function initAirQualityCard() {
        const summary = document.getElementById('aq-summary');
        const details = document.getElementById('aq-details');
        const refreshBtn = document.getElementById('aq-refresh');
        const updatedStamp = document.getElementById('aq-updated');
        if (!summary || !details || !refreshBtn) return;

        const DEFAULT_LOCATION = {
            label: 'Prague, CZ',
            latitude: 50.0755,
            longitude: 14.4378
        };

        const STATUS_LEVELS = [
            { max: 12, status: 'Good', color: 'green', kidMsg: "Captain Care says: great day to play outside!" },
            { max: 35.4, status: 'Moderate', color: 'yellow', kidMsg: 'Captain Care says: kiddos with asthma should take it easy.' },
            { max: 55.4, status: 'Unhealthy for Sensitive Groups', color: 'orange', kidMsg: 'Captain Care says: if you have breathing troubles, play indoors today.' },
            { max: 150.4, status: 'Unhealthy', color: 'red', kidMsg: 'Captain Care says: the air is rough today—indoor adventures only.' },
            { max: 250.4, status: 'Very Unhealthy', color: 'purple', kidMsg: 'Captain Care says: best to stay inside with filtered air if you can.' },
            { max: Infinity, status: 'Hazardous', color: 'maroon', kidMsg: 'Captain Care says: stay indoors and keep windows closed!' }
        ];

        const setUpdatedStamp = (text) => {
            if (updatedStamp) {
                updatedStamp.textContent = text;
            }
        };

        const setLoadingState = (isLoading) => {
            summary.setAttribute('aria-busy', String(isLoading));
            refreshBtn.disabled = isLoading;
            refreshBtn.classList.toggle('is-loading', isLoading);
        };

        const renderError = (msg) => {
            summary.innerHTML = `<span class="aq-error">⚠️ ${msg}</span>`;
            details.classList.add('hidden');
            details.innerHTML = '';
            setUpdatedStamp('Last updated: —');
        };

        const describePm25 = (value) => {
            if (value == null || Number.isNaN(value)) {
                return { status: 'Info', color: 'gray', kidMsg: 'Captain Care says: no fresh data right now—check back soon!' };
            }
            const record = STATUS_LEVELS.find(level => value <= level.max) ?? STATUS_LEVELS[STATUS_LEVELS.length - 1];
            return record;
        };

        const formatMetricValue = (rawValue, rawUnit) => {
            const value = Number(rawValue);
            const unit = rawUnit ? ` ${rawUnit}` : '';
            if (Number.isFinite(value)) {
                const precision = Math.abs(value) < 10 ? 1 : 0;
                return `${value.toFixed(precision)}${unit}`.trim();
            }
            if (rawValue == null || rawValue === '') return '—';
            return `${rawValue}${unit}`.trim();
        };

        const fetchAndRender = async () => {
            setLoadingState(true);
            summary.innerHTML = '<span class="aq-loading">Loading...</span>';
            details.classList.add('hidden');
            details.innerHTML = '';
            setUpdatedStamp('Last updated: —');
            try {
                const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${DEFAULT_LOCATION.latitude}&longitude=${DEFAULT_LOCATION.longitude}&hourly=pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi`;
                const response = await fetch(aqUrl, { cache: 'no-store' });
                if (!response.ok) throw new Error(`Air quality request failed with status ${response.status}`);

                const data = await response.json();
                const times = data?.hourly?.time;
                if (!Array.isArray(times) || times.length === 0) {
                    renderError('No air quality timeline available for Prague.');
                    return;
                }

                const now = Date.now();
                let idx = times.length - 1;
                for (let i = times.length - 1; i >= 0; i -= 1) {
                    const candidate = new Date(times[i]);
                    if (!Number.isNaN(candidate.getTime()) && candidate.getTime() <= now) {
                        idx = i;
                        break;
                    }
                }

                const observationTime = times[idx];
                const parsedTime = new Date(observationTime);
                const formattedTime = Number.isNaN(parsedTime.getTime())
                    ? 'Just updated'
                    : parsedTime.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
                const pm25Value = Number(data?.hourly?.pm2_5?.[idx]);
                const { status, color, kidMsg } = describePm25(pm25Value);
                const units = data?.hourly_units ?? {};

                const decorativeBadge = {
                    green: '🟢',
                    yellow: '🟡',
                    orange: '🟠',
                    red: '🔴',
                    purple: '🟣',
                    maroon: '🛑',
                    gray: '⚪'
                }[color] ?? '🟦';

                summary.innerHTML = `
                    <div class="aq-status-block">
                        <span class="aq-status-icon" aria-hidden="true">${decorativeBadge}</span>
                        <div class="aq-status-text">
                            <span class="aq-status-label aq-status--${color}">${status}</span>
                            <span class="aq-status-time">${formattedTime}</span>
                        </div>
                    </div>
                    <span class="aq-kidmsg">${kidMsg}</span>
                `;

                const metrics = [
                    { key: 'us_aqi', label: 'US AQI' },
                    { key: 'pm2_5', label: 'PM2.5' },
                    { key: 'pm10', label: 'PM10' },
                    { key: 'ozone', label: 'Ozone' },
                    { key: 'nitrogen_dioxide', label: 'NO2' },
                    { key: 'sulphur_dioxide', label: 'SO2' },
                    { key: 'carbon_monoxide', label: 'CO' }
                ];

                const detailRows = [
                    `<div class="aq-detail-item"><span class="aq-param">Location</span><span class="aq-value">${DEFAULT_LOCATION.label}</span></div>`
                ];

                metrics.forEach(metric => {
                    const series = data?.hourly?.[metric.key];
                    if (!Array.isArray(series)) return;
                    const rawValue = series[idx];
                    const formatted = formatMetricValue(rawValue, units[metric.key]);
                    if (formatted === '—') return;
                    detailRows.push(`<div class="aq-detail-item"><span class="aq-param">${metric.label}</span><span class="aq-value">${formatted}</span></div>`);
                });

                detailRows.push(`<div class="aq-detail-item aq-detail-item--timestamp"><span class="aq-param">Updated</span><span class="aq-value">${formattedTime}</span></div>`);

                details.innerHTML = detailRows.join('');
                details.classList.remove('hidden');
                setUpdatedStamp(`Last updated: ${formattedTime}`);
            } catch (error) {
                console.error('Error fetching air quality data:', error);
                const message = error instanceof Error ? error.message : 'Error loading air quality data.';
                renderError(message);
            } finally {
                setLoadingState(false);
            }
        };

        refreshBtn.addEventListener('click', fetchAndRender);

        // Initial load for Prague
        fetchAndRender();
    })();

    // Search functionality
    const headerSearchInput = document.getElementById('search-input');
    const headerSearchBtn = document.getElementById('search-btn');
    const headerSearchSection = document.getElementById('search-section');
    const headerSearchForm = headerSearchSection ? headerSearchSection.querySelector('form') : null;
    const headerSearchResult = document.getElementById('search-results');
    const pageSearchInput = document.getElementById('search-page-input');
    const pageSearchBtn = document.getElementById('search-page-btn');
    const pageSearchResult = document.getElementById('search-page-results');
    const pageSearchForm = document.getElementById('search-page-form');
    const searchResultsCount = document.querySelector('[data-search-count]');
    const searchClearBtn = document.querySelector('[data-search-clear]');
    const searchChips = Array.from(document.querySelectorAll('.search-chip'));

    const SEARCH_INDEX_FALLBACK = [
        { type: 'page', name: 'Home', url: 'index.html', description: 'Start at the Starlight hub with hero news and featured care.' },
        { type: 'page', name: 'Doctors (Overview)', url: 'doctors.html', description: 'Browse every specialist and find the hero for your child.' },
        { type: 'page', name: 'Departments', url: 'departments.html', description: 'Explore every service wing and their signature programs.' },
        { type: 'page', name: 'Book Visit', url: 'booking.html', description: 'Schedule a visit with the right doctor and time slot.' },
        { type: 'page', name: 'Contact', url: 'contact.html', description: 'Reach our support team, hotline, or find directions.' },
        { type: 'doctor', name: 'Captain Care', specialty: 'Pediatrics', url: 'detail_CaptainCare.html', description: 'Playful pediatrician leading routine checkups and resilience coaching.' },
        { type: 'doctor', name: 'Heart Hero', specialty: 'Cardiology', url: 'detail_HeartHero.html', description: 'Cardiology guardian focusing on heart health and recovery journeys.' },
        { type: 'doctor', name: 'Iron Bones', specialty: 'Orthopedics', url: 'detail_IronBone.html', description: 'Orthopedics strategist guiding mobility boosts and healing missions.' },
        { type: 'doctor', name: 'Star Healer', specialty: 'Oncology', url: 'detail_StarHealer.html', description: 'Oncology mentor championing personalized treatments and family support.' },
        { type: 'department', name: 'Pediatrics', url: 'doctors.html?department=pediatrics', description: 'Primary care, growth tracking, and wellness coaching.' },
        { type: 'department', name: 'Orthopedics', url: 'doctors.html?department=orthopedics', description: 'Mobility labs, sports injury care, and strength coaching.' },
        { type: 'department', name: 'Cardiology', url: 'doctors.html?department=cardiology', description: 'Heart health diagnostics, monitoring, and recovery paths.' },
        { type: 'department', name: 'Oncology', url: 'doctors.html?department=oncology', description: 'Compassionate cancer care with child-life support.' }
    ];

    if (headerSearchSection && headerSearchBtn && headerSearchInput) {
        const mobileSearchQuery = window.matchMedia('(max-width: 900px)');

        const updateSearchVisibility = (event) => {
            const isMobile = event ? event.matches : mobileSearchQuery.matches;
            if (isMobile) {
                headerSearchSection.classList.add('is-collapsed');
                headerSearchBtn.setAttribute('aria-expanded', 'false');
            } else {
                headerSearchSection.classList.remove('is-collapsed');
                headerSearchBtn.setAttribute('aria-expanded', 'true');
            }
        };

        updateSearchVisibility();

        if (typeof mobileSearchQuery.addEventListener === 'function') {
            mobileSearchQuery.addEventListener('change', updateSearchVisibility);
        } else if (typeof mobileSearchQuery.addListener === 'function') {
            mobileSearchQuery.addListener(updateSearchVisibility);
        }

        const runHeaderSearch = () => {
            goToSearchResults(headerSearchInput.value);
        };

        const expandHeaderSearch = () => {
            headerSearchSection.classList.remove('is-collapsed');
            headerSearchBtn.setAttribute('aria-expanded', 'true');
            headerSearchInput.focus();
        };

        const collapseHeaderSearch = () => {
            if (!mobileSearchQuery.matches) return;
            if (headerSearchSection.classList.contains('is-collapsed')) return;
            if (headerSearchInput.value) return;
            headerSearchSection.classList.add('is-collapsed');
            headerSearchBtn.setAttribute('aria-expanded', 'false');
        };

        headerSearchBtn.addEventListener('click', (event) => {
            event.preventDefault();
            if (headerSearchSection.classList.contains('is-collapsed')) {
                expandHeaderSearch();
                return;
            }
            runHeaderSearch();
        });

        headerSearchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                collapseHeaderSearch();
                headerSearchInput.blur();
                return;
            }
            if (event.key === 'Enter') {
                event.preventDefault();
                runHeaderSearch();
            }
        });

        if (headerSearchForm) {
            headerSearchForm.addEventListener('submit', (event) => {
                event.preventDefault();
                if (headerSearchSection.classList.contains('is-collapsed')) {
                    expandHeaderSearch();
                    return;
                }
                runHeaderSearch();
            });
        }

        headerSearchInput.addEventListener('blur', () => {
            setTimeout(() => {
                collapseHeaderSearch();
            }, 120);
        });

        document.addEventListener('click', (event) => {
            if (!headerSearchSection.contains(event.target) && !headerSearchInput.value) {
                collapseHeaderSearch();
            }
        });
    }

    const searchInput = pageSearchInput || headerSearchInput;
    const searchBtn = pageSearchBtn || headerSearchBtn;
    const searchResult = pageSearchResult || headerSearchResult;

    const fileName = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const isSearchPage = fileName === 'search.html' || fileName === 'search-results.html';
    
        const goToSearchResults = (value) => {
            const trimmed = (value ?? '').trim();
            if (!trimmed) return;
            window.location.assign(`search.html?q=${encodeURIComponent(trimmed)}`);
        };

        function initMobileSearchOverlay() {
            if (!headerSearchBtn) return;
            if (document.querySelector('.mobile-search-fab')) return;

            const fab = document.createElement('button');
            fab.type = 'button';
            fab.className = 'mobile-search-fab';
            fab.setAttribute('aria-label', 'Open search');
            fab.innerHTML = '<span aria-hidden="true">🔍</span>';

            const panel = document.createElement('div');
            panel.className = 'mobile-search-panel';
            const mobileInputId = 'mobile-search-input';
            panel.innerHTML = `
                <form class="mobile-search-form" action="search.html" method="get" role="search" novalidate>
                    <div class="mobile-search-panel__header">
                        <h2 class="mobile-search-panel__title">Search</h2>
                        <button type="button" class="mobile-search-dismiss" aria-label="Close search">Close</button>
                    </div>
                    <label class="mobile-search-label" for="${mobileInputId}">Search doctors or departments</label>
                    <div class="mobile-search-controls">
                        <input id="${mobileInputId}" name="q" type="search" autocomplete="off" placeholder="Type to search" />
                        <button type="submit" class="mobile-search-submit">Search</button>
                    </div>
                </form>
            `;

            const form = panel.querySelector('.mobile-search-form');
            const mobileInput = panel.querySelector(`#${mobileInputId}`);
            const dismissBtn = panel.querySelector('.mobile-search-dismiss');

            const openPanel = () => {
                if (window.innerWidth > 900) return;
                panel.classList.add('is-open');
                document.body.classList.add('search-panel-open');
                const existingValue = (searchInput?.value ?? headerSearchInput?.value ?? '');
                if (existingValue) mobileInput.value = existingValue;
                setTimeout(() => mobileInput.focus(), 80);
            };

            const closePanel = () => {
                panel.classList.remove('is-open');
                document.body.classList.remove('search-panel-open');
            };

            fab.addEventListener('click', openPanel);
            dismissBtn?.addEventListener('click', () => {
                closePanel();
            });

            form?.addEventListener('submit', (event) => {
                event.preventDefault();
                const value = (mobileInput.value || '').trim();
                if (!value) {
                    mobileInput.focus();
                    return;
                }
                goToSearchResults(value);
                closePanel();
            });

            panel.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    closePanel();
                }
            });

            document.addEventListener('click', (event) => {
                if (window.innerWidth > 900) return;
                if (!panel.classList.contains('is-open')) return;
                if (panel.contains(event.target) || fab.contains(event.target)) return;
                closePanel();
            });

            window.addEventListener('resize', () => {
                if (window.innerWidth > 900) closePanel();
            });

            document.body.appendChild(panel);
            document.body.appendChild(fab);
        }

        initMobileSearchOverlay();

    // If neither input nor results are on the page, skip search setup entirely
    if (!searchInput && !searchResult) return;

    let searchData = [];
    let searchDataLoaded = false;
    let queuedSearchQuery = null;

    const setActiveChip = (value) => {
        if (!searchChips.length) return;
        const normalized = (value || '').toLowerCase();
        searchChips.forEach(chip => {
            const chipValue = (chip.dataset.searchValue || chip.textContent || '').toLowerCase();
            chip.classList.toggle('is-active', normalized !== '' && chipValue === normalized);
        });
    };

    const updateResultsMeta = (displayQuery, totalResults) => {
        if (!searchResultsCount) return;
        const hasQuery = !!displayQuery;
        if (!hasQuery) {
            searchResultsCount.textContent = searchDataLoaded
                ? 'Start typing to explore our care network.'
                : 'Preparing search tools...';
            if (searchClearBtn) searchClearBtn.classList.remove('is-visible');
            return;
        }

        if (!searchDataLoaded) {
            searchResultsCount.textContent = `Searching for "${displayQuery}"...`;
            if (searchClearBtn) searchClearBtn.classList.add('is-visible');
            return;
        }

        if (totalResults > 0) {
            const plural = totalResults === 1 ? 'match' : 'matches';
            searchResultsCount.textContent = `Found ${totalResults} ${plural} for "${displayQuery}".`;
        } else {
            searchResultsCount.textContent = `No matches for "${displayQuery}".`;
        }

        if (searchClearBtn) searchClearBtn.classList.add('is-visible');
    };

    // For non-search pages, just wire the redirect and skip fetching data
    if (!isSearchPage) {
        if (
            searchBtn &&
            searchInput &&
            !(headerSearchInput && headerSearchBtn && searchInput === headerSearchInput && searchBtn === headerSearchBtn)
        ) {
            searchBtn.addEventListener('click', (event) => {
                event.preventDefault();
                if (searchInput) goToSearchResults(searchInput.value);
            });

            searchInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    goToSearchResults(searchInput.value);
                }
            });
        }
        return;
    }

    if (searchClearBtn) {
        searchClearBtn.addEventListener('click', (event) => {
            event.preventDefault();
            if (searchInput) {
                searchInput.value = '';
            }
            setActiveChip('');
            updateResultsMeta('', 0);
            performSearch('');
        });
    }

    if (searchChips.length) {
        searchChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const value = chip.dataset.searchValue || chip.textContent || '';
                if (!value) return;
                if (searchInput) {
                    searchInput.value = value;
                }
                setActiveChip(value);
                performSearch(value);
                if (searchInput) searchInput.focus();
            });
        });
    }

    // On search pages, load JSON index once, with fallback
    const loadSearchData = async () => {
        const tryLoad = async (url) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
            return res.json();
        };

        let data = null;
        try {
            const primary = await tryLoad('data/search-index.json');
            if (Array.isArray(primary) && primary.length > 0) {
                data = primary;
            } else {
                const legacy = await tryLoad('data/search.json');
                if (Array.isArray(legacy) && legacy.length > 0) data = legacy;
            }
        } catch (err) {
            console.error('Error loading search data (with fallback):', err);
        }

        if (Array.isArray(data) && data.length > 0) {
            searchData = data;
        } else if (SEARCH_INDEX_FALLBACK.length > 0) {
            searchData = SEARCH_INDEX_FALLBACK.slice();
            console.info('Search index loaded from bundled fallback.');
        } else {
            searchData = [];
        }

        searchDataLoaded = true;

        // If there's a query param and we have a results container, auto-run
        const params = new URLSearchParams(window.location.search);
        const qParam = (params.get('q') || '').trim();
        const initialQuery = queuedSearchQuery && queuedSearchQuery.trim()
            ? queuedSearchQuery.trim()
            : qParam;
        queuedSearchQuery = null;

        if (initialQuery && searchResult) {
            performSearch(initialQuery);
            if (searchInput) searchInput.value = initialQuery;
        } else if (searchResult && searchData.length === 0) {
            const errorState = document.createElement('div');
            errorState.className = 'search-state search-state--error';
            const titleEl = document.createElement('p');
            titleEl.className = 'search-state__title';
            titleEl.textContent = 'Search is temporarily unavailable.';
            const detailEl = document.createElement('p');
            detailEl.className = 'search-state__detail';
            detailEl.textContent = 'Please try again later or contact support.';
            errorState.appendChild(titleEl);
            errorState.appendChild(detailEl);
            searchResult.innerHTML = '';
            searchResult.appendChild(errorState);
            if (searchResultsCount) searchResultsCount.textContent = 'Search is temporarily unavailable.';
        } else if (searchResult) {
            performSearch('');
        }
    };
    loadSearchData();

    function performSearch(queryFromParam) {
        const rawFromParam = typeof queryFromParam === 'string' ? queryFromParam : undefined;
        const rawInput = searchInput ? searchInput.value : '';
        const raw = rawFromParam != null ? rawFromParam : rawInput;
        const trimmed = raw.trim();
        const query = trimmed.toLowerCase();
        if (!searchResult) return; // Nowhere to render
        searchResult.innerHTML = '';
        searchResult.classList.remove('search-has-results');
        setActiveChip(trimmed);

        const renderState = (title, detail, modifier = '') => {
            const wrapper = document.createElement('div');
            wrapper.className = `search-state${modifier ? ' ' + modifier : ''}`.trim();
            if (title) {
                const titleEl = document.createElement('p');
                titleEl.className = 'search-state__title';
                titleEl.textContent = title;
                wrapper.appendChild(titleEl);
            }
            if (detail) {
                const detailEl = document.createElement('p');
                detailEl.className = 'search-state__detail';
                detailEl.textContent = detail;
                wrapper.appendChild(detailEl);
            }
            searchResult.appendChild(wrapper);
            return wrapper;
        };

        if (!searchDataLoaded) {
            if (trimmed) {
                queuedSearchQuery = trimmed;
                renderState('Searching...', 'Hang tight while we load our hero directory.', 'search-state--loading');
                updateResultsMeta(trimmed, 0);
            } else {
                renderState('Loading search...', 'Results will appear once everything is ready.');
                updateResultsMeta('', 0);
            }
            return;
        }

        if (!query) {
            renderState('Start typing to search.', 'We will surface doctors, departments, and services that match.');
            updateResultsMeta('', 0);
            return;
        }

        // Filter items that include the query in name, specialty, or type
        const results = searchData.filter(item =>
            item.name?.toLowerCase().includes(query) ||
            item.specialty?.toLowerCase().includes(query) ||
            item.type?.toLowerCase().includes(query)
        );

        if (results.length === 0) {
            // Suggest similar items if no exact match
            const first = query.charAt(0);
            const suggestions = searchData.filter(item =>
                item.name?.toLowerCase().includes(first) ||
                item.specialty?.toLowerCase().includes(first)
            );
            if (suggestions.length > 0) {
                const suggestionBlock = renderState('No exact matches found.', 'Here are a few similar results you might like.', 'search-state--suggestions');
                const list = document.createElement('ul');
                list.className = 'search-suggestions';
                suggestions.forEach(item => {
                    const li = document.createElement('li');
                    const link = document.createElement('a');
                    link.href = item.url;
                    link.textContent = item.name;
                    li.appendChild(link);
                    const meta = item.specialty || item.type;
                    if (meta) {
                        const metaSpan = document.createElement('span');
                        metaSpan.className = 'search-suggestion__meta';
                        metaSpan.textContent = meta;
                        li.appendChild(metaSpan);
                    }
                    list.appendChild(li);
                });
                suggestionBlock.appendChild(list);
            } else {
                renderState('No results found.', 'Try adjusting your spelling or searching for a broader term.');
            }
            updateResultsMeta(trimmed, 0);
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'search-results-grid';
        searchResult.appendChild(grid);

        results.forEach(item => {
            const card = document.createElement('article');
            card.className = 'search-card';

            const titleLink = document.createElement('a');
            titleLink.href = item.url;
            titleLink.className = 'search-card__title';
            titleLink.textContent = item.name;
            card.appendChild(titleLink);

            const metaText = item.specialty || item.type;
            if (metaText) {
                const meta = document.createElement('span');
                meta.className = 'search-card__meta';
                meta.textContent = metaText;
                card.appendChild(meta);
            }

            const description = item.description || item.summary;
            if (description) {
                const excerpt = document.createElement('p');
                excerpt.className = 'search-card__excerpt';
                excerpt.textContent = description;
                card.appendChild(excerpt);
            }

            grid.appendChild(card);
        });

        searchResult.classList.add('search-has-results');
        updateResultsMeta(trimmed, results.length);
    }
    // On search pages, typing Enter or clicking Search should (re)render results inline
    if (isSearchPage) {
        const triggerSearch = () => performSearch();
        if (pageSearchForm) {
            pageSearchForm.addEventListener('submit', (event) => {
                event.preventDefault();
                triggerSearch();
            });
        }
        if (searchBtn && searchBtn !== headerSearchBtn) {
            searchBtn.addEventListener('click', (event) => {
                event.preventDefault();
                triggerSearch();
            });
        }
        if (searchInput) {
            searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                triggerSearch();
            }
            });
        }
    }
});

// Simple star fireworks animation
function triggerStarFireworks() {
    const container = document.getElementById('star-fireworks');
    if (!container) return;
    // Clear any existing nodes
    container.innerHTML = '';

    const bursts = 26; // number of main stars
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 3; // a bit higher than center
    for (let i = 0; i < bursts; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const angle = (Math.PI * 2 * i) / bursts + (Math.random() * 0.4 - 0.2);
        const distance = 160 + Math.random() * 160;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        const size = 14 + Math.random() * 12;
        const startLeft = centerX - size / 2;
        const startTop = centerY - size / 2;
        star.style.left = startLeft + 'px';
        star.style.top = startTop + 'px';
        star.style.setProperty('--tx', tx + 'px');
        star.style.setProperty('--ty', ty + 'px');
        star.style.setProperty('--size', size + 'px');
        container.appendChild(star);
        star.addEventListener('animationend', () => star.remove());

        // Sparks around star origin
        const sparkCount = 6 + Math.floor(Math.random() * 4);
        for (let s = 0; s < sparkCount; s++) {
            const spark = document.createElement('div');
            spark.className = 'spark';
            const sa = Math.random() * Math.PI * 2;
            const sd = 30 + Math.random() * 40;
            const sx = Math.cos(sa) * sd;
            const sy = Math.sin(sa) * sd;
            spark.style.left = (centerX - 3) + 'px';
            spark.style.top = (centerY - 3) + 'px';
            spark.style.setProperty('--sx', sx + 'px');
            spark.style.setProperty('--sy', sy + 'px');
            container.appendChild(spark);
            spark.addEventListener('animationend', () => spark.remove());
        }
    }
}



