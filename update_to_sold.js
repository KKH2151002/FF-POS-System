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

    // 각각의 상품명과 판매가(할인 적용된 가격)
    const updates = [
        { name: '더큰참치마요 A', price: 900 },         // 원가 1800의 50%
        { name: '숯불갈비버거', price: 1900 },          // 원가 3800의 50%
        { name: '아이돌인기샌드위치', price: 1750 },    // 원가 2500의 30%
        { name: '에그마요샌드위치', price: 1960 }       // 원가 2800의 30%
    ];

    let completed = 0;

    updates.forEach(item => {
        // 이름에 LIKE를 써서 정확히 타겟팅 (테스트라는 글자가 붙어있을 수도 있으므로)
        const sql = `
            UPDATE inventory 
            SET status = 'sold', sale_price = ? 
            WHERE item_name LIKE ? AND status = 'selling'
            LIMIT 1
        `;
        
        db.query(sql, [item.price, `%${item.name}%`], (err, result) => {
            if (err) console.error(err);
            completed++;
            if (completed === updates.length) {
                console.log('✅ 남은 4개 상품 모두 판매(sold) 처리 완료!');
                db.end();
            }
        });
    });
});
