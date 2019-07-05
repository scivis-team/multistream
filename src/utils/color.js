import { rgb, hcl } from 'd3';

// 根据TreeColors算法，对colors进行重排列和反转
// colors：数组
// 返回值：经过重排列和反转的colors数组
const permutateAndReverseColors = (colors) => {
  const evenIndexColors = colors.filter((v, i) => i % 2 === 0);
  const oddIndexColors = colors.filter((v, i) => i % 2 === 1);
  return evenIndexColors.concat(oddIndexColors.reverse());
};

// 根据TreeColors算法，计算同一层中节点颜色
// hRange：array，0、1分别对应min、max
// c：int，色度
// l：int，亮度
// nums：int，节点数量
// flag：是否重排列和反转
// 返回值：长度为nums的rgb数组
const getTreeColorsInOneLayer = (hRange, c, l, nums, flag) => {
  const hInterval = (hRange[1] - hRange[0]) / (nums - 1);
  const hValues = new Array(nums).fill(0).map((v, i) => (hRange[0] + i * hInterval));
  let colors = hValues.map(v => rgb(hcl(v, c, l)));
  if (flag) colors = permutateAndReverseColors(colors);
  return { colors, hInterval };
};

export default { getTreeColorsInOneLayer };
