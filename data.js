const people = [
    { id: 1, name: "조하경", age: 26, gender: "여", location: "대전 중구 문화동", lastSeen: "2025-05-09", image: "images/스크린샷 2025-05-14 002619.png" },
    { id: 2, name: "조은수", age: 25, gender: "여", location: "서울 서대문구", lastSeen: "2025-06-01", image: "images/스크린샷 2025-05-14 002713.png" },
    { id: 3, name: "장정원", age: 22, gender: "남", location: "대구 북구", lastSeen: "2025-05-31", image: "images/스크린샷 2025-05-13 225954.png" },
    { id: 4, name: "이혜린", age: 17, gender: "여", location: "세종 북구", lastSeen: "2025-05-30", image: "images/스크린샷 2025-05-13 230400.png" },
    { id: 5, name: "조성주", age: 23, gender: "남", location: "대전 유성구 봉명동", lastSeen: "2025-05-04", image: "images/스크린샷 2025-05-13 230153.png" }
];

//실종 경과 일수 계산 함수 
function calculateDaysElapsed(dateString) {
    const now = new Date();
    const lastSeenDate = new Date(dateString);
    const diffTime = now - lastSeenDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

//위험도를 실종 경과 일수에 따라 동적으로 계산산
function determineRiskByElapsedDays(days) {
    if (days >= 3) return 'critical';
    if (days >= 2) return 'high';
    if (days >= 1) return 'medium';
    return 'low';
}

//위험도 표기 함수
function getRiskLabel(risk) {
    switch (risk) {
        case 'critical': return '매우 높음';
        case 'high': return '높음';
        case 'medium': return '중간';
        case 'low': return '낮음';
        default: return '정보 없음';
    }
}

// 검색 및 필터링 함수
function filterPeople(searchValue, selectedRisk) {
    return people.filter(person => {
        const daysElapsed = calculateDaysElapsed(person.lastSeen);
        const dynamicRisk = determineRiskByElapsedDays(daysElapsed);

        const matchesSearch = person.name.toLowerCase().includes(searchValue) || person.location.toLowerCase().includes(searchValue);
        const matchesRisk = selectedRisk === "all" || dynamicRisk === selectedRisk;

        return matchesSearch && matchesRisk;
    });
}


// 정렬 함수
function sortPeople(people, sortBy) {
    switch (sortBy) {
        case "recent":
            return people.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
        case "age":
            return people.sort((a, b) => a.age - b.age);
        case "risk":
        default:
            const riskOrder = { "critical": 1, "high": 2, "medium": 3, "low": 4 };
            return people.sort((a, b) => {
                const riskA = determineRiskByElapsedDays(calculateDaysElapsed(a.lastSeen));
                const riskB = determineRiskByElapsedDays(calculateDaysElapsed(b.lastSeen));
                return riskOrder[riskA] - riskOrder[riskB];
            });
    }
}


