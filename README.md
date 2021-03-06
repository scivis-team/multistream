# MultiStream
Implementation of *MultiStream: A Multiresolution Streamgraph Approach to Explore Hierarchical Time Series(TVCG2018)*

### Project setup

```
npm install
```

### Compiles and hot-reloads for development

```
npm start
```

### Compiles and minifies for production

```
npm run build
```

### Run your tests

```
npm run test
```

### Lints and fixes files

```
npm run lint
```

### Customize configuration

See [Configuration Reference](https://cli.vuejs.org/config/).

### Data Description
- 中国2013-2017各地区按月灯光总量
- 处理后的json文件：
  ```js
  [
    {
      "year": 13,
      "month": 1,
      "data": [
        {
          "id": "1", // 省份id
          "name": "安徽省",
          "gId": "3", // 大区id
          "gName": "华东地区",
          "sum": 586652.3700510999 // 省内灯光总和
        },
      ]
    },
  ]
  ```
- 行政区划说明：
  - 华北：北京、天津、河北、山西、内蒙古
  - 东北：辽宁、吉林、黑龙江
  - 华东：上海、江苏、浙江、江西、安徽、福建、山东
  - 中南：河南、湖北、湖南、广东、广西、海南
  - 西南：重庆、四川、贵州、云南、西藏
  - 西北：陕西、甘肃、青海、宁夏、新疆
  - 港澳台：香港、澳门、台湾

### TODO
- 数据可视化：Tree和Stream数据接入和绘制、标尺绘制
- 交互：hover highlight、brush
