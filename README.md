# Healthcare Hub Project

Group university project for the fictional **Starlight Children's Hospital**, created to explore welcoming healthcare journeys for kids and their caregivers. The code lives inside the `web/` directory and is composed of hand-authored HTML, CSS, JSON data, and vanilla JavaScript for a few interactive elements.

## Highlights
- **Group-built homepage storytelling** with hero imagery, quick tips, and an approachable "About" section.
- **Doctor explorer** featuring themed hero personas, color-coded selector tabs, and dedicated detail pages per specialist.
- **Booking experience** that includes a weekday-only calendar, smart time-slot filtering by doctor, and form enhancements.
- **Live air quality widget** fetching air-pollution data from the Open-Meteo API and translating it into kid-friendly guidance.
- **Search and data files** that power typeahead results via local JSON indexes.
- **Consistent visual language** shared across pages (buttons, gradients, footers, typography) for a cohesive feel.

## Project Structure
```
web/
  index.html              # Landing page
  doctors.html            # Doctor overview with selector tabs
  booking.html            # Appointment form + interactive calendar
  contact.html            # Contact information and location details
  departments.html        # Department spotlights
  detail_*.html           # Individual doctor spotlight pages
  script.js               # Booking form logic, doctor selector JS, search helpers
  style.css               # Global styles, component themes, responsive rules
  data/                   # JSON fixtures for search and doctor data
  images/                 # Hero artwork and doctor illustrations
```

The `prototype/` folder contains earlier mockups and is not used by the main site.

## Getting Started
1. **Clone or unzip** this repository.
2. Open the `web/` folder in your browser to explore pages, or start a lightweight server:
   ```bash
   cd web
   python3 -m http.server 3000
   ```
   Then visit `http://localhost:3000/index.html`.
3. Edit HTML/CSS/JS files directly; no build tooling is required.

## Interactive Features
- **Doctor selector (doctors.html):** pure-CSS radio tabs with doctor-specific color palettes and fallback-friendly markup.
- **Booking calendar (booking.html):** vanilla JS calendar limited to weekdays, dynamically filtered time slots per doctor, and localStorage-backed slot reservations.
- **Air quality card (index.html / script.js):** fetches hourly PM and AQI data for Prague, highlights the current status, and offers child-friendly activity suggestions.
- **Search panel (search.html):** inline results rendered from `data/search-index.json` with graceful handling for empty states.

## Accessibility & UX Notes
- Buttons and links include ARIA labels where needed.
- Focus states and hover effects use high-contrast color ramps.
- Weekend dates are removed from the calendar grid to emphasize available booking days.
- Time-slot cards and doctor tabs rely on semantic controls (`button`, `label`, `input`, etc.) for keyboard navigation.


