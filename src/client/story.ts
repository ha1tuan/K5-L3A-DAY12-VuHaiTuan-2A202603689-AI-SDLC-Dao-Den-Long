import type { NightId } from '../sim';

/** Ông Đăng's introduction before each night (F-04). Words only: nothing here touches the sim. */
export interface NightIntro {
  island: string;
  lines: string[];
  hint: string;
}

export const NIGHT_INTROS: Record<NightId, NightIntro> = {
  1: {
    island: 'Đảo Bến',
    lines: [
      'Mây à, sương đen tràn lên từ biển mây rồi. Năm ngọn đèn ở bến tắt cả.',
      'Con đi gom đom đóm, mang về đổ vào đèn. Mỗi đèn cần mười con mới cháy lại được.',
      'Bóng Mực sợ ánh sáng. Đèn nào sáng rồi thì quanh nó là chỗ con trú.',
    ],
    hint: 'Nhặt đom đóm, đứng cạnh đèn và nạp. Thắp đủ 5 đèn trước bình minh.',
  },
  2: {
    island: 'Đảo Cau',
    lines: [
      'Bên kia cầu tre còn một hòn đảo nữa. Cầu không có lan can, con bước cho khéo.',
      'Bục vàng sẽ hất con bay qua khe trời, nhanh hơn đi bộ nhiều.',
      'Coi chừng Gió Lạc. Thấy con mang nhiều đom đóm là nó sà tới giật. Tỏa sáng vào nó thì nó nhả ra.',
    ],
    hint: '6 đèn trên hai đảo. Bùa Gió đỏ giữa cầu cho con chạy nhanh và lướt không cần chờ.',
  },
  3: {
    island: 'Đảo Chuông',
    lines: [
      'Đêm cuối rồi. Tháp chuông đứng giữa đảo, đèn treo cả trên các bậc cao.',
      'Leo dốc mà lên, hoặc nhờ bục nhảy. Rơi khỏi mép là mất một ngọn lửa đấy.',
      'Cứ nửa phút gió mạnh lại thổi một lần, lá bay báo trước. Đứng vững mà đi.',
    ],
    hint: '7 đèn, Bóng Mực nhanh hơn. Thắp hết để chuông ngân gọi bình minh.',
  },
};
