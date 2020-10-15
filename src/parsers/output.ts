export function outputToString(toConvert: any, depth?: number): string {
  if (toConvert === undefined || toConvert === null) {
    return '';
  }
  let retval: string;
  if (typeof toConvert === 'object') {
    let level: number = depth || 1;
    let tabs: string = '';
    let brTabs: string = '';
    for (let theTabs = 0; theTabs < level; theTabs++) {
      tabs += '\t';
      if (theTabs + 1 < level) {
        brTabs += '\t';
      }
    }
    retval = '\n' + brTabs + '{\n';
    level++;
    Object.keys(toConvert).forEach(key => {
      retval += tabs + key + ': ' + outputToString(toConvert[key], level) + ',\n';
    });
    level--;
    retval += brTabs + '}';
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
  let csvContent = '"' + getKeys(arr[0]).join('","') + '"\n';
  for (let i = 0; i < arr.length; i++) {
    const curItem = arr[i];
    let curItemArr: string[] = [];
    getKeys(curItem).forEach(key => {
      curItemArr.push(curItem[key] === null ? '""' : getValue(curItem, key));
    });
    csvContent += curItemArr.join(',');
    if (i !== arr.length - 1) {
      csvContent += '\n';
    }
  }
  return csvContent;
}

function getKeys(value: string | any, theArr?: string[], prevName?: string): string[] {
  let curArr: string[] = theArr || [];
  if (value === null) {
    if (prevName) {
      curArr.push(prevName);
    }
  } else if (typeof value === 'object') {
    Object.keys(value)
      .filter(value => value !== 'attributes')
      .forEach(val => {
        let curName = prevName ? prevName + '.' + val : val;
        if (typeof value[val] === 'object') {
          getKeys(value[val], curArr, curName);
        } else {
          curArr.push(curName);
        }
      });
  } else {
    curArr.push(value);
  }
  return curArr;
}

function getValue(obj: ObjArr, val: string): string {
  let curObj: any = obj;
  let valSplit = val.split('.');
  for (let i = 0; i < valSplit.length; i++) {
    curObj = curObj[valSplit[i]];
  }
  return `"${curObj || ''}"`;
}
