const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({
    user: 'root', password: '', database: 'foodify_db', host: '127.0.0.1', port: 3306 // or 3307? 
  }).catch(() => mysql.createConnection({ user: 'root', password: 'password', database: 'foodify_db', host: '127.0.0.1', port: 3306 }));
  
  const [users] = await c.query('SELECT id, email, role, restaurant_id FROM users');
  console.log('USERS:', users);
  
  process.exit(0);
}
run();
