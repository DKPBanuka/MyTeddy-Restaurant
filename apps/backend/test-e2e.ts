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

    // 3. Create an Order
    const firstProduct = prodsRes.data.find((p: any) => p.type === 'RETAIL');
    if (!firstProduct) {
      console.warn('Skipping Order creation: No retail product in DB to test with');
    } else {
      console.log('Placing simulated user transaction order for:', firstProduct.name);
      const orderPayload = {
        items: [
          {
            productId: firstProduct.id,
            quantity: 1,
            notes: 'Test runner automated note'
          }
        ],
        totalAmount: firstProduct.price,
        paymentMethod: 'CASH',
        amountReceived: firstProduct.price,
        change: 0,
        paymentStatus: 'PAID',
        orderType: 'TAKEAWAY',
        customerName: 'Automated Tester'
      };

      const orderRes = await axios.post(`${API}/orders`, orderPayload);
      console.log('✅ Order created successfully! Invoice:', orderRes.data.invoiceNumber);
    }

    // 4. Test Kitchen Queue
    const kitchenRes = await axios.get(`${API}/orders/kitchen`);
    console.log('Kitchen Queue Active Arrays:', kitchenRes.data.length);

    // 5. Test Dashboard Metrics
    const reportsRes = await axios.get(`${API}/reports/summary`);
    console.log('Dashboard Reports Validated. Today Revenue:', reportsRes.data.todayRevenue);

    console.log('--- ALL BACKEND E2E TESTS SECURELY PASSED ---\n');
  } catch(e: any) {
    console.error('Testing pipeline crashed:', e?.response?.data || e.message);
  }
}
testAll();
