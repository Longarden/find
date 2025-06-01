document.addEventListener('DOMContentLoaded', () => {
    // URL에서 id를 가져옵니다
    const params = new URLSearchParams(window.location.search);
    const personId = parseInt(params.get('id'));  // URL 쿼리 문자열에서 id를 추출

    // 해당 id에 맞는 실종자 데이터를 찾습니다.
    const person = people.find(p => p.id === personId);

    // 실종자 정보가 없으면 오류 메시지 출력
    if (!person) {
        document.getElementById('missing-person-detail').innerHTML = `
            <p>해당 실종자를 찾을 수 없습니다.</p>
        `;
        return;
    }

    // 실종자 정보를 화면에 출력
    const detailDiv = document.getElementById('missing-person-detail');
    detailDiv.innerHTML = `
        <div class="detail-header">
            <img src="${person.image}" alt="${person.name}" style="width: 200px; border-radius: 8px;">
            <h2>${person.name}</h2>
            <p><strong>나이:</strong> ${person.age} | <strong>성별:</strong> ${person.gender}</p>
            <p><strong>실종 위치:</strong> ${person.location}</p>
            <p><strong>실종일:</strong> ${person.lastSeen}</p>
        </div>
        <div class="detail-info">
            <h3>상세 정보</h3>
            <p><strong>위험도:</strong> ${getRiskLabel(determineRiskByElapsedDays(calculateDaysElapsed(person.lastSeen)))} </p>
            <p><strong>실종 경과 시간:</strong> ${calculateDaysElapsed(person.lastSeen)}일</p>
        </div>
    `;
});

// 실종 경과 일수 계산 함수
function calculateDaysElapsed(dateString) {
    const now = new Date();
    const lastSeenDate = new Date(dateString);
    const diffTime = now - lastSeenDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

// 위험도를 실종 경과 일수에 따라 동적으로 계산
function determineRiskByElapsedDays(days) {
    if (days >= 30) return 'critical';
    if (days >= 14) return 'high';
    if (days >= 7) return 'medium';
    return 'low';
}

// 위험도 표기 함수
function getRiskLabel(risk) {
    switch (risk) {
        case 'critical': return '매우 높음';
        case 'high': return '높음';
        case 'medium': return '중간';
        case 'low': return '낮음';
        default: return '정보 없음';
    }
}
