import { useState, type CSSProperties } from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import loginStyles from "@/components/login/login.module.css";
import SideRays from "@/components/react-bits/side-rays";
import styles from "./eleventh-faq-screen.module.css";
import { businessWechatQrUrl } from "./media";

// Mỗi khoá tra vào `landing.eleventh.faqs`.
const faqs = ["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10"];

export function EleventhFaqScreen({
  exitProgress = 0,
  progress,
}: {
  exitProgress?: number;
  progress: number;
}) {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState(-1);

  if (exitProgress >= 0.99) return null;
  if (progress <= 0.01) return null;

  const style = {
    "--faq-opacity": progress * (1 - exitProgress),
    "--faq-offset": `${(1 - progress) * 34 - exitProgress * 28}px`,
    "--faq-blur": `${exitProgress * 7}px`,
  } as CSSProperties;

  return (
    <section className={styles.layer} style={style}>
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
      <div className={styles.inner}>
        <header className={styles.header}>
          <h2>{t("landing.eleventh.title")}</h2>
          <span>{t("landing.eleventh.subtitle")}</span>
        </header>

        <div className={styles.list}>
          {faqs.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <article
                className={`${styles.item} ${isOpen ? styles.itemOpen : ""}`}
                key={item}
              >
                <button
                  type="button"
                  className={styles.question}
                  aria-expanded={isOpen}
                  onClick={() => {
                    setOpenIndex(isOpen ? -1 : index);
                  }}
                >
                  <span>{t(`landing.eleventh.faqs.${item}.question`)}</span>
                  <Plus aria-hidden="true" />
                </button>
                <div className={styles.answer} aria-hidden={!isOpen}>
                  <div className={styles.answerInner}>
                    <p>{t(`landing.eleventh.faqs.${item}.answer`)}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className={styles.footer}>
          <p>{t("landing.eleventh.footerQuestion")}</p>
          <div className={`${loginStyles.businessWechat} ${styles.contactHover}`}>
            <button
              type="button"
              className={`${loginStyles.businessWechatTrigger} ${styles.contactButton}`}
              aria-label={t("landing.common.contactBusinessAria")}
            >
              {t("landing.common.contactBusiness")}
            </button>
            <div
              className={`${loginStyles.businessWechatPopover} ${styles.contactPopover}`}
              role="dialog"
              aria-label={t("landing.common.contactBusinessDialog")}
            >
              <div className={`${loginStyles.businessWechatPanel} ${styles.contactPanel}`}>
                <img
                  className={styles.contactQr}
                  src={businessWechatQrUrl}
                  alt={t("landing.common.businessQrAlt")}
                  draggable={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
