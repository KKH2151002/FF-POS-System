const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'infodb.ansan.ac.kr',
    user: 'i2151002',
    password: 'khwjstk2@', 
    port: 3306,
    database: 'db2151002'
});

db.connect((err) => {
    if (err) {
        console.error('DB 연결 실패:', err);
        process.exit(1);
    }

    const now = new Date();
    
    // 시연용 테스트 시간 (현 시간 기준)
    const time30m = new Date(now.getTime() + 30 * 60 * 1000); // 30분 뒤 (임박 알림 + 50% 할인)
    const time1h = new Date(now.getTime() + 55 * 60 * 1000);  // 55분 뒤 (50% 할인)
    const time2h = new Date(now.getTime() + 110 * 60 * 1000); // 1시간 50분 뒤 (30% 할인)

    const formatDate = (d) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    const data = [
        // 30분 뒤 폐기 (2개) - 더큰참치마요 A, B
        ['8801056150013', '더큰참치마요 A', formatDate(time30m), 1, 'selling'],
        ['8801056150013', '더큰참치마요 B', formatDate(time30m), 1, 'selling'],

        // 1시간 뒤 폐기 (2개) - 비프토마토버거, 숯불갈비버거
        ['8801056150037', '비프토마토버거', formatDate(time1h), 1, 'selling'],
        ['8801056150044', '숯불갈비버거', formatDate(time1h), 1, 'selling'],

        // 2시간 뒤 폐기 (2개) - 아이돌인기샌드위치, 에그마요샌드위치
        ['8801056150068', '아이돌인기샌드위치', formatDate(time2h), 1, 'selling'],
        ['8801056150075', '에그마요샌드위치', formatDate(time2h), 1, 'selling'],
    ];

    const sql = `
        INSERT INTO inventory 
        (barcode, item_name, expiration_date, quantity, status) 
        VALUES ?
    `;

    db.query(sql, [data], (err, result) => {
        if (err) {
            console.error('테스트 데이터 추가 실패:', err);
        } else {
            console.log('✅ 테스트 데이터 추가 완료! (총 6개)');
            console.log('- 30분 뒤 폐기 (50% 할인 & 알림 대상) 2개');
            console.log('- 1시간 이내 폐기 (50% 할인) 2개');
            console.log('- 2시간 이내 폐기 (30% 할인) 2개');
        }
        db.end();
    });
});
