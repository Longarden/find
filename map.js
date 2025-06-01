let map;
let marker = null;
let geocoder;
let searchBox;

function initMap() {
  const defaultPosition = { lat: 36.3664, lng: 127.3444 };

  map = new google.maps.Map(document.getElementById("map"), {
    center: defaultPosition,
    zoom: 15,
    mapTypeControl: true,
    streetViewControl: true,
    fullscreenControl: true,
  });

  geocoder = new google.maps.Geocoder();

  const searchBoxElement = document.getElementById("search-box");

  if (searchBoxElement) {
    searchBox = new google.maps.places.SearchBox(searchBoxElement);

    map.addListener("bounds_changed", () => {
      searchBox.setBounds(map.getBounds());
    });

    searchBox.addListener("places_changed", () => {
      const places = searchBox.getPlaces();
      if (places.length === 0) return;

      const place = places[0];
      if (!place.geometry || !place.geometry.location) return;

      map.setCenter(place.geometry.location);
      map.setZoom(17);
      addMarker(place.geometry.location);

      const address = place.formatted_address || "주소를 찾을 수 없습니다";
      updateAddressLabel(address);
    });
  } else {
    console.warn("검색창(search-box)이 없어서 SearchBox를 초기화하지 않았습니다.");
  }

  map.addListener("click", (event) => {
    const clickedLocation = event.latLng;
    addMarker(clickedLocation);
    getAddressFromLatLng(clickedLocation);
  });
}


function addMarker(position) {
  if (marker) marker.setMap(null);

  marker = new google.maps.Marker({
    position: position,
    map: map,
    title: "선택된 위치",
    animation: google.maps.Animation.DROP,
  });

  document.getElementById("remove-btn").style.display = "block";
}

function getAddressFromLatLng(latLng) {
  geocoder.geocode({ location: latLng }, (results, status) => {
    if (status === "OK" && results[0]) {
      updateAddressLabel(results[0].formatted_address);
    } else {
      updateAddressLabel("주소를 찾을 수 없습니다");
    }
  });
}

function updateAddressLabel(address) {
  document.getElementById("address-label").textContent = address;
}

function goToMyLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = new google.maps.LatLng(
          position.coords.latitude,
          position.coords.longitude
        );
        map.setCenter(userLocation);
        map.setZoom(17);
        addMarker(userLocation);
        getAddressFromLatLng(userLocation);
      },
      (error) => {
        alert("위치 정보를 가져올 수 없습니다: " + error.message);
      }
    );
  } else {
    alert("이 브라우저에서는 위치 서비스를 지원하지 않습니다.");
  }
}

function removeMarker() {
  if (marker) {
    marker.setMap(null);
    marker = null;
    updateAddressLabel("지도를 클릭하면 위치가 표시됩니다");
    document.getElementById("remove-btn").style.display = "none";
  }
}

function submitReport() {
  const reportContent = document.getElementById("report-content").value.trim();
  const addressLabel = document.getElementById("address-label").textContent;

  if (!reportContent) {
    alert("제보 내용을 입력해주세요.");
    return;
  }

  if (addressLabel === "지도를 클릭하면 위치가 표시됩니다") {
    alert("지도에서 위치를 선택해주세요.");
    return;
  }

  if (!marker) {
    alert("마커가 없습니다. 위치를 선택해주세요.");
    return;
  }

  const reportData = {
    content: reportContent,
    address: addressLabel,
    coordinates: {
      lat: marker.getPosition().lat(),
      lng: marker.getPosition().lng(),
    },
    timestamp: new Date().toISOString(),
  };

  fetch("http://localhost:8000/submit-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reportData),
  })
    .then((res) => {
      if (res.ok) {
        alert("제보가 성공적으로 제출되었습니다!");
        document.getElementById("report-content").value = "";
        removeMarker();
      } else {
        alert("제보 제출에 실패했습니다.");
      }
    })
    .catch(() => {
      alert("서버 연결 중 오류가 발생했습니다.");
    });
}
