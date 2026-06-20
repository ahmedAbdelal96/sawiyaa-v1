async function testLogin() {
  const email = 'ahmed.patient@hesba.local';
  const password = 'Patient@12345';
  console.log(`Attempting login for ${email}...`);
  try {
    const res = await fetch('http://localhost:7000/api/v1/auth/patient/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error logging in:', err);
  }
}
testLogin();
