const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'infodb.ansan.ac.kr',
    user: 'i2151002',
    password: 'khwjstk2@', 
    port: 3306,
    database: 'db2151002'
});

db.connect(async (err) => {
    if (err) process.exit(1);

    const now = new Date();
    const time1h = new Date(now.getTime() + 45 * 60 * 1000);  // 45분 뒤 (50% 할인)
    const time2h = new Date(now.getTime() + 100 * 60 * 1000); // 100분 뒤 (30% 할인)

    const formatDate = (d) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    const data = [
        ['27000388782272', '비프토마토버거', formatDate(time1h), 1, 'selling'], // 원가: 3600
        ['27000388777942', '숯불갈비버거', formatDate(time2h), 1, 'selling']  // 원가: 3600
    ];

    const sqlInsert = `
        INSERT INTO inventory 
        (barcode, item_name, expiration_date, quantity, status) 
        VALUES ?
    `;

    db.query(sqlInsert, [data], async (err, result) => {
        if (err) {
            console.error(err);
            db.end();
            return;
        }

        try {
            const response1 = await fetch('http://localhost:3000/api/sale', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ barcode: '27000388782272' }) // 50%
            });
            const res1 = await response1.json();
            console.log('--- 50% 할인 결제 시뮬레이션 ---');
            console.log(res1.message);

            const response2 = await fetch('http://localhost:3000/api/sale', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ barcode: '27000388777942' }) // 30%
            });
            const res2 = await response2.json();
            console.log('\n--- 30% 할인 결제 시뮬레이션 ---');
            console.log(res2.message);

        } catch(e) {
            console.error('API 에러:', e);
        } finally {
            db.end();
        }
    });
});
