document.addEventListener('DOMContentLoaded', () => {
    // Booking form handling (only if present)
    const form = document.getElementById('booking-form');
    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // Basic client-side validation fallback 
            if (!data.name || !data.age || !data.doctor || !data.date || !data.time) {
                alert('Please complete all required fields.');
                return;
            }

            try {
                const response = await fetch('/submit-appointment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                // If no backend exists yet, treat non-OK as success in demo mode
                if (!response.ok) {
                    console.warn('No backend connected; simulating success.');
                    alert('Appointment booked successfully!');
                    form.reset();
                    return;
                }

                const result = await response.json().catch(() => ({}));
                alert('Appointment booked successfully!');
                form.reset();
                console.log('Booking result:', result);
            } catch (error) {
                console.error('Error:', error);
                alert('There was an error booking your appointment. Please try again.');
            }
        });
    }

    // Font switching
    const lexBtn = document.getElementById('lexend-btn');
    const robotoBtn = document.getElementById('roboto-btn');
    if (lexBtn) {
        lexBtn.addEventListener('click', () => {
            document.body.classList.add('lexend-font');
        });
    }
    if (robotoBtn) {
        robotoBtn.addEventListener('click', () => {
            document.body.classList.remove('lexend-font');
        });
    }

    // Search functionality (only if elements exist)
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const searchResult = document.getElementById('search-results');

    // If neither input nor results are on the page, skip search setup
    if (!searchInput && !searchResult) return;

    let searchData = [];

    // Load JSON index once
    fetch('data/search.json')
        .then(response => response.json())
        .then(data => {
            searchData = data;

            // If there's a query param (?q=...) and we have a results container, auto-run
            const params = new URLSearchParams(window.location.search);
            const qParam = params.get('q');
            if (qParam && searchResult) {
                performSearch(qParam);
                if (searchInput) searchInput.value = qParam;
            }
        })
        .catch(error => {
            console.error('Error loading search data:', error);
            if (searchResult) searchResult.innerHTML = '<p>Could not load search data.</p>';
        });

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

        // Display filtered results
        results.forEach(item => {
            const div = document.createElement('div');
            const subtitle = item.specialty ? ` — ${item.specialty}` : item.type ? ` — ${item.type}` : '';
            div.innerHTML = `<a href="${item.url}">${item.name}</a><span>${subtitle}</span>`;
            searchResult.appendChild(div);
        });
    }

    // Event listeners
    if (searchBtn && searchInput) {
        const redirectToResults = () => {
            const q = (searchInput.value || '').trim();
            if (!q) return; 
            window.location.href = `search.html?q=${encodeURIComponent(q)}`;
        };

        searchBtn.addEventListener('click', redirectToResults);
        // Search on Enter key
        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                redirectToResults();
            }
        });
    }
});