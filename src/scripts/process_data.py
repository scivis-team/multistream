import csv
import json
import codecs

data = []

geoDivisionDict = {}

with codecs.open('../../public/data/raw/geodivision.csv', encoding='utf-8') as f:
  reader = csv.DictReader(f)
  for row in reader:
    geoDivisionDict[row['ID_1']] = {
      'ID_1': row['ID_1'],
      'NAME_1': row['Provincial Division'],
      'ID_G': row['ID_G'],
      'NAME_G': row['Geographical Division']
    }

adminDivisionDict = {}

with codecs.open('../../public/data/raw/admin_division.csv', encoding='utf-8') as f:
  reader = csv.DictReader(f)
  for row in reader:
    adminDivisionDict[row['FID']] = geoDivisionDict[row['ID_1']]

for i in range(13, 18):
  for j in range(1, 13):
    dataItem = {}
    dataItem['year'] = i
    dataItem['month'] = j
    dataItem['data'] = dataItemData = {}

    for key in geoDivisionDict:
      dataItemData[key] = {
        **geoDivisionDict[key],
        'SUM': 0,
      }

    filename = '../../public/data/raw/{:02d}{:02d}.csv'.format(i, j)
    with codecs.open(filename, encoding='utf-8') as f:
      reader = csv.DictReader(f)
      for row in reader:
        provinceId = adminDivisionDict[row['FID_']]['ID_1']
        dataItemData[provinceId]['SUM'] += eval(row['SUM'])
    data.append(dataItem)

with codecs.open('../../public/data/processed.json', 'w', encoding='utf-8') as f:
    f.write(json.dumps(data, ensure_ascii=False, indent=2))