import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import SideRays from "@/components/react-bits/side-rays";
import styles from "./fourth-screen.module.css";

// `key` tra vào `landing.fourth.sets`, `kicker` là nhãn cố định không dịch.
const copySets = [
  { key: "s1", kicker: "SYSTEM 01" },
  { key: "s2", kicker: "SYSTEM 02" },
  { key: "s3", kicker: "SYSTEM 03" },
];

const gridItems = [
  { key: "i1", number: "01" },
  { key: "i2", number: "02" },
  { key: "i3", number: "03" },
];

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const segment = (position: number, start: number, duration: number) =>
  clamp((position - start) / duration);

export function FourthScreen({
  exitProgress = 0,
  progress,
  sequenceProgress,
}: {
  exitProgress?: number;
  progress: number;
  sequenceProgress: number;
}) {
  const { t } = useTranslation();

  if (exitProgress >= 0.99) return null;

  const activeIndex = Math.min(2, Math.floor(sequenceProgress * 3));
  const raysActive = progress > 0.02 && exitProgress < 0.98;
  const sceneStyle = {
    "--fourth-blur": `${(1 - progress) * 10 + exitProgress * 8}px`,
    "--fourth-offset": `${(1 - progress) * 34 - exitProgress * 28}px`,
    "--fourth-opacity": Math.max(0, progress * (1 - exitProgress)),
  } as CSSProperties;

  return (
    <section className={styles.layer} style={sceneStyle}>
      {raysActive ? (
        <SideRays
          className={styles.rays}
          speed={2.5}
          rayColor1="#eab308"
          rayColor2="#96c8ff"
          intensity={2}
          spread={2}
          origin="top-right"
          tilt={0}
          saturation={1.5}
          blend={0.75}
          falloff={1.6}
          opacity={1}
        />
      ) : null}
      <div className={styles.inner}>
        <div className={styles.copyArea}>
          {copySets.map((copy, index) => {
            const enter = segment(sequenceProgress, index / 3 - 0.04, 0.16);
            const exit = segment(sequenceProgress, (index + 0.78) / 3, 0.14);
            const copyOpacity = Math.max(0, enter * (1 - exit));
            const copyStyle = {
              "--copy-block-blur": `${(1 - copyOpacity) * 7}px`,
              "--copy-block-opacity": copyOpacity,
              "--copy-block-offset": `${(1 - enter) * 22 - exit * 18}px`,
            } as CSSProperties;

            return (
              <div className={styles.copyBlock} key={copy.key} style={copyStyle}>
                <p className={styles.kicker}>{copy.kicker}</p>
                <h2 className={styles.title}>
                  <span>{t(`landing.fourth.sets.${copy.key}.titleTop`)}</span>
                  <span>{t(`landing.fourth.sets.${copy.key}.titleBottom`)}</span>
                </h2>
                <p className={styles.lead}>{t(`landing.fourth.sets.${copy.key}.lead`)}</p>
              </div>
            );
          })}
        </div>

        <div className={styles.grid} aria-label="DramaHub creator workflow">
          {gridItems.map((item, index) => (
            <article
              className={`${styles.item} ${activeIndex === index ? styles.itemActive : ""}`}
              key={item.key}
            >
              <span className={styles.number}>{item.number}</span>
              <h3>{t(`landing.fourth.items.${item.key}.title`)}</h3>
              <p>{t(`landing.fourth.items.${item.key}.body`)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
