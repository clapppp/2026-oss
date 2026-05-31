import CategoryIcon from "../components/common/CategoryIcon";

export interface Category {
  label: string;
  icon: React.ReactNode;
}

export const CATEGORIES: Category[] = [
  { label: "문학",        icon: <CategoryIcon category="문학"        size={28} /> },
  { label: "일반미술",    icon: <CategoryIcon category="일반미술"    size={28} /> },
  { label: "전통미술",    icon: <CategoryIcon category="전통미술"    size={28} /> },
  { label: "디자인 / 공예", icon: <CategoryIcon category="디자인 / 공예" size={28} /> },
  { label: "사진",        icon: <CategoryIcon category="사진"        size={28} /> },
  { label: "만화",        icon: <CategoryIcon category="만화"        size={28} /> },
  { label: "영화",        icon: <CategoryIcon category="영화"        size={28} /> },
  { label: "방송",        icon: <CategoryIcon category="방송"        size={28} /> },
  { label: "공연",        icon: <CategoryIcon category="공연"        size={28} /> },
  { label: "연극",        icon: <CategoryIcon category="연극"        size={28} /> },
  { label: "무용",        icon: <CategoryIcon category="무용"        size={28} /> },
  { label: "국악",        icon: <CategoryIcon category="국악"        size={28} /> },
  { label: "대중음악",    icon: <CategoryIcon category="대중음악"    size={28} /> },
  { label: "일반음악",    icon: <CategoryIcon category="일반음악"    size={28} /> },
];
