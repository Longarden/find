from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import re
from datetime import datetime
import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore
from collections import defaultdict
import json
import tempfile

# 환경변수에서 JSON 문자열 가져오기
firebase_json_str = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")

# JSON 문자열을 임시 파일로 저장
if firebase_json_str:
    with tempfile.NamedTemporaryFile(delete=False, mode="w", suffix=".json") as f:
        f.write(firebase_json_str)
        firebase_json_path = f.name
else:
    raise RuntimeError("GOOGLE_APPLICATION_CREDENTIALS_JSON 환경변수가 설정되지 않았습니다.")

# Firebase 초기화
cred = credentials.Certificate(firebase_json_path)
firebase_admin.initialize_app(cred)
db = firestore.client()

# .env에서 API 키 로딩
dotenv_path = os.getenv('DOTENV_PATH', '.env')
load_dotenv(dotenv_path)
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel("gemini-2.0-flash")

# FastAPI 앱 생성
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
from fastapi.responses import HTMLResponse

@app.get("/", response_class=HTMLResponse)
async def root():
    return """
    <html>
        <head><title>FIND 프로젝트 API</title></head>
        <body>
            <h1>FIND 프로젝트 서버가 실행 중입니다 🚀</h1>
            <p>다음 API를 사용할 수 있습니다:</p>
            <ul>
                <li><a href="/ranking">/ranking - 제보 랭킹 보기</a></li>
                <li><a href="/summary-by-location">/summary-by-location - 장소별 요약 보기</a></li>
            </ul>
        </body>
    </html>
    """
# Pydantic 모델 정의
class ReportRequest(BaseModel):
    reports: list[str]

class PoliceResultRequest(BaseModel):
    police_result: str

# 연락처 추출 함수
def extract_phone(text: str) -> str:
    match = re.search(r"(\d{2,3}-\d{3,4}-\d{4})|(\d{10,11})", text)
    if not match:
        return "연락처 없음"
    num = match.group(1) or match.group(2)
    if '-' not in num:
        if len(num) == 10:
            num = f"{num[:3]}-{num[3:6]}-{num[6:]}"
        else:
            num = f"{num[:3]}-{num[3:7]}-{num[7:]}"
    return num

# 점수 추출 함수
def extract_score(text: str) -> int:
    match = re.search(r"(?:신뢰도|점수)[:\s]*([0-9]+)점", text)
    return int(match.group(1)) if match else 0

# 제보 저장 API
@app.post("/submit-report")
async def submit_report(data: ReportRequest):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    results = []
    for report in data.reports:
        phone = extract_phone(report)
        doc = {
            "content": report,
            "phone": phone,
            "score": None,
            "time": now,
            "police_result": None,
            "gemini_output": None
        }
        try:
            ref = db.collection("reports").add(doc)
            results.append({"id": ref[1].id, "status": "저장 완료"})
        except Exception as e:
            results.append({"id": "저장 실패", "error": str(e)})
    return JSONResponse(content=results)

# 경찰 결과 입력 및 Gemini 점수 반영 API
@app.post("/admin-score")
async def admin_score(data: PoliceResultRequest):
    docs = db.collection("reports").where("score", "==", None).stream()
    updated = 0
    for doc in docs:
        report = doc.to_dict()
        report_id = doc.id
        prompt = f"""다음은 실종 관련 제보 내용과 경찰 조사 결과입니다.  
제보의 **정확도와 신뢰도**를 분석하여 **10점 만점 기준**으로 점수를 매겨주세요.  

⚠️ 단순한 키워드 일치가 아니라, **맥락적 정확성**과 **경찰 결과와의 실질적 일치 여부**를 기반으로 평가해야 합니다.  

---  
📌 **평가 항목 (총 4가지)**  
각 항목당 일치 여부에 따라 0~2.5점 부여 (합계 10점 만점):

1. **시간 정보** (날짜, 시각)  
2. **장소 정보** (지역, 공원명, 거리 등)  
3. **인상착의 및 행동 특성** (옷 색상, 활동, 상태 등)  
4. **기타 결정적 정보** (나이, 동행자, 신체 특징 등)  

---  
🎯 **점수 기준 요약표**

| 점수 구간 | 설명 |
|-----------|------|
| 10점 | 모든 항목이 명확히 일치, 결정적 단서 포함 |
| 7-9점 | 3개 항목 이상 일치하며 신뢰도 높음 |
| 4-6점 | 일부 항목 일치, 정보가 다소 불명확하거나 추정 가능 수준 |
| 1-3점 | 대부분 불일치, 일부 키워드 유사성 존재 |
| 0점 | 명백히 잘못된 정보 (장소, 시간, 특징 전부 불일치) |

---  
💡 **예시**

①  
제보 내용:  
시간: 5월 5일 오전 11시 15분  
장소: 대전 장현근린공원  
인상착의: 초록색 후드티, 검은색 반바지  
상태: 놀이터에서 혼자 미끄럼틀 옆에 앉아 있었음  

경찰 조사 결과:  
해당 시간과 장소에서 같은 인상착의를 한 실종자 실제로 확인됨  

→ 점수: 10점 (이유: 모든 항목 정확히 일치)

②  
제보 내용:  
시간: 5월 6일 오후 2시  
장소: 서울 장현근린공원  
인상착의: 파란 점퍼, 청바지  
상태: 자전거 타고 있었음  

경찰 조사 결과:  
해당 시간, 해당 장소에서 실종자 존재하지 않음. 주변 복장도 불일치  

→ 점수: 1점 (이유: 거의 모든 항목 불일치, 단 자전거 존재 가능성 추정)

---  
이제 실제 제보에 대해 점수를 평가해 주세요:  

[제보 내용]
{report['content']}

[경찰 조사 결과]
{data.police_result}

결과 형식: "점수: X점 (이유: ...)"
"""
        try:
            response = model.generate_content(prompt)
            gemini_output = response.text.strip()
            score = extract_score(gemini_output)
        except Exception as e:
            gemini_output = f"[Gemini 예외 발생] {str(e)}"
            score = 0

        try:
            db.collection("reports").document(report_id).update({
                "score": score,
                "police_result": data.police_result,
                "gemini_output": gemini_output
            })
            updated += 1
        except Exception as e:
            continue
    return {"status": "ok", "updated": updated}

# 랭킹 조회 API
@app.get("/ranking")
async def get_ranking():
    docs = db.collection("reports").stream()
    ranking = []
    for doc in docs:
        data = doc.to_dict()
        raw_score = data.get("score")
        display_score = raw_score if isinstance(raw_score, int) else None
        ranking.append({
            "제보번호": doc.id,
            "연락처": data.get("phone", ""),
            "점수": display_score,
            "시간": data.get("time", ""),
            "gemini": data.get("gemini_output", "")
        })
    ranking.sort(key=lambda x: (x["점수"] is None, -(x["점수"] or 0)))
    return JSONResponse(content=ranking)

# 장소 요약 API
@app.get("/summary-by-location")
async def summary_by_location():
    docs = db.collection("reports").stream()
    grouped = defaultdict(list)
    for doc in docs:
        content = doc.to_dict().get("content", "")
        location_match = re.search(r"(?:장소|위치)[\s:]*([^\n,\.]+)", content)
        if location_match:
            location = location_match.group(1).strip()
            grouped[location].append(content)

    summaries = {}
    for location, contents in grouped.items():
        combined_text = "\n".join(contents[:10])
        try:
            response = model.generate_content(
                f"다음은 모두 같은 장소 '{location}'에 대한 제보입니다. 이 제보들을 간결하게 요약해 주세요:\n{combined_text}"
            )
            summaries[location] = response.text.strip()
        except Exception as e:
            summaries[location] = f"[요약 실패] {str(e)}"

    return JSONResponse(content=summaries)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)