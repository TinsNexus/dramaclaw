// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2026 ClaymoreLab
import { AlertTriangle, CheckCircle2, CircleX } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * Mẫu định dạng chuẩn của phim tinh phẩm (drama). Viết cứng từng dòng thay vì
 * nhét vào chuỗi i18n dài: đây là mẫu hiển thị nguyên trạng, mọi ngắt dòng/khoảng
 * trắng đều có nghĩa.
 *
 * Nội dung minh hoạ (tên cảnh/nhân vật/thoại) đã Việt hoá cho dễ đọc, NHƯNG các
 * NHÃN CẤU TRÚC và TỪ THỜI GIAN phải giữ nguyên tiếng Trung vì parser
 * (screenplay_scene_parser.py) khớp cứng: 场次 / 地点·环境·场景 / 时间·时段 /
 * 内外景 / 人物·角色 / 第X集, INT·EXT = 内·外, 内景·外景, và TIME_TOKENS
 * (深夜/日/夜/夜晚…). Đừng đổi các token này sang tiếng Việt.
 *
 * Trung/Việt và Anh mỗi bên một bộ: parser nhận cả hai định dạng
 * (utils/screenplay_scene_parser.py), nhưng mẫu là để "chép theo" — giao diện
 * tiếng Trung/Việt hiện định dạng chế bản kiểu Trung, giao diện tiếng Anh hiện
 * định dạng Fountain; trộn lẫn hai bên coi như không đưa mẫu nào cả.
 */
// i18n-exempt-start —— 样例本身就是解析器认的制片格式，翻译过去就不是那个格式了
const DRAMA_FORMAT_SPEC = [
  "Định dạng kịch bản (chọn một)",
  "1-1 Tẩm điện Tô Loan 深夜 内",
  "1.1 Tẩm điện Tô Loan 内 深夜",
  "",
  "Định dạng phân trường (nhãn tiếng Trung)",
  "场次：1",
  "地点：Tẩm điện Tô Loan",
  "时间：深夜",
  "内外景：内",
  "",
  "Định dạng Fountain / Final Draft",
  "内景 Tẩm điện Tô Loan - 深夜",
  "INT. BEDROOM - NIGHT",
].join("\n");

const DRAMA_REPAIRABLE_FORMAT = [
  "第1集",
  "",
  "1.1 Tẩm điện Tô Loan 内",
  "人物：Tô Đường、Cẩm Tú",
  "▲ Tẩm điện tối đen, ánh nến lập loè.",
  "Tô Đường：Cẩm Tú, canh mấy rồi?",
].join("\n");

const DRAMA_FORMAT_EXAMPLE = [
  "第1集",
  "1-1 Tẩm điện Tô Loan 深夜 内",
  "人物：Tô Đường、Cẩm Tú",
  "△【Hồi tưởng】Tẩm điện tối đen, mũi chuỷ thủ chĩa thẳng vào ngọn nến lập loè, thân đao phản chiếu gương mặt thiếu nữ đầm đìa mồ hôi lạnh, đồng tử co rút.",
  "△Tô Đường OS：Ta không thể chết!",
  "△【Hồi hiện】Chuỷ thủ ánh lạnh đâm phập vào tim thiếu nữ, máu tươi bắn tung lên tấm chăn gấm. Hung thủ từ từ ngẩng đầu, lộ ra gương mặt lạnh băng của thị nữ thân cận Cẩm Tú.",
  "△Tô Đường OS：Ta không thể chết một cách không minh bạch!",
  "△【Hồi tưởng】Ký túc xá đại học hiện đại, sách vở bị ném mạnh xuống đất, Tô Đường và bạn cùng phòng cãi nhau kịch liệt.",
  "△Tô Đường OS：Ta tên Tô Đường, một nữ sinh viên bình thường. Hôm qua còn cãi nhau với người ta, hôm nay vừa mở mắt…",
  "△【Hồi hiện】Tô Đường bật dậy khỏi giường, y phục ngủ đẫm mồ hôi lạnh, hai tay siết chặt màn giường, khớp ngón trắng bệch.",
  "Tô Đường（thở dốc, ánh mắt thất thần, giọng run rẩy）：Phong cách này là… 《Loạn Thế Phượng Minh Lục》?",
  "△【Cận cảnh】Một đôi tay trắng nõn mảnh mai, hoàn toàn xa lạ, từ từ siết thành nắm đấm trước mắt Tô Đường.",
  "△Tô Đường OS：Nơi đây là Đại lục Phượng Minh, bảy nước loạn chiến. Người ta nhập vào, là Tô Loan!",
  "△Tô Đường toàn thân run bắn.",
  "△Tô Đường OS：Quy tắc của thế giới này chỉ có một — mạnh được yếu thua. Trong nguyên tác, Tô Loan chỉ là vai phụ vô danh.",
  "△Cánh cửa tẩm điện “kẽo kẹt” một tiếng, lặng lẽ hé mở một khe.",
  "△【Cận cảnh】Một bàn tay trắng ngần bưng chén canh sứ xanh bước vào, ống tay áo rộng trượt xuống, nơi cổ tay thoáng hiện đường viền bao đao thon dài.",
  "△Tô Đường OS：Nàng sẽ chết. Ba ngày sau, trên chiếc giường này, bị thị nữ nàng tin tưởng nhất một đao xuyên tim.",
  "△Cẩm Tú cúi đầu, lặng lẽ bước đến bên giường, sắc mặt bình thản không chút gợn sóng.",
  "Tô Đường（lập tức thu hết cảm xúc, giọng khàn khàn uể oải như vừa tỉnh giấc）：Cẩm Tú, canh mấy rồi?",
  "Cẩm Tú（đầu cúi thật thấp, giọng cung kính）：Bẩm công chúa, canh ba. Công chúa gặp ác mộng tỉnh giấc, nô tì đã hầm canh an thần.",
  "△Ánh mắt Tô Đường chợt sắc lạnh, rồi lập tức cụp mi xuống, lộ ra vẻ mệt mỏi rã rời.",
].join("\n");

const DRAMA_FORMAT_SPEC_EN = [
  "Fountain / Final Draft (recommended)",
  "INT. SEOUL SUBWAY STATION - NIGHT",
  "EXT. SEOUL STREET - DAWN",
  "",
  "Time values",
  "DAY / NIGHT / MORNING / AFTERNOON / EVENING / DAWN / DUSK",
  "",
  "Exact clock time (its own line, under the heading)",
  "INT. SEOUL SUBWAY STATION - NIGHT",
  "Time: 11:47 PM",
].join("\n");

const DRAMA_REPAIRABLE_FORMAT_EN = [
  "EPISODE 1",
  "",
  "SCENE 1 - SEOUL SUBWAY STATION",
  "Characters: Ji-won, Old Woman",
  "△ Rainwater drips from the ceiling.",
  "JI-WON: Is anyone here?",
  "",
  "INT./EXT. MOVING TAXI - DAY",
  "Characters: Ji-won",
  "△ The taxi weaves through traffic.",
  "JI-WON: Faster, please.",
].join("\n");

const DRAMA_FORMAT_EXAMPLE_EN = [
  "EPISODE 1",
  "",
  "INT. SEOUL SUBWAY STATION - NIGHT",
  "Characters: Ji-won, Old Woman",
  "",
  "△ Rainwater drips from the ceiling. The platform is completely empty.",
  "",
  "JI-WON: Is anyone here?",
  "",
  "OLD WOMAN: You should not have come this late.",
  "",
  "",
  "INT. SUBWAY CAR - NIGHT",
  "Characters: Ji-won, Old Woman, Boy",
  "",
  "△ The train doors close. The lights flicker above the empty seats.",
  "",
  "JI-WON: Where is this train going?",
  "",
  "OLD WOMAN: To the last station.",
  "",
  "",
  "EXT. SEOUL STREET - DAWN",
  "Characters: Ji-won",
  "",
  "△ Ji-won steps onto the deserted street as the first morning light appears.",
  "",
  "JI-WON: I made it back.",
].join("\n");
// i18n-exempt-end

/** 样例按界面语言取，不按剧本语言：这是「照着抄」的模板，跟着读的人走。 */
const FORMAT_SAMPLES = {
  zh: {
    spec: DRAMA_FORMAT_SPEC,
    repairable: DRAMA_REPAIRABLE_FORMAT,
    example: DRAMA_FORMAT_EXAMPLE,
  },
  en: {
    spec: DRAMA_FORMAT_SPEC_EN,
    repairable: DRAMA_REPAIRABLE_FORMAT_EN,
    example: DRAMA_FORMAT_EXAMPLE_EN,
  },
} as const;

export function NovelFormatDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, i18n } = useTranslation();
  const samples = (i18n.resolvedLanguage ?? i18n.language ?? "").startsWith("zh")
    ? FORMAT_SAMPLES.zh
    : FORMAT_SAMPLES.en;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl rounded-lg bg-black sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("ingest.novelFormat.title")}</DialogTitle>
        </DialogHeader>

        {/* 滚动条做细做淡：长度由内容/视口比例决定，改不动，只能让它别抢戏。 */}
        <ScrollArea className="max-h-[58vh] [&_[data-slot=scroll-area-scrollbar]]:w-1.5 [&_[data-slot=scroll-area-thumb]]:bg-white/15">
          <div className="space-y-5 pr-3">
            <p className="text-sm leading-6 text-foreground/75">
              {t("ingest.novelFormat.intro")}
            </p>

            <section className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-md border border-emerald-500/20 bg-emerald-500/[0.06] p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  {t("ingest.novelFormat.standardStatus")}
                </div>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                  {t("ingest.novelFormat.standardStatusHint")}
                </p>
              </div>
              <div className="rounded-md border border-amber-500/20 bg-amber-500/[0.06] p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400">
                  <AlertTriangle className="size-3.5" />
                  {t("ingest.novelFormat.warningStatus")}
                </div>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                  {t("ingest.novelFormat.warningStatusHint")}
                </p>
              </div>
              <div className="rounded-md border border-destructive/25 bg-destructive/[0.07] p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                  <CircleX className="size-3.5" />
                  {t("ingest.novelFormat.blockingStatus")}
                </div>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                  {t("ingest.novelFormat.blockingStatusHint")}
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground">
                {t("ingest.novelFormat.specLabel")}
              </h3>
              <p className="text-xs leading-5 text-muted-foreground">
                {t("ingest.novelFormat.specTokenNote")}
              </p>
              <pre className="whitespace-pre-wrap rounded-md border border-white/10 bg-white/[0.03] px-3.5 py-3 text-[13px] leading-7 text-foreground/90">
                {samples.spec}
              </pre>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground">
                {t("ingest.novelFormat.repairableLabel")}
              </h3>
              <p className="text-xs leading-5 text-muted-foreground">
                {t("ingest.novelFormat.repairableHint")}
              </p>
              <pre className="whitespace-pre-wrap rounded-md border border-amber-500/15 bg-amber-500/[0.04] px-3.5 py-3 text-[13px] leading-7 text-foreground/80">
                {samples.repairable}
              </pre>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground">
                {t("ingest.novelFormat.rulesLabel")}
              </h3>
              <ul className="list-disc space-y-1.5 pl-5 text-xs leading-5 text-foreground/70">
                <li>{t("ingest.novelFormat.ruleEpisode")}</li>
                <li>{t("ingest.novelFormat.ruleScene")}</li>
                <li>{t("ingest.novelFormat.ruleCharacters")}</li>
                <li>{t("ingest.novelFormat.ruleBody")}</li>
                <li>{t("ingest.novelFormat.ruleDialogue")}</li>
                <li>{t("ingest.novelFormat.ruleLocationChange")}</li>
                <li>{t("ingest.novelFormat.ruleTimeTokens")}</li>
                <li>{t("ingest.novelFormat.ruleClockTime")}</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground">
                {t("ingest.novelFormat.exampleLabel")}
              </h3>
              <pre className="whitespace-pre-wrap rounded-md border border-white/10 bg-white/[0.03] px-3.5 py-3 text-[13px] leading-7 text-foreground/70">
                {samples.example}
              </pre>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
