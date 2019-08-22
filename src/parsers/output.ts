export function outputToString(toConvert: any, depth?: number): string {
  if (toConvert === undefined || toConvert === null) {
    return '';
  }
  var retval: string;
  if (typeof toConvert === 'object') {
    var level: number = depth ? depth : 1;
    var tabs: string = '';
    var brTabs: string = '';
    for (var theTabs = 0; theTabs < level; theTabs++) {
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
  var csvContent = '"' + getKeys(arr[0]).join('","') + '"\n';
  for (var i = 0; i < arr.length; i++) {
    const curItem = arr[i];
    var curItemArr: string[] = [];
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
  var curArr: string[] = theArr ? theArr : [];
  if (value === null) {
    if (prevName) {
      curArr.push(prevName);
    }
  } else if (typeof value === 'object') {
    Object.keys(value)
      .filter(value => value !== 'attributes')
      .forEach(val => {
        var curName = prevName ? prevName + '.' + val : val;
        if (value[val] === 'object') {
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
  var curObj: any = obj;
  var valSplit = val.split('.');
  for (var i = 0; i < valSplit.length; i++) {
    curObj = curObj[valSplit[i]];
  }
  return `"${curObj ? curObj : ''}"`;
}
