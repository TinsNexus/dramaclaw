// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2026 ClaymoreLab

// Huy hiệu thương hiệu cạnh logo trên header. Thay cho banner chiến dịch
// quảng bá một tác phẩm cụ thể của thương hiệu cũ, đã gỡ khi đổi tên DramaHub.
// Ở đây chỉ là hình trang trí, không bấm được, nên dùng thẻ img thuần.
export function BrandBadge() {
  return (
    <img
      src="/brand/dramahub-badge.svg"
      alt=""
      aria-hidden="true"
      draggable={false}
      className="ml-5 block h-[30px] w-auto select-none drop-shadow-[0_10px_18px_rgba(0,0,0,0.42)]"
    />
  );
}
