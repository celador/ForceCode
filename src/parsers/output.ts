export function outputToString(toConvert: any, depth?: number): string {
  if (toConvert === undefined || toConvert === null) {
    return '';
  }
  let retval: string;
  if (typeof toConvert === 'object') {
    const level: number = depth || 1;
    const tabs: string = '\t'.repeat(level);
    const brTabs: string = '\t'.repeat(level - 1);
    retval = `\n${brTabs}{\n`;
    Object.keys(toConvert).forEach((key) => {
      retval += `${tabs}${key}: ${outputToString(toConvert[key], level + 1)},\n`;
    });
    retval += `${brTabs}}`;
  } else {
    retval = toConvert;
  }
  return retval;
}

interface ObjArr {
  [key: string]: string | object;
}

export function outputToCSV(arr: ObjArr[]): string {
  delete arr[0].attributes;
  const keys = getKeys(arr[0]);
  let csvContent = `"${keys.join('","')}"\n`;
  for (const curItem of arr) {
    const curItemArr = keys.map((key) => (curItem[key] === null ? '""' : getValue(curItem, key)));
    csvContent += curItemArr.join(',') + '\n';
  }
  return csvContent;
}

function getKeys(value: string | any, theArr: string[] = [], prevName?: string): string[] {
  if (value === null) {
    if (prevName) {
      theArr.push(prevName);
    }
  } else if (typeof value === 'object') {
    Object.keys(value)
      .filter((value) => value !== 'attributes')
      .forEach((val) => {
        const curName = prevName ? prevName + '.' + val : val;
        if (typeof value[val] === 'object') {
          getKeys(value[val], theArr, curName);
        } else {
          theArr.push(curName);
        }
      });
  } else {
    theArr.push(value);
  }
  return theArr;
}

function getValue(obj: ObjArr, val: string): string {
  const valSplit = val.split('.');
  let curObj: any = obj;
  for (const key of valSplit) {
    curObj = curObj[key];
  }
  return `"${curObj || ''}"`;
}
