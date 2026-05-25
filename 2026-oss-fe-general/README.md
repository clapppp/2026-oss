# 2026-oss-fe-general

[2026-oss-project-ai](https://github.com/clapppp/2026-oss-project-ai) 프레임워크를 체험할 수 있는 데모 웹사이트입니다.  
문서 이미지를 업로드하면 AI가 스키마를 자동 선택하고 필드를 추출해 합격/불합격을 판정합니다.

## 주요 기능

| 페이지 | 설명 |
|--------|------|
| `/` | 프레임워크 아키텍처 소개 (ViT → Projection → LLM 파이프라인) |
| `/demo` | 문서 이미지 업로드 → 스키마 자동 선택 → 필드 추출 → 합/불 판정 |
| `/admin` | 모범 문서로 스키마 자동 추출, 필드 편집·저장·삭제 |

## 기술 스택

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4**
- API 프록시: Next.js Route Handler → `localhost:8000` (CORS 우회)

## 실행 방법

### 1. 백엔드 실행 (필수)

백엔드 저장소를 먼저 클론하고 실행합니다.

```bash
git clone https://github.com/clapppp/2026-oss-project-ai
cd 2026-oss-project-ai
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python main.py          # localhost:8000 에서 실행
```

> Apple Silicon(M 시리즈) 환경에서는 MPS 백엔드가 자동으로 사용됩니다.  
> CUDA 환경에서는 4-bit QLoRA가 자동으로 활성화됩니다.

### 2. 프론트엔드 실행

```bash
npm install
npm run dev             # localhost:3000 에서 실행
```

## 사용 방법

### 스키마 등록 (관리자)

1. `/admin` 페이지 접속
2. **스키마 등록** 탭에서 모범 문서 이미지 업로드
3. AI가 필드 목록을 자동 추출 → 내용 검토 후 이름 입력
4. **스키마 저장** 클릭

### 문서 판별 (데모)

1. `/demo` 페이지 접속
2. 판별할 문서 이미지 업로드
3. AI가 적합한 스키마를 자동 선택하고 필드를 추출
4. 합격/불합격 결과 및 추출된 필드 값 확인

## 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx              # 랜딩 페이지
│   ├── demo/page.tsx         # 문서 판별 데모
│   ├── admin/page.tsx        # 스키마 관리
│   └── api/proxy/[...path]/  # 백엔드 API 프록시
├── components/
│   ├── Nav.tsx               # 네비게이션 바
│   └── FileDropzone.tsx      # 드래그 앤 드롭 업로더
└── lib/
    └── api.ts                # 타입 안전 API 클라이언트
```

## 배포 (Vercel)

1. [vercel.com](https://vercel.com) → **Add New Project** → `z1-won/2026-oss-fe-general` 연결
2. **Environment Variables** 설정:

   | 변수 | 값 |
   |------|----|
   | `BACKEND_URL` | 배포된 백엔드 URL |

3. **Deploy** 클릭

> 백엔드 URL을 설정하지 않으면 `http://localhost:8000`으로 폴백합니다.

## 관련 저장소

- **AI 백엔드**: [clapppp/2026-oss-project-ai](https://github.com/clapppp/2026-oss-project-ai)
