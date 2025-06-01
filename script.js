document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const riskFilter = document.getElementById('risk-filter');
    const sortOption = document.getElementById('sort-option');
    const personGrid = document.getElementById('person-grid');
    const noResults = document.getElementById('no-results');
    const totalCount = document.getElementById('total-count');

    // 사람 목록 업데이트 함수
    function updatePeopleList(filteredPeople) {
        personGrid.innerHTML = ""; // 기존 목록을 비운다.
        
        if (filteredPeople.length === 0) {
            noResults.classList.remove('hidden');
        } else {
            noResults.classList.add('hidden');
            filteredPeople.forEach(person => {
    const daysElapsed = calculateDaysElapsed(person.lastSeen);
    const riskLevel = determineRiskByElapsedDays(daysElapsed);

    const personCard = document.createElement('div');
    personCard.classList.add('person-card');
    personCard.innerHTML = `
        <img src="${person.image}" alt="${person.name}">
        <div class="card-info">
            <h3>${person.name}</h3>
            <div class="info-group">
                <p>나이: ${person.age}</p>
                <p>성별: ${person.gender}</p>
            </div>
            <p>위험도: <span class="badge badge-${riskLevel}">${getRiskLabel(riskLevel)}</span></p>
            <p>실종 경과 시간: ${daysElapsed}일</p>
            <p>위치: ${person.location}</p>
        </div>
    `;

    // 각 카드에 고유한 id 추가
            personCard.setAttribute('data-id', person.id);  // id를 data-id 속성으로 추가

            // 카드 클릭 시 해당 실종자 상세 페이지로 이동
            personCard.addEventListener('click', () => {
                window.location.href = `detail.html?id=${person.id}`;  // id를 쿼리로 전달
            });
    personGrid.appendChild(personCard);
});
            totalCount.textContent = `총 ${filteredPeople.length}건`;
        }
    }

    // 검색 및 필터 적용
    function filterAndSortPeople() {
        const searchValue = searchInput.value.toLowerCase();
        const selectedRisk = riskFilter.value;
        const selectedSort = sortOption.value;

        let filteredPeople = filterPeople(searchValue, selectedRisk);
        filteredPeople = sortPeople(filteredPeople, selectedSort);
        updatePeopleList(filteredPeople);
    }

    // 이벤트 리스너 추가
    searchInput.addEventListener('input', filterAndSortPeople);
    riskFilter.addEventListener('change', filterAndSortPeople);
    sortOption.addEventListener('change', filterAndSortPeople);

    // 페이지 초기화
    filterAndSortPeople(); // 페이지 로드 시 초기화
});
