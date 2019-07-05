import csv
import json
import codecs

data = []

geoDivisionDict = {}

with codecs.open('../../public/data/raw/geodivision.csv', encoding='utf-8') as f:
  reader = csv.DictReader(f)
  for row in reader:
    geoDivisionDict[row['ID_1']] = {
      'id': row['ID_1'],
      'name': row['Provincial Division'],
      'gId': row['ID_G'],
      'gName': row['Geographical Division']
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

    dataItemData = {}
    for key in geoDivisionDict:
      dataItemData[key] = {
        **geoDivisionDict[key],
        'sum': 0,
      }

    filename = '../../public/data/raw/{:02d}{:02d}.csv'.format(i, j)
    with codecs.open(filename, encoding='utf-8') as f:
      reader = csv.DictReader(f)
      for row in reader:
        provinceId = adminDivisionDict[row['FID_']]['id']
        dataItemData[provinceId]['sum'] += eval(row['SUM'])

    dataItem['data'] = list(dataItemData.values())
    data.append(dataItem)

with codecs.open('../../public/data/data.json', 'w', encoding='utf-8') as f:
    f.write(json.dumps(data, ensure_ascii=False, indent=2))