/*
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { EOL } from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import { ChildRelationship, Field, SObject, SObjectDescribe } from './';
import { dxService, SObjectCategory, notifications } from '../services';
import { FCCancellationToken } from '../commands/forcecodeCommand';
import { inDebug } from '../services/fcAnalytics';

const SFDX_DIR = '.sfdx';
const TOOLS_DIR = 'tools';
const SOBJECTS_DIR = 'sobjects';
const STANDARDOBJECTS_DIR = 'standardObjects';
const CUSTOMOBJECTS_DIR = 'customObjects';
const SFDX_PROJECT_FILE = 'sfdx-project.json';

export class FauxClassGenerator {
  // the empty string is used to represent the need for a special case
  // usually multiple fields with specialized names
  private static typeMapping: Map<string, string> = new Map([
    ['string', 'String'],
    ['double', 'Double'],
    ['reference', ''],
    ['boolean', 'Boolean'],
    ['currency', 'Decimal'],
    ['date', 'Date'],
    ['datetime', 'Datetime'],
    ['email', 'String'],
    ['location', 'Location'],
    ['percent', 'Double'],
    ['phone', 'String'],
    ['picklist', 'String'],
    ['multipicklist', 'String'],
    ['textarea', 'String'],
    ['encryptedstring', 'String'],
    ['url', 'String'],
    ['id', 'Id'],
    // note that the mappings below "id" only occur in standard SObjects
    ['base64', 'Blob'],
    ['address', 'Address'],
    ['int', 'Integer'],
    ['anyType', 'Object'],
    ['combobox', 'String'],
    ['time', 'Time'],
    // TBD what are these mapped to and how to create them
    // ['calculated', 'xxx'],
    // ['masterrecord', 'xxx'],
    ['complexvalue', 'Object'],
  ]);

  private static fieldName(decl: string): string {
    return decl.substr(decl.indexOf(' ') + 1);
  }

  public async generate(
    projectPath: string,
    type: SObjectCategory,
    cancellationToken: FCCancellationToken
  ): Promise<string> {
    notifications.writeLog(
      '===================Starting refresh of ' + type + ' objects from org====================='
    );
    const sobjectsFolderPath = path.join(projectPath, SFDX_DIR, TOOLS_DIR, SOBJECTS_DIR);
    const standardSObjectsFolderPath = path.join(sobjectsFolderPath, STANDARDOBJECTS_DIR);
    const customSObjectsFolderPath = path.join(sobjectsFolderPath, CUSTOMOBJECTS_DIR);

    if (!fs.existsSync(projectPath) || !fs.existsSync(path.join(projectPath, SFDX_PROJECT_FILE))) {
      throw 'Unable to generate faux classes for sObjects when not in a ForceCode project';
    }
    if (type === SObjectCategory.ALL) {
      this.cleanupSObjectFolders(sobjectsFolderPath);
    } else if (type === SObjectCategory.CUSTOM) {
      this.cleanupSObjectFolders(customSObjectsFolderPath);
    } else {
      this.cleanupSObjectFolders(standardSObjectsFolderPath);
    }

    const describe = new SObjectDescribe();
    const standardSObjects: SObject[] = [];
    const customSObjects: SObject[] = [];
    let fetchedSObjects: SObject[] = [];
    let sobjects: string[] = [];
    try {
      if (inDebug()) {
        // to save limits during unit testing the extension, as we use a live org to test
        sobjects = ['Account', 'Contact'];
      } else {
        sobjects = await dxService.describeGlobal(type);
      }
    } catch (e) {
      throw 'Failure fetching list of sObjects from org ' + e;
    }
    let j = 0;
    while (j < sobjects.length) {
      if (cancellationToken.isCanceled()) {
        return Promise.reject('Cancelled');
      }
      try {
        fetchedSObjects = fetchedSObjects.concat(await describe.describeSObjectBatch(sobjects, j));
        j = fetchedSObjects.length;
      } catch (e) {
        throw 'Failure performing sObject describe ' + e;
      }
    }

    for (let i = 0; i < fetchedSObjects.length; i++) {
      if (fetchedSObjects[i].custom) {
        customSObjects.push(fetchedSObjects[i]);
      } else {
        standardSObjects.push(fetchedSObjects[i]);
      }
    }

    this.logFetchedObjects(standardSObjects, customSObjects);

    this.generateFauxClasses(standardSObjects, standardSObjectsFolderPath);
    this.generateFauxClasses(customSObjects, customSObjectsFolderPath);

    notifications.writeLog(
      '=========================================DONE!!!========================================='
    );
    return 'Success!!!';
  }

  // VisibleForTesting
  public generateFauxClassText(sobject: SObject): string {
    const declarations: string[] = this.generateFauxClassDecls(sobject);
    return this.generateFauxClassTextFromDecls(sobject.name, declarations);
  }

  // VisibleForTesting
  public generateFauxClass(folderPath: string, sobject: SObject): string {
    notifications.writeLog('Generating faux class for ' + sobject.name);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirpSync(folderPath);
    }
    const fauxClassPath = path.join(folderPath, sobject.name + '.cls');
    fs.writeFileSync(fauxClassPath, this.generateFauxClassText(sobject), {
      mode: 0o444,
    });
    return fauxClassPath;
  }

  private stripId(name: string): string {
    if (name.endsWith('Id')) {
      return name.slice(0, name.length - 2);
    } else {
      return name;
    }
  }

  private capitalize(input: string): string {
    return input.charAt(0).toUpperCase() + input.slice(1);
  }

  private getTargetType(describeType: string): string {
    const gentype = FauxClassGenerator.typeMapping.get(describeType) as string;
    return gentype ? gentype : this.capitalize(describeType);
  }

  private getReferenceName(relationshipName: string, name: string): string {
    return relationshipName ? relationshipName : this.stripId(name);
  }

  private generateChildRelationship(rel: ChildRelationship): string {
    const nameToUse = this.getReferenceName(rel.relationshipName, rel.field);
    return `List<${rel.childSObject}> ${nameToUse}`;
  }

  private generateField(field: Field): string[] {
    const decls: string[] = [];
    let genType = '';
    if (field.referenceTo.length === 0) {
      // should be a normal field EXCEPT for external lookup & metadata relationship
      // which is a reference, but no referenceTo targets
      if (field.extraTypeInfo === 'externallookup') {
        genType = 'String';
      } else {
        genType = this.getTargetType(field.type);
      }
      decls.push(`${genType} ${field.name}`);
    } else {
      const nameToUse = this.getReferenceName(field.relationshipName, field.name);
      if (field.referenceTo.length > 1) {
        decls.push(`SObject ${nameToUse}`);
      } else {
        decls.push(`${field.referenceTo} ${nameToUse}`);
      }
      // field.type will be "reference", but the actual type is an Id for Apex
      decls.push(`Id ${field.name}`);
    }
    return decls;
  }

  private generateFauxClasses(sobjects: SObject[], targetFolder: string): void {
    if (!fs.existsSync(targetFolder)) {
      notifications.writeLog('Creating output folder in ' + targetFolder);
      fs.mkdirpSync(targetFolder);
    }
    for (const sobject of sobjects) {
      if (sobject.name) {
        this.generateFauxClass(targetFolder, sobject);
      }
    }
  }

  private generateFauxClassDecls(sobject: SObject): string[] {
    const declarations: string[] = [];
    if (sobject.fields) {
      for (const field of sobject.fields) {
        const decls: string[] = this.generateField(field);
        if (decls && decls.length > 0) {
          for (const decl of decls) {
            declarations.push(decl);
          }
        }
      }
    }

    if (sobject.childRelationships) {
      for (const rel of sobject.childRelationships) {
        if (rel.relationshipName) {
          const decl: string = this.generateChildRelationship(rel);
          if (decl) {
            declarations.push(decl);
          }
        }
      }
      for (const rel of sobject.childRelationships) {
        // handle the odd childRelationships last (without relationshipName)
        if (!rel.relationshipName) {
          const decl: string = this.generateChildRelationship(rel);
          if (decl) {
            declarations.push(decl);
          }
        }
      }
    }
    return declarations;
  }

  private generateFauxClassTextFromDecls(className: string, declarations: string[]): string {
    // sort, but filter out duplicates
    // which can happen due to childRelationships w/o a relationshipName
    declarations.sort(
      (first: string, second: string): number => {
        return FauxClassGenerator.fieldName(first) > FauxClassGenerator.fieldName(second) ? 1 : -1;
      }
    );

    declarations = declarations.filter(
      (value: string, index: number, array: string[]): boolean => {
        return (
          !index ||
          FauxClassGenerator.fieldName(value) !== FauxClassGenerator.fieldName(array[index - 1])
        );
      }
    );

    const indentAndModifier = '    global ';
    const classDeclaration = `global class ${className} {${EOL}`;
    const declarationLines = declarations.join(`;${EOL}${indentAndModifier}`);
    const classConstructor = `${indentAndModifier}${className} () ${EOL}    {${EOL}    }${EOL}`;
    const classComment = `\/\/ This file is generated as an Apex representation of the
    \/\/     corresponding sObject and its fields.
    \/\/ This read-only file is used by the Apex Language Server to
    \/\/     provide code smartness, and is deleted each time you
    \/\/     refresh your sObject definitions.
    \/\/ To edit your sObjects and their fields, edit the corresponding
    \/\/     .object-meta.xml and .field-meta.xml files.
    
    `;
    const generatedClass = `${classComment}${classDeclaration}${indentAndModifier}${declarationLines};${EOL}${EOL}${classConstructor}}`;

    return generatedClass;
  }

  private cleanupSObjectFolders(baseSObjectsFolder: string) {
    if (fs.existsSync(baseSObjectsFolder)) {
      notifications.writeLog('Cleaning previously downloaded objects in ' + baseSObjectsFolder);
      fs.removeSync(baseSObjectsFolder);
    }
  }

  private logSObjects(sobjectKind: string, fetchedLength: number) {
    if (fetchedLength > 0) {
      notifications.writeLog(
        'Fetched ' + fetchedLength + ' ' + sobjectKind + ' sObjects from the org\n'
      );
    }
  }

  private logFetchedObjects(standardSObjects: SObject[], customSObjects: SObject[]) {
    this.logSObjects('Standard', standardSObjects.length);
    this.logSObjects('Custom', customSObjects.length);
  }
}
