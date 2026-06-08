export interface FieldConfig {
  key: string;
  label: string;
  type: "text" | "date" | "select";
  placeholder?: string;
  options?: string[];
}

export interface CategoryMeta {
  minCount: number;
  unit: string;
  hint: string;
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  "문학":         { minCount: 5, unit: "편", hint: "시/시조/수필 5편, 평론 3편, 단편소설 3편, 소설·희곡·평전 1편 이상" },
  "디자인 / 공예":{ minCount: 5, unit: "회", hint: "매체발표 또는 전시 합산 5회 이상" },
  "일반미술":     { minCount: 5, unit: "회", hint: "매체발표 또는 전시 합산 5회 이상" },
  "전통미술":     { minCount: 5, unit: "회", hint: "매체발표 또는 전시 합산 5회 이상" },
  "사진":         { minCount: 5, unit: "회", hint: "매체발표 또는 전시 합산 5회 이상" },
  "건축":         { minCount: 5, unit: "회", hint: "매체발표 또는 전시 합산 5회 이상" },
  "만화":         { minCount: 5, unit: "편", hint: "작품 발표 5편 이상 (연재의 경우 6개월 이상 1편)" },
  "방송":         { minCount: 3, unit: "편", hint: "드라마·예능·교양 프로그램 출연 3편 이상" },
  "공연":         { minCount: 3, unit: "편", hint: "공연 출연 3편 이상" },
  "연극":         { minCount: 3, unit: "편", hint: "연극 공연 출연 3편 이상" },
  "무용":         { minCount: 3, unit: "편", hint: "무용 공연 출연 3편 이상" },
  "영화":         { minCount: 3, unit: "편", hint: "상영영화 출연 3편 이상" },
  "국악":         { minCount: 3, unit: "편", hint: "공연 출연 또는 악곡 발표 3편 이상" },
  "대중음악":     { minCount: 3, unit: "편", hint: "공연 출연 또는 악곡 발표 3편 이상" },
  "일반음악":     { minCount: 3, unit: "편", hint: "공연 출연 또는 악곡 발표 3편 이상" },
};

export const CATEGORY_FORM_CONFIG: Record<string, FieldConfig[]> = {
  "문학": [
    { key: "title", label: "작품명", type: "text", placeholder: "내용을 입력하세요" },
    { key: "publisher", label: "발행처 (문예지명)", type: "text", placeholder: "내용을 입력하세요" },
    {
      key: "genre", label: "세부장르", type: "select",
      options: ["시/시조", "수필", "소설/동화/청소년소설", "평전", "희곡", "평론", "문학작품집"],
    },
    { key: "publishDate", label: "발행일", type: "date", placeholder: "YYYY.MM.DD" },
    { key: "isbn", label: "ISBN", type: "text", placeholder: "예) 979-11-XXXXXXX-X" },
    {
      key: "character", label: "성격", type: "select",
      options: ["단편", "장편", "기타"],
    },
  ],

  "디자인 / 공예": [
    { key: "title", label: "작품명", type: "text", placeholder: "내용을 입력하세요" },
    { key: "venue", label: "발표/전시처", type: "text", placeholder: "내용을 입력하세요" },
    {
      key: "genre", label: "세부장르", type: "select",
      options: ["디자인", "공예", "응용미술", "기타"],
    },
    { key: "date", label: "발표/전시일", type: "date", placeholder: "YYYY.MM.DD" },
    {
      key: "method", label: "발표방법", type: "select",
      options: ["매체발표", "전시회", "개인전", "작품집 출간", "비평 발표", "비평집 출간"],
    },
  ],

  "일반미술": [
    { key: "title", label: "작품명", type: "text", placeholder: "내용을 입력하세요" },
    { key: "venue", label: "발표/전시처", type: "text", placeholder: "내용을 입력하세요" },
    {
      key: "genre", label: "세부장르", type: "select",
      options: ["회화", "조각", "판화", "설치미술", "기타"],
    },
    { key: "date", label: "발표/전시일", type: "date", placeholder: "YYYY.MM.DD" },
    {
      key: "method", label: "발표방법", type: "select",
      options: ["매체발표", "전시회", "개인전", "작품집 출간", "비평 발표", "비평집 출간"],
    },
  ],

  "전통미술": [
    { key: "title", label: "작품명", type: "text", placeholder: "내용을 입력하세요" },
    { key: "venue", label: "발표/전시처", type: "text", placeholder: "내용을 입력하세요" },
    {
      key: "genre", label: "세부장르", type: "select",
      options: ["한국화", "민화", "전통공예", "자수", "기타"],
    },
    { key: "date", label: "발표/전시일", type: "date", placeholder: "YYYY.MM.DD" },
    {
      key: "method", label: "발표방법", type: "select",
      options: ["매체발표", "전시회", "개인전", "작품집 출간", "비평 발표", "비평집 출간"],
    },
  ],

  "사진": [
    { key: "title", label: "작품명", type: "text", placeholder: "내용을 입력하세요" },
    { key: "venue", label: "발표/전시처", type: "text", placeholder: "내용을 입력하세요" },
    { key: "date", label: "발표/전시일", type: "date", placeholder: "YYYY.MM.DD" },
    {
      key: "method", label: "발표방법", type: "select",
      options: ["매체발표", "전시회", "개인전", "작품집 출간", "비평 발표", "비평집 출간"],
    },
  ],

  "건축": [
    { key: "title", label: "작품명", type: "text", placeholder: "내용을 입력하세요" },
    { key: "venue", label: "발표/전시처", type: "text", placeholder: "내용을 입력하세요" },
    { key: "date", label: "발표/전시일", type: "date", placeholder: "YYYY.MM.DD" },
    {
      key: "method", label: "발표방법", type: "select",
      options: ["매체발표", "전시회", "개인전", "작품집 출간", "비평 발표", "비평집 출간"],
    },
  ],

  "만화": [
    { key: "title", label: "작품명", type: "text", placeholder: "내용을 입력하세요" },
    { key: "publisher", label: "발표처", type: "text", placeholder: "내용을 입력하세요" },
    { key: "date", label: "발표일", type: "date", placeholder: "YYYY.MM.DD" },
    {
      key: "method", label: "발표방법", type: "select",
      options: ["연재", "단행본 출간", "전시", "비평 발표", "비평집 출간"],
    },
    { key: "serialStart", label: "연재 시작일 (연재의 경우)", type: "date", placeholder: "YYYY.MM.DD" },
    { key: "serialEnd",   label: "연재 종료일 (연재의 경우)", type: "date", placeholder: "YYYY.MM.DD" },
  ],

  "방송": [
    { key: "programTitle", label: "프로그램명", type: "text", placeholder: "내용을 입력하세요" },
    { key: "broadcaster", label: "방송사", type: "text", placeholder: "내용을 입력하세요" },
    { key: "date", label: "방송일", type: "date", placeholder: "YYYY.MM.DD" },
    {
      key: "programType", label: "프로그램 종류", type: "select",
      options: ["드라마", "예능", "교양", "기타"],
    },
    {
      key: "role", label: "역할", type: "select",
      options: ["출연", "연출/진행", "대본집필"],
    },
  ],

  "공연": [
    { key: "title", label: "공연명", type: "text", placeholder: "내용을 입력하세요" },
    { key: "venue", label: "공연장", type: "text", placeholder: "내용을 입력하세요" },
    { key: "performanceStartDate", label: "공연 시작일", type: "date", placeholder: "YYYY.MM.DD" },
    { key: "performanceEndDate",   label: "공연 종료일", type: "date", placeholder: "YYYY.MM.DD" },
    {
      key: "role", label: "역할", type: "select",
      options: ["출연", "연출", "안무", "기타"],
    },
  ],

  "연극": [
    { key: "title", label: "공연명", type: "text", placeholder: "내용을 입력하세요" },
    { key: "venue", label: "공연장", type: "text", placeholder: "내용을 입력하세요" },
    { key: "performanceStartDate", label: "공연 시작일", type: "date", placeholder: "YYYY.MM.DD" },
    { key: "performanceEndDate",   label: "공연 종료일", type: "date", placeholder: "YYYY.MM.DD" },
    {
      key: "role", label: "역할", type: "select",
      options: ["출연", "연출", "희곡집필 (공연 통해)", "희곡집필 (잡지 등)", "비평"],
    },
  ],

  "무용": [
    { key: "title", label: "공연명", type: "text", placeholder: "내용을 입력하세요" },
    { key: "venue", label: "공연장", type: "text", placeholder: "내용을 입력하세요" },
    { key: "performanceStartDate", label: "공연 시작일", type: "date", placeholder: "YYYY.MM.DD" },
    { key: "performanceEndDate",   label: "공연 종료일", type: "date", placeholder: "YYYY.MM.DD" },
    {
      key: "role", label: "역할", type: "select",
      options: ["출연", "안무"],
    },
  ],

  "영화": [
    { key: "title", label: "작품명", type: "text", placeholder: "내용을 입력하세요" },
    { key: "company", label: "제작사", type: "text", placeholder: "내용을 입력하세요" },
    { key: "date", label: "개봉일", type: "date", placeholder: "YYYY.MM.DD" },
    {
      key: "role", label: "역할", type: "select",
      options: ["출연", "연출", "시나리오집필"],
    },
  ],

  "국악": [
    { key: "title", label: "작품명/공연명", type: "text", placeholder: "내용을 입력하세요" },
    { key: "venue", label: "공연장/방송사", type: "text", placeholder: "내용을 입력하세요" },
    { key: "performanceStartDate", label: "공연 시작일", type: "date", placeholder: "YYYY.MM.DD" },
    { key: "performanceEndDate",   label: "공연 종료일", type: "date", placeholder: "YYYY.MM.DD" },
    {
      key: "role", label: "역할", type: "select",
      options: ["출연", "작사", "작곡", "편곡", "가창", "연주", "지휘"],
    },
    {
      key: "method", label: "발표방법", type: "select",
      options: ["공연", "음반", "방송"],
    },
  ],

  "대중음악": [
    { key: "title", label: "작품명/공연명", type: "text", placeholder: "내용을 입력하세요" },
    { key: "venue", label: "공연장/음반사", type: "text", placeholder: "내용을 입력하세요" },
    { key: "performanceStartDate", label: "공연 시작일", type: "date", placeholder: "YYYY.MM.DD" },
    { key: "performanceEndDate",   label: "공연 종료일", type: "date", placeholder: "YYYY.MM.DD" },
    {
      key: "role", label: "역할", type: "select",
      options: ["출연", "작사", "작곡", "편곡", "가창", "연주", "지휘"],
    },
    {
      key: "method", label: "발표방법", type: "select",
      options: ["공연", "음반", "방송"],
    },
  ],

  "일반음악": [
    { key: "title", label: "작품명/공연명", type: "text", placeholder: "내용을 입력하세요" },
    { key: "venue", label: "공연장/음반사", type: "text", placeholder: "내용을 입력하세요" },
    { key: "performanceStartDate", label: "공연 시작일", type: "date", placeholder: "YYYY.MM.DD" },
    { key: "performanceEndDate",   label: "공연 종료일", type: "date", placeholder: "YYYY.MM.DD" },
    {
      key: "role", label: "역할", type: "select",
      options: ["출연", "작사", "작곡", "편곡", "가창", "연주", "지휘"],
    },
    {
      key: "method", label: "발표방법", type: "select",
      options: ["공연", "음반", "방송"],
    },
  ],
};
