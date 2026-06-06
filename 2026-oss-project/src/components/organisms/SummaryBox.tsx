import InfoRow from "../molecules/InfoRow";
import styles from "./SummaryBox.module.css";

interface SummaryData {
  title: string;
  publisher: string;
  genre: string;
  date: string;
  volume: string;
  isbn: string;
  coverFile: string;
  innerFile: string;
}

interface SummaryBoxProps {
  data: SummaryData;
}

export default function SummaryBox({ data }: SummaryBoxProps) {
  return (
    <div className={styles.box}>
      <InfoRow label="작품명" value={data.title} />
      <InfoRow label="발행처" value={data.publisher} />
      <InfoRow label="세부장르" value={data.genre} />
      <InfoRow label="발행일" value={data.date} />
      <InfoRow label="ISBN" value={data.volume} />
      <InfoRow label="국제표준 번호" value={data.isbn} />
      <InfoRow label="제출 표지 파일" value={data.coverFile} />
      <InfoRow label="제출 내지 파일" value={data.innerFile} />
    </div>
  );
}
