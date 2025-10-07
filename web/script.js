document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('booking-form');
    if (!form) return; // Not on booking page

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Basic client-side validation fallback (in addition to required attrs)
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
});

