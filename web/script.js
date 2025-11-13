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
    const mainNav = document.querySelector('.main-nav');
    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', () => {
            const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
            menuToggle.setAttribute('aria-expanded', String(!expanded));
            mainNav.classList.toggle('active');
        });
    }

    // Mobile submenu toggle for link-based navigation
    document.querySelectorAll('.has-submenu > .nav-link').forEach(link => {
        const parent = link.closest('.has-submenu');
        const submenu = parent?.querySelector('.submenu');
        if (!submenu) return;
        
        // Add click handler for mobile
        link.addEventListener('click', (e) => {
            // Only prevent default on mobile
            if (window.matchMedia('(max-width: 768px)').matches) {
                e.preventDefault();
                parent.classList.toggle('active');
            }
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
            const weekdays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
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
            const doctorInput = document.getElementById('doctor');

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
                const startWeekday = (firstDay.getDay() + 6) % 7;
                const daysInMonth = new Date(year, month+1, 0).getDate();

                // Leading blanks
                for (let i=0; i<startWeekday; i++) {
                    const blank = document.createElement('div');
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
                    
                    // Check if selected doctor has availability on this day
                    const doctorKey = doctorInput?.value || '';
                    const hasAvailability = doctorKey && schedules[doctorKey] && schedules[doctorKey][dayOfWeek] && schedules[doctorKey][dayOfWeek].length > 0;
                    
                    if (isPast || isWeekend) {
                        btn.disabled = true;
                        if (isWeekend) btn.title = 'Weekends not available';
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
                info.style.gridColumn = '1 / -1';
                if (!selectedDate) {
                    info.textContent = 'Pick a date to see available times.';
                    slotsWrap.appendChild(info);
                    return;
                }

                const dateStr = fmtDateISO(selectedDate);
                // Block weekends entirely
                const dow = selectedDate.getDay(); // 0=Sun..6=Sat
                const isWeekend = [0,6].includes(dow);
                let slots = [];
                if (!isWeekend) {
                    const key = doctorInput?.value || '';
                    const docSched = schedules[key];
                    slots = docSched?.[dow] || []; // if no specific schedule that weekday, no slots
                }
                if (slots.length === 0) {
                    info.textContent = 'No times available for this date.';
                    slotsWrap.appendChild(info);
                    return;
                }

                // Get booked slots from localStorage
                const bookedSlots = window.__getBookedSlots ? window.__getBookedSlots(doctorInput?.value || '', dateStr) : [];

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
                selectedTime = null;
                if (timeInput) timeInput.value = '';
                updateSlots();
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
            const hiddenInput = document.getElementById('doctor');
            if (!picker || !hiddenInput) return;
            const cards = Array.from(picker.querySelectorAll('.doc-card'));

            function setActive(value) {
                cards.forEach(c => {
                    const match = c.getAttribute('data-value') === value;
                    c.classList.toggle('selected', match);
                    const radio = c.querySelector('input[type="radio"]');
                    if (radio) radio.checked = match;
                });
                if (hiddenInput.value !== value) {
                    hiddenInput.value = value;
                    if (typeof window.__refreshSlotsForDoctor === 'function') window.__refreshSlotsForDoctor();
                }
            }

            cards.forEach(card => {
                card.addEventListener('click', () => {
                    const val = card.getAttribute('data-value');
                    if (val) setActive(val);
                });
                card.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        const val = card.getAttribute('data-value');
                        if (val) setActive(val);
                    }
                });
            });

            // If a value was pre-filled (unlikely), reflect it
            if (hiddenInput.value) setActive(hiddenInput.value);
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
        document.body.classList.toggle('dyslexia-font', enabled);
        if (dysToggle) dysToggle.setAttribute('aria-pressed', String(enabled));
        // Persist setting
        try { localStorage.setItem('dyslexiaEnabled', enabled ? '1' : '0'); } catch {}
    };
    // Initialize from storage
    try {
        const saved = localStorage.getItem('dyslexiaEnabled');
        if (saved === '1') applyDysSetting(true);
    } catch {}
    if (dysToggle) {
        dysToggle.addEventListener('click', () => {
            const enabled = !document.body.classList.contains('dyslexia-font');
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

    // Search functionality
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const searchResult = document.getElementById('search-results');
    const fileName = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const isSearchPage = fileName === 'search.html' || fileName === 'search-results.html';

    // If neither input nor results are on the page, skip search setup entirely
    if (!searchInput && !searchResult) return;

    let searchData = [];

    // For non-search pages, just wire the redirect and skip fetching data
    if (!isSearchPage) {
        // Event listeners for redirect (if elements present)
        if (searchBtn && searchInput) {
            const redirectToResults = () => {
                const q = (searchInput.value || '').trim();
                if (!q) return;
                window.location.href = `search.html?q=${encodeURIComponent(q)}`;
            };
            searchBtn.addEventListener('click', redirectToResults);
            searchInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    redirectToResults();
                }
            });
        }
        // Do not fetch or show errors in headers
        return;
    }

    // On search pages, load JSON index once, with fallback
    const loadSearchData = async () => {
        const tryLoad = async (url) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
            return res.json();
        };
        try {
            let data = await tryLoad('data/search-index.json');
            if (!Array.isArray(data) || data.length === 0) {
                // Fallback to legacy search.json
                data = await tryLoad('data/search.json');
            }
            searchData = Array.isArray(data) ? data : [];
        } catch (err) {
            console.error('Error loading search data (with fallback):', err);
            searchData = [];
        }

        // If there's a query param (?q=...) and we have a results container, auto-run
        const params = new URLSearchParams(window.location.search);
        const qParam = params.get('q');
        if (qParam && searchResult) {
            performSearch(qParam);
            if (searchInput) searchInput.value = qParam;
        } else if (searchResult && searchData.length === 0) {
            searchResult.innerHTML = '<p>Could not load search data.</p>';
        }
    };
    loadSearchData();

    function performSearch(queryFromParam) {
        const query = (queryFromParam ?? (searchInput ? searchInput.value : '')).toLowerCase().trim();
        if (!searchResult) return; // Nowhere to render
        searchResult.innerHTML = '';
        if (!query) {
            searchResult.innerHTML = '<p>Please enter a search term.</p>';
            return;
        }

        // Filter items that include the query in name or specialty
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
                const p = document.createElement('p');
                p.textContent = 'No exact matches found. Did you mean:';
                searchResult.appendChild(p);
                suggestions.forEach(item => {
                    const div = document.createElement('div');
                    div.innerHTML = `<a href="${item.url}">${item.name}</a> - ${item.specialty || item.type || ''}`;
                    searchResult.appendChild(div);
                });
            } else {
                searchResult.innerHTML = '<p>No results found.</p>';
            }
            return;
        }

        // Display filtered results (internal links only)
        results.forEach(item => {
            const div = document.createElement('div');
            const subtitle = item.specialty ? ` — ${item.specialty}` : item.type ? ` — ${item.type}` : '';
            const a = document.createElement('a');
            a.href = item.url;
            a.textContent = item.name;
            const span = document.createElement('span');
            span.textContent = subtitle;
            div.appendChild(a);
            div.appendChild(span);
            searchResult.appendChild(div);
        });
    }

    // On search pages, typing Enter or clicking Search should (re)render results inline
    if (searchBtn && searchInput && isSearchPage) {
        const triggerSearch = () => performSearch();
        searchBtn.addEventListener('click', triggerSearch);
        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                triggerSearch();
            }
        });
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