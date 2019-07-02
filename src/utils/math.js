// 生成[min, max]范围内随机整数
const getRandomInteger = (min, max) => min + Math.round(Math.random() * (max - min));

export default { getRandomInteger };
