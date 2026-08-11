import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import styles from "./tenth-testimonials-screen.module.css";

// Mỗi khoá tra vào `landing.tenth.quotes`; ba hàng cuộn lệch nhau để tường
// lời chứng thực không lặp lại theo cùng một thứ tự.
const quotes = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9"];

const rows = [
  quotes.slice(0, 6),
  quotes.slice(3).concat(quotes.slice(0, 3)),
  quotes.slice(6).concat(quotes.slice(0, 6)),
];

export function TenthTestimonialsScreen({
  exitProgress = 0,
  progress,
}: {
  exitProgress?: number;
  progress: number;
}) {
  const { t } = useTranslation();

  if (exitProgress >= 0.99) return null;

  if (progress <= 0.01) return null;

  const visible = Math.max(0, progress * (1 - exitProgress));
  const style = {
    "--tenth-opacity": visible,
    "--tenth-offset": `${(1 - progress) * 34 - exitProgress * 28}px`,
    "--tenth-blur": `${exitProgress * 8}px`,
  } as CSSProperties;

  return (
    <section className={styles.layer} style={style}>
      <div className={styles.header}>
        <p>FIELD NOTES 10</p>
        <h2>{t("landing.tenth.title")}</h2>
        <span>{t("landing.tenth.subtitle")}</span>
      </div>

      <div className={styles.wall} aria-label="Creator feedback">
        {rows.map((row, rowIndex) => (
          <div
            className={`${styles.row} ${rowIndex === 1 ? styles.rowReverse : ""}`}
            key={rowIndex}
          >
            {[...row, ...row].map((quote, index) => (
              <article className={styles.card} key={`${quote}-${rowIndex}-${index}`}>
                <div className={styles.cardTop}>
                  <span>{t(`landing.tenth.quotes.${quote}.name`)}</span>
                  <em>{t(`landing.tenth.quotes.${quote}.tag`)}</em>
                </div>
                <p>{t(`landing.tenth.quotes.${quote}.text`)}</p>
              </article>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
