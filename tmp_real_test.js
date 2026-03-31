async function test() {
  try {
    const login = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@demo.foodify.mx', password: 'Demo2026!' })
    });
    const loginData = await login.json();
    const token = loginData?.data?.accessToken;
    if(!token) { console.log('LOGIN ERROR:', loginData); return; }
    
    console.log('PAYLOAD:', Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
    
    const menuRes = await fetch('http://localhost:3000/api/v1/menus', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ name: 'Menu Node Test', description: 'Testing node backend' })
    });
    console.log('MENU RESPONSE:', await menuRes.json());
  } catch (err) {
    console.error(err);
  }
}
test();
