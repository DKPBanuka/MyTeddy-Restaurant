async function testGetBookings() {
    try {
        const url = 'http://localhost:3000/party-bookings?month=3&year=2026';
        console.log(`Fetching bookings from ${url}...`);
        const response = await fetch(url);
        const data = await response.json();
        
        if (response.ok) {
            console.log('Success! Found', data.length, 'bookings.');
            const testBooking = data.find(b => b.customerName === 'QA_AGENT_TEST');
            if (testBooking) {
                console.log('Found our test booking:', testBooking);
            } else {
                console.log('Our test booking was NOT found in the list!');
                console.log('All returned booking names:', data.map(b => b.customerName));
            }
        } else {
            console.error('Error! Status:', response.status);
            console.error('Error Data:', data);
        }
    } catch (error) {
        console.error('Full Error:', error.message);
    }
}

testGetBookings();
