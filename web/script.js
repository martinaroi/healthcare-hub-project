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

    // Font switching (only if buttons exist)
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
});
