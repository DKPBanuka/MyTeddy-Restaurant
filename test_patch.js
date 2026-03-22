const axios = require('axios');
const API = 'http://localhost:3000';

async function test() {
    try {
        const res = await axios.get(`${API}/party-bookings`);
        if (!res.data || res.data.length === 0) {
            console.log('No bookings found to test with.');
            return;
        }
        const id = res.data[0].id;
        console.log(`Testing with booking ID: ${id}`);

        console.log(`Testing PATCH /party-bookings/${id}/items...`);
        const patchRes = await axios.patch(`${API}/party-bookings/${id}/items`, {
            items: [{ packageId: 'test', quantity: 1 }],
            menuTotal: 1000
        });
        console.log('PATCH Success:', patchRes.status);
    } catch (e) {
        console.error('Test Failed:', e.response ? `${e.response.status} ${e.response.statusText}` : e.message);
    }
}
test();
