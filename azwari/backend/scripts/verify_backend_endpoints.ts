process.env.NODE_ENV = 'test';
import http from 'http';

async function runTests() {
  const { default: app } = await import('../server/index');
  const testPort = 5099;
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(testPort, () => {
      console.log(`🧪 Test server started on http://localhost:${testPort}`);
      resolve();
    });
  });

  const baseUrl = `http://localhost:${testPort}`;

  try {
    // 1. Health check
    console.log('\n--- 1. Testing GET /health ---');
    const healthRes = await fetch(`${baseUrl}/health`).then((r) => r.json());
    console.log('Health Response:', healthRes);
    if (healthRes.status !== 'healthy') throw new Error('Health check failed');

    // 2. Products check
    console.log('\n--- 2. Testing GET /api/products ---');
    const prodRes = await fetch(`${baseUrl}/api/products`).then((r) => r.json());
    console.log('Products Count:', prodRes.count, 'Success:', prodRes.success);
    if (!prodRes.success) throw new Error('Products check failed');

    // 3. Waitlist check
    console.log('\n--- 3. Testing GET /api/waitlist ---');
    const waitlistRes = await fetch(`${baseUrl}/api/waitlist`).then((r) => r.json());
    console.log('Waitlist Count:', waitlistRes.count, 'Success:', waitlistRes.success);
    if (!waitlistRes.success) throw new Error('Waitlist check failed');

    // 4. Waitlist POST check
    console.log('\n--- 4. Testing POST /api/waitlist ---');
    const joinRes = await fetch(`${baseUrl}/api/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Abebe Kebede',
        phone: '+251911998877',
        role: 'sales_agent',
        subcity: 'Bole',
        categoryOrChannel: 'Fashion & Leather',
        estimatedScale: '50-100 orders/month',
      }),
    }).then((r) => r.json());
    console.log('Join Waitlist Result:', joinRes);
    if (!joinRes.success) throw new Error('Join waitlist failed');

    console.log('\n✅ All backend integration tests PASSED successfully!');
  } finally {
    server.close(() => {
      console.log('🧪 Test server closed.');
      process.exit(0);
    });
  }
}

runTests().catch((err) => {
  console.error('❌ Integration test failed:', err);
  process.exit(1);
});
