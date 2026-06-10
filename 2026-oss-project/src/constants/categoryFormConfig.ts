export interface FieldConfig {
  key: string;
  label: string;
  type: "text" | "date" | "select";
  placeholder?: string;
  options?: string[];
  /** true면 빈 값이어도 필수 검사 통과 */
  optional?: boolean;
}

export interface CategoryMeta {
  minCount: number;
  unit: string;
  hint: string;
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  "문학":         { minCount: 1, unit: "편", hint: "시/시조·수필 5편 | 평론·소설(단편) 3편 | 소설(장편)·평전·희곡·문학작품집 1편 이상 (장르별 비율 합산)" },
  "디자인 / 공예":{ minCount: 1, unit: "회", hint: "매체발표·전시 5회 | 비평발표 5편 | 개인전·작품집·비평집 1회 이상 (비율 합산)" },
  "일반미술":     { minCount: 1, unit: "회", hint: "매체발표·전시 5회 | 비평발표 5편 | 개인전·작품집·비평집 1회 이상 (비율 합산)" },
  "전통미술":     { minCount: 1, unit: "회", hint: "매체발표·전시 5회 | 비평발표 5편 | 개인전·작품집·비평집 1회 이상 (비율 합산)" },
  "사진":         { minCount: 1, unit: "회", hint: "매체발표·전시 5회 | 비평발표 5편 | 개인전·작품집·비평집 1회 이상 (비율 합산)" },
  "건축":         { minCount: 1, unit: "회", hint: "매체발표·전시 5회 | 비평발표 5편 | 개인전·작품집·비평집 1회 이상 (비율 합산)" },
  "만화":         { minCount: 1, unit: "편", hint: "단편발표·전시·비평 5편 이상 | 연재·작품집·비평집 1편 이상 (비율 합산)" },
  "방송":         { minCount: 1, unit: "편", hint: "방송·패션쇼·광고·연예공연 출연·비평 3편 이상 | 연출/진행·대본·비평집 1편 이상 (비율 합산)" },
  "공연":         { minCount: 3, unit: "편", hint: "공연 출연 3편 이상" },
  "연극":         { minCount: 1, unit: "편", hint: "출연·비평 3편 | 연출·희곡집필·비평집 1편 이상 (역할별 비율 합산)" },
  "무용":         { minCount: 1, unit: "편", hint: "출연·비평 3편 | 안무·비평집 1회 이상 (역할별 비율 합산)" },
  "영화":         { minCount: 1, unit: "편", hint: "출연·비평 3편 | 연출·시나리오·비평집 1편 이상 (역할별 비율 합산)" },
  "국악":         { minCount: 1, unit: "편", hint: "공연/방송 출연·악곡 창작·지휘·비평 3편 이상 | 음반 발매·비평집/작품집 1편 이상 (비율 합산)" },
  "대중음악":     { minCount: 1, unit: "편", hint: "공연/방송 출연·악곡 창작·지휘·비평 3편 이상 | 음반 발매·비평집/작품집 1편 이상 (비율 합산)" },
  "일반음악":     { minCount: 1, unit: "편", hint: "공연/방송 출연·악곡 창작·지휘·비평 3편 이상 | 음반 발매·비평집/작품집 1편 이상 (비율 합산)" },
};

export const CATEGORY_FORM_CONFIG: Record<string, FieldConfig[]> = {
  "문학": [
    { key: "title", label: "작품명", type: "text", placeholder: "내용을 입력하세요" },
    {
      key: "genre", label: "세부장르", type: "select",
      options: [
        "시/시조", "수필",
        "소설 (단편)", "소설 (장편·기타)",
        "평전", "희곡", "평론", "문학작품집",
      ],
    },
    { key: "publisher", label: "발행처 / 문예지명", type: "text", placeholder: "내용을 입력하세요" },
    { key: "publishDate", label: "발행일", type: "date", placeholder: "YYYY.MM.DD" },
    { key: "isbn", label: "ISBN (출판 작품)", type: "text", placeholder: "예) 979-11-XXXXXXX-X", optional: true },
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
      key: "method", label: "발표방법 (기준)", type: "select",
      options: ["매체발표 / 전시", "개인전", "작품집 출간", "비평 발표", "비평집 출간"],
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
      key: "method", label: "발표방법 (기준)", type: "select",
      options: ["매체발표 / 전시", "개인전", "작품집 출간", "비평 발표", "비평집 출간"],
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
      key: "method", label: "발표방법 (기준)", type: "select",
      options: ["매체발표 / 전시", "개인전", "작품집 출간", "비평 발표", "비평집 출간"],
    },
  ],

  "사진": [
    { key: "title", label: "작품명", type: "text", placeholder: "내용을 입력하세요" },
    { key: "venue", label: "발표/전시처", type: "text", placeholder: "내용을 입력하세요" },
    { key: "date", label: "발표/전시일", type: "date", placeholder: "YYYY.MM.DD" },
    {
      key: "method", label: "발표방법 (기준)", type: "select",
      options: ["매체발표 / 전시", "개인전", "작품집 출간", "비평 발표", "비평집 출간"],
    },
  ],

  "건축": [
    { key: "title", label: "작품명", type: "text", placeholder: "내용을 입력하세요" },
    { key: "venue", label: "발표/전시처", type: "text", placeholder: "내용을 입력하세요" },
    { key: "date", label: "발표/전시일", type: "date", placeholder: "YYYY.MM.DD" },
    {
      key: "method", label: "발표방법 (기준)", type: "select",
      options: ["매체발표 / 전시", "개인전", "작품집 출간", "비평 발표", "비평집 출간"],
    },
  ],

  "만화": [
    { key: "title", label: "작품명", type: "text", placeholder: "내용을 입력하세요" },
    { key: "publisher", label: "발표처", type: "text", placeholder: "내용을 입력하세요" },
    { key: "date", label: "발표일", type: "date", placeholder: "YYYY.MM.DD" },
    {
      key: "method", label: "발표방법 (기준)", type: "select",
      options: ["단편 발표", "연재 (6개월 이상)", "작품집 출간", "전시", "비평 발표", "비평집 출간"],
    },
    { key: "serialStart", label: "연재 시작일 (연재의 경우)", type: "date", placeholder: "YYYY.MM.DD", optional: true },
    { key: "serialEnd",   label: "연재 종료일 (연재의 경우)", type: "date", placeholder: "YYYY.MM.DD", optional: true },
  ],

  "방송": [
    { key: "programTitle", label: "프로그램/작품명", type: "text", placeholder: "내용을 입력하세요" },
    { key: "broadcaster", label: "방송사/주관사", type: "text", placeholder: "내용을 입력하세요" },
    { key: "date", label: "방송일/공연일", type: "date", placeholder: "YYYY.MM.DD" },
    {
      key: "role", label: "세부기준", type: "select",
      options: ["방송 출연", "방송 연출/진행", "패션쇼 출연", "광고 출연", "연예 공연 출연", "대본 발표", "비평 발표", "비평집 출간"],
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
    { key: "title", label: "공연명 / 작품명", type: "text", placeholder: "내용을 입력하세요" },
    {
      key: "role", label: "역할 (기준)", type: "select",
      options: ["출연", "연출", "희곡집필 (공연 통해)", "희곡집필 (잡지 등)", "비평", "비평집 출간"],
    },
    { key: "venue", label: "공연장 / 발표처", type: "text", placeholder: "내용을 입력하세요" },
    { key: "performanceStartDate", label: "공연 시작일 / 발표일", type: "date", placeholder: "YYYY.MM.DD" },
    { key: "performanceEndDate",   label: "공연 종료일", type: "date", placeholder: "YYYY.MM.DD", optional: true },
  ],

  "무용": [
    { key: "title", label: "공연명 / 작품명", type: "text", placeholder: "내용을 입력하세요" },
    { key: "venue", label: "공연장 / 발표처", type: "text", placeholder: "내용을 입력하세요" },
    { key: "performanceStartDate", label: "공연 시작일 / 발표일", type: "date", placeholder: "YYYY.MM.DD" },
    { key: "performanceEndDate",   label: "공연 종료일", type: "date", placeholder: "YYYY.MM.DD", optional: true },
    {
      key: "role", label: "역할 (기준)", type: "select",
      options: ["출연", "안무", "비평 발표", "비평집 출간"],
    },
  ],

  "영화": [
    { key: "title", label: "작품명", type: "text", placeholder: "내용을 입력하세요" },
    { key: "company", label: "제작사", type: "text", placeholder: "내용을 입력하세요" },
    { key: "date", label: "개봉일 / 발표일", type: "date", placeholder: "YYYY.MM.DD" },
    {
      key: "role", label: "역할 (기준)", type: "select",
      options: ["출연", "연출", "시나리오 집필", "비평 발표", "비평집 출간"],
    },
  ],

  "국악": [
    { key: "title", label: "작품명/공연명", type: "text", placeholder: "내용을 입력하세요" },
    {
      key: "type", label: "세부기준", type: "select",
      options: ["공연/방송 출연", "악곡 창작 발표", "음반 발매", "지휘", "비평 발표", "비평집/작품집 출간"],
    },
    { key: "venue", label: "공연장/발표처", type: "text", placeholder: "내용을 입력하세요", optional: true },
    { key: "date", label: "발표일/공연일", type: "date", placeholder: "YYYY.MM.DD" },
  ],

  "대중음악": [
    { key: "title", label: "작품명/공연명", type: "text", placeholder: "내용을 입력하세요" },
    {
      key: "type", label: "세부기준", type: "select",
      options: ["공연/방송 출연", "악곡 창작 발표", "음반 발매", "지휘", "비평 발표", "비평집/작품집 출간"],
    },
    { key: "venue", label: "공연장/발표처", type: "text", placeholder: "내용을 입력하세요", optional: true },
    { key: "date", label: "발표일/공연일", type: "date", placeholder: "YYYY.MM.DD" },
  ],

  "일반음악": [
    { key: "title", label: "작품명/공연명", type: "text", placeholder: "내용을 입력하세요" },
    {
      key: "type", label: "세부기준", type: "select",
      options: ["공연/방송 출연", "악곡 창작 발표", "음반 발매", "지휘", "비평 발표", "비평집/작품집 출간"],
    },
    { key: "venue", label: "공연장/발표처", type: "text", placeholder: "내용을 입력하세요", optional: true },
    { key: "date", label: "발표일/공연일", type: "date", placeholder: "YYYY.MM.DD" },
  ],
};
