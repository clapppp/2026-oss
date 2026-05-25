# API 문서

Base URL: `http://localhost:8000`

---

## Health Check

### GET `/health`
서버 상태 확인.

**Response**
```json
{ "status": "ok" }
```

---

## 관리자 API `/admin`

### POST `/admin/extract-schema`
모범 문서 이미지를 업로드하면 DiT 임베딩 추출 + PaddleOCR + LLM으로 필드 목록을 자동 추출.

**Request**
- Content-Type: `multipart/form-data`
- `file`: 이미지 파일 (jpg, png 등)

**Response**
```json
{
  "extract_id": "550e8400-e29b-41d4-a716-446655440000",
  "fields": [
    { "name": "소득금액", "type": "number" },
    { "name": "발급일",   "type": "date"   }
  ]
}
```

> 추출된 필드를 관리자가 검토 — 필요한 필드만 선택해 `/admin/schema`로 저장. DiT 임베딩은 서버에서 `extract_id`로 관리하며 프론트엔드에 노출되지 않음.

---

### POST `/admin/schema`
관리자가 선택한 필드 구조를 스키마로 저장. DiT 임베딩은 서버가 `extract_id`로 자동 조회.

**Request**
```json
{
  "name": "소득증명서",
  "fields": [
    { "name": "소득금액", "type": "number" },
    { "name": "발급일",   "type": "date"   }
  ],
  "extract_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| name | string | 스키마 이름 |
| fields[].name | string | 필드명 |
| fields[].type | string | `string` \| `number` \| `date` |
| extract_id | string | `/extract-schema` 응답에서 받은 임시 ID |

**Response**
```json
{
  "id": 1,
  "name": "소득증명서",
  "fields": [...]
}
```

---

### GET `/admin/schemas`
등록된 스키마 목록 조회.

**Response**
```json
[
  { "id": 1, "name": "소득증명서", "fields": [...] }
]
```

---

### GET `/admin/schema/{schema_id}/documents`
스키마별 제출 문서 목록 조회.

**Path Parameter**
- `schema_id`: 조회할 스키마 ID

**Response**
```json
[
  {
    "id": 1,
    "schema_id": 1,
    "schema_name": "소득증명서",
    "similarity_score": 0.9821,
    "extracted_data": {
      "소득금액": "36000000",
      "발급일": "2024-03-15"
    },
    "missing_fields": [],
    "created_at": "2024-03-15T10:30:00"
  }
]
```

---

### DELETE `/admin/schema/{schema_id}`
스키마 삭제.

**Response**
```json
{ "detail": "삭제 완료" }
```

---

## 사용자 API `/user`

### POST `/user/submit`
문서 이미지(1장 이상)를 제출하면 DiT로 스키마를 자동 선택하고 필드를 추출해 반환. 결과는 DB에 저장됨.

**Request**
- Content-Type: `multipart/form-data`
- `files`: 이미지 파일 1장 이상 (여러 장 = 같은 문서의 여러 페이지)

**Response**
```json
{
  "schema_id": 1,
  "schema_name": "소득증명서",
  "similarity_score": 0.9821,
  "data": {
    "소득금액": "36000000",
    "발급일": "2024-03-15"
  },
  "missing_fields": []
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| schema_id | int | 선택된 스키마 ID |
| schema_name | string | 선택된 스키마 이름 |
| similarity_score | float | DiT 코사인 유사도 (0~1) |
| data | object | 추출된 필드값 (추출 실패 시 null) |
| missing_fields | array | 추출되지 않은 필드 목록 |

**Error**
```json
{ "detail": "등록된 스키마가 없습니다" }  // 404
```

---

## 플로우 요약

```
[관리자 — 스키마 등록]
1. POST /admin/extract-schema        → 모범 문서에서 필드 자동 추출
2. POST /admin/schema                → 필드 선택 후 스키마 저장 (DiT 임베딩 포함)
3. GET  /admin/schemas               → 등록된 스키마 목록 확인
4. GET  /admin/schema/{id}/documents → 스키마별 제출 문서 조회

[사용자 — 문서 제출]
1. POST /user/submit                 → 문서 이미지 제출 → 스키마 자동 분류 + 필드 추출
```

---

## 내부 처리 흐름

```
문서 이미지 입력
    │
    ├─ DiT (microsoft/dit-base)
    │      코사인 유사도로 등록된 스키마 중 Top-3 후보 선택
    │
    ├─ PaddleOCR
    │      전 페이지 텍스트 추출 후 합산
    │
    └─ Qwen2.5-7B (4-bit, 로컬)
           Top-3 후보 + OCR 텍스트 → 최종 스키마 선택 + 필드 추출
```
