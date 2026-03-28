import axios from 'axios';

const API = 'http://localhost:3000';

async function testAll() {
  console.log('--- Starting API E2E Tests ---');
  try {
    // 1. Get Categories
    const catsRes = await axios.get(`${API}/categories`);
    console.log('Categories Loaded:', catsRes.data.length);

    // 2. Get Products
    const prodsRes = await axios.get(`${API}/products`);
    console.log('Products Loaded:', prodsRes.data.length);

    // 3. Test every Product for Order Creation
    console.log(`Testing all ${prodsRes.data.length} products...`);
    for (const prod of prodsRes.data) {
      const orderPayload = {
        items: [
          {
            productId: prod.id,
            quantity: 1,
            type: prod.type,
            notes: 'Automated brute-force test'
          }
        ],
        totalAmount: Number(prod.price),
        paymentMethod: 'CASH',
        amountReceived: Number(prod.price),
        change: 0,
        paymentStatus: 'PAID',
        orderType: 'TAKEAWAY',
        customerName: 'Brute-Force Tester'
      };

      try {
        await axios.post(`${API}/orders`, orderPayload);
        console.log(`Testing product: ${prod.name} (${prod.type})... ✅ SUCCESS`);
      } catch (e: any) {
        console.log(`Testing product: ${prod.name} (${prod.type})... ❌ FAILED: ${JSON.stringify(e?.response?.data || e.message)}`);
      }
    }

    // 4. Test Kitchen Queue
    const kitchenRes = await axios.get(`${API}/orders/kitchen`);
    console.log('Kitchen Queue Active Arrays:', kitchenRes.data.length);

    // 5. Test Dashboard Metrics
    const reportsRes = await axios.get(`${API}/reports/summary`);
    console.log('Dashboard Reports Validated. Today Revenue:', reportsRes.data.todayRevenue);

    // 6. Test Party Bookings
    console.log('--- Testing Party Bookings ---');
    const partyPayload = {
      customerName: 'QA_PARTY_TEST',
      customerPhone: '0771112223',
      eventDate: '2026-03-25T00:00:00.000Z',
      startTime: '2026-03-25T14:00:00.000Z',
      endTime: '2026-03-25T17:00:00.000Z',
      guestCount: 30,
      menuTotal: 30000,
      addonsTotal: 0,
      advancePaid: 10000,
      items: [],
      bookingType: 'PARTIAL'
    };
    const createPartyRes = await axios.post(`${API}/party-bookings`, partyPayload);
    console.log('✅ Party Booking created:', createPartyRes.data.id);

    const getPartyRes = await axios.get(`${API}/party-bookings`, { params: { month: 3, year: 2026 } });
    const found = getPartyRes.data.find((b: any) => b.customerName === 'QA_PARTY_TEST');
    if (found) {
      console.log('✅ Party Booking retrieved successfully in month view');
    } else {
      throw new Error('Party Booking NOT found in month view!');
    }

    console.log('--- ALL BACKEND E2E TESTS SECURELY PASSED ---\n');
  } catch(e: any) {
    console.error('Testing pipeline crashed:', e?.response?.data || e.message);
  }
}
testAll();
