const CDN_BASE = "https://nfg-web-assets.cdnfg.com/dramaclaw";

/** 登录页所有外链资源的唯一拼装口子 —— 换 CDN 只改 `CDN_BASE` 一处。 */
export const cdn = (path: string) => encodeURI(`${CDN_BASE}/${path}`);

export const businessWechatQrUrl = cdn("contact/wechat.png");

// i18n-exempt-start —— 下面是被展示作品自己的片名和一句话简介（源自作品本身），
// 不是界面文案；翻译掉就不是这部作品了。
export const cinematicVideoLibrary = [
  {
    id: "luban",
    type: "TRAILER",
    stat: "12 SHOTS",
    video: cdn("luban/luban-ep01.mp4"),
  },
  {
    id: "guilingsi",
    type: "SCENE",
    stat: "08 SHOTS",
    video: cdn("guilingsi/guilingsi-ep01.mp4"),
  },
  {
    id: "shixiong-butianle",
    type: "CHARACTER",
    stat: "09 SHOTS",
    video: cdn("shixiong-butianle/shixiong-butianle-ep01.mp4"),
  },
  {
    id: "tianmingbukeqi",
    type: "WORLD",
    stat: "14 SHOTS",
    video: cdn("tianmingbukeqi/tianmingbukeqi-ep02.mp4"),
  },
  {
    id: "wulongxiantu",
    type: "TRAILER",
    stat: "11 SHOTS",
    video: cdn("wulongxiantu/wulongxiantu-ep01.mp4"),
  },
  {
    id: "feiyi-zhouwu",
    type: "WORLD",
    stat: "07 SHOTS",
    video: cdn("feiyi-zhouwu/feiyi-zhouwu.mp4"),
  },
  {
    id: "3d-anime-montage-demo",
    type: "SCENE",
    stat: "10 SHOTS",
    video: cdn("3d-anime-montage-demo/3d-anime-montage-demo.mp4"),
  },
  {
    id: "dongtai-dadou",
    type: "ACTION",
    stat: "06 SHOTS",
    video: cdn("dongtai-dadou/dongtai-dadou.mp4"),
  },
] as const;
// i18n-exempt-end

/** 登录弹窗左侧主视觉使用独立成片，不影响落地页作品库。 */
export const loginModalShowcaseVideo = cdn("login/login20260826-174426.mp4");

export const cinematicVideos = {
  cs: cinematicVideoLibrary[7].video,
  jqr: cinematicVideoLibrary[1].video,
  pk: cinematicVideoLibrary[0].video,
} as const;
