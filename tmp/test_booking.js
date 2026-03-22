const axios = require('axios');

async function testCreateBooking() {
    try {
        const payload = {
            customerName: "QA_AGENT_TEST",
            customerPhone: "0771234567",
            eventDate: "2026-03-22T00:00:00.000Z",
            startTime: "2026-03-22T10:00:00.000Z",
            endTime: "2026-03-22T13:00:00.000Z",
            guestCount: 25,
            menuTotal: 25000,
            addonsTotal: 0,
            advancePaid: 7500,
            items: [],
            bookingType: "PARTIAL"
        };
        
        console.log('Sending POST request to http://localhost:3000/party-bookings...');
        const response = await fetch('http://localhost:3000/party-bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        if (response.ok) {
            console.log('Success! Response:', data);
        } else {
            console.error('Error! Status:', response.status);
            console.error('Error Data:', data);
        }
    } catch (error) {
        console.error('Full Error:', error.message);
    }
}

testCreateBooking();
