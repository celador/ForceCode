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
      retval += tabs + key + ': ' + this.outputToString(toConvert[key], level) + ',\n';
    });
    level--;
    retval += brTabs + '}';
  } else {
    retval = toConvert;
  }
  return retval;
}

interface ObjArr {
  [key: string]: string;
}

export function outputToCSV(arr: ObjArr[]): string {
  delete arr[0].attributes;
  var csvContent = '"' + Object.keys(arr[0]).join('","') + '"\n';
  for (var i = 0; i < arr.length; i++) {
    const curItem = arr[i];
    var curItemArr: string[] = [];
    Object.keys(curItem).forEach(key => {
      if (key != 'attributes') {
        curItemArr.push('"' + (curItem[key] === null ? '' : curItem[key]) + '"');
      }
    });
    csvContent += curItemArr.join(',');
    if (i !== arr.length - 1) {
      csvContent += '\n';
    }
  }
  return csvContent;
}
