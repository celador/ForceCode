import * as vscode from 'vscode';
import fs = require('fs-extra');
import path = require('path');
import { ForcecodeCommand } from './forcecodeCommand';

export class CreateClass extends ForcecodeCommand {
  constructor() {
    super();
    this.commandName = 'ForceCode.createClass';
    this.name = 'Creating file';
    this.hidden = false;
    this.description =
      'Create an Aura Component, Class, LWC, Trigger, or Visualforce page/component';
    this.detail = 'Creates a new file';
    this.icon = 'plus';
    this.label = 'New...';
  }

  public command(context: any, selectedResource: any): any {
    // ask what the user wants to create

    return new Promise((resolve, reject) => {
      var fileOptions: vscode.QuickPickItem[] = [
        {
          label: 'Aura Component',
          description: 'Create an Aura Component AKA a Lightning Component',
        },
        {
          label: 'Class',
          description: 'Create an Apex Class',
        },
        {
          label: 'Lightning Web Component',
          description: "Create a LWC. You can only save LWC's with API version >= 45.0",
        },
        {
          label: 'Trigger',
          description:
            'Create an Apex Trigger. You will be asked what object to create the trigger on',
        },
        {
          label: 'Visualforce Page',
          description: 'Create a Visualforce Page',
        },
        {
          label: 'Visualforce Component',
          description: 'Create a Visualforce Component',
        },
      ];
      let config: {} = {
        placeHolder: 'Choose a file type...',
        ignoreFocusOut: true,
      };
      vscode.window.showQuickPick(fileOptions, config).then(selection => {
        if (!selection) {
          reject(this.cancellationToken.cancel());
          return;
        }
        getFileName(selection.label).then(name => {
          if (!name) {
            resolve();
            return;
          }
          switch (selection.label) {
            case 'Aura Component': {
              createAura(name, resolve, reject);
              break;
            }
            case 'Class': {
              createClass(name, resolve);
              break;
            }
            case 'Lightning Web Component': {
              createLWC(name, resolve);
              break;
            }
            case 'Trigger': {
              createTrigger(name, resolve);
              break;
            }
            case 'Visualforce Page': {
              createVFP(name, resolve);
              break;
            }
            case 'Visualforce Component': {
              createVFC(name, resolve);
              break;
            }
            default: {
              reject();
              return;
            }
          }
        });
      });
    });

    function getFileName(type: string): Promise<string> {
      let options: vscode.InputBoxOptions = {
        placeHolder: 'File name',
        prompt: `Enter ${type} name`,
        ignoreFocusOut: true,
      };
      return new Promise((resolve, reject) => {
        vscode.window.showInputBox(options).then(filename => {
          if (!filename) {
            resolve();
            return;
          } else {
            const fnameShift = filename.split('.').shift();
            if (fnameShift) {
              resolve(fnameShift.trim());
            } else {
              reject();
            }
            return;
          }
        });
      });
    }

    function createFolder(typeFolder: string, name?: string): string {
      var metaPath: string = path.join(vscode.window.forceCode.projectRoot, typeFolder);
      if (name) {
        metaPath = path.join(metaPath, name);
      }
      if (!fs.pathExistsSync(metaPath)) {
        // create the dir
        fs.mkdirpSync(metaPath);
      }
      return metaPath;
    }

    function createMetaFile(name: string, type: string, filePath: string, ext: string) {
      var extra: string = '';
      if (type === 'ApexClass' || type === 'ApexTrigger') {
        extra = '<status>Active</status>';
      } else if (type === 'LightningComponentBundle') {
        extra = '<isExposed>false</isExposed>';
      } else if (type === 'AuraDefinitionBundle') {
        extra = '<description>A Lightning Component Bundle</description>';
      } else {
        extra = `<label>${name}</label>`;
      }
      var metaFile: string = `<?xml version="1.0" encoding="UTF-8"?>
<${type} xmlns="urn:metadata.tooling.soap.sforce.com" fqn="${name}">
    <apiVersion>${vscode.window.forceCode.config.apiVersion ||
      vscode.workspace.getConfiguration('force')['defaultApiVersion']}</apiVersion>
    ${extra}
</${type}>`;
      var metaFileName: string = path.join(filePath, name + '.' + ext + '-meta.xml');
      fs.outputFileSync(metaFileName, metaFile);
    }

    function createSrcFile(name: string, thePath: string, src: string, ext: string, resolve: any) {
      const ofPath: string = path.join(thePath, name + '.' + ext);
      fs.outputFileSync(ofPath, src);
      return vscode.workspace.openTextDocument(ofPath).then(document => {
        resolve(vscode.window.showTextDocument(document, vscode.ViewColumn.One));
        return;
      });
    }

    function createAura(name: string, resolve: any, reject: any) {
      // ask if the user wants an App, Event, or Component
      var auraOptions: vscode.QuickPickItem[] = [
        {
          label: 'App',
          description: 'Create an Aura App',
        },
        {
          label: 'Component',
          description: 'Create an Aura Component',
        },
        {
          label: 'Event',
          description: 'Create an Aura Event',
        },
        {
          label: 'Interface',
          description: 'Create an Aura Interface',
        },
      ];
      let config: {} = {
        placeHolder: 'Choose a type...',
        ignoreFocusOut: true,
      };
      vscode.window.showQuickPick(auraOptions, config).then(type => {
        if (!type) {
          reject();
          return;
        }

        if (type.label === 'App') {
          createAuraCmpApp(name, resolve, 'app');
        } else if (type.label === 'Event') {
          createAuraEvent(name, resolve);
        } else if (type.label === 'Interface') {
          createAuraInt(name, resolve);
        } else {
          createAuraCmpApp(name, resolve, 'cmp');
        }
      });
    }

    function createAuraEvent(name: string, resolve: any) {
      const ext = 'evt';
      const folderPath = createFolder('aura', name);
      createMetaFile(name, 'AuraDefinitionBundle', folderPath, ext);
      const fileContents = `<aura:event type="APPLICATION" description="Event template"/>`;
      createSrcFile(name, folderPath, fileContents, ext, resolve);
    }

    function createAuraInt(name: string, resolve: any) {
      const ext = 'intf';
      const folderPath = createFolder('aura', name);
      createMetaFile(name, 'AuraDefinitionBundle', folderPath, ext);
      const fileContents = `<aura:interface description="Interface template">
    <aura:attribute name="example" type="String" default="" description="An example attribute."/>
</aura:interface>`;
      createSrcFile(name, folderPath, fileContents, ext, resolve);
    }

    function createAuraCmpApp(name: string, resolve: any, ext: string) {
      // create the folder, cmp, and meta.xml
      const folderPath = createFolder('aura', name);
      createMetaFile(name, 'AuraDefinitionBundle', folderPath, ext);
      const contSrc = `({
    myAction : function(component, event, helper) {

    }
})`;
      const contPath: string = path.join(folderPath, name + 'Controller.js');
      fs.outputFileSync(contPath, contSrc);
      const helpSrc = `({
    helperMethod : function() {

    }
})`;
      const helpPath: string = path.join(folderPath, name + 'Helper.js');
      fs.outputFileSync(helpPath, helpSrc);
      const docSrc = `<aura:documentation>
    <aura:description>Documentation</aura:description>
    <aura:example name="ExampleName" ref="exampleComponentName" label="Label">
        Example Description
    </aura:example>
</aura:documentation>`;
      const docPath: string = path.join(folderPath, name + '.auradoc');
      fs.outputFileSync(docPath, docSrc);
      if (ext === 'cmp') {
        const desSrc = `<design:component >

</design:component>`;
        const desPath: string = path.join(folderPath, name + '.design');
        fs.outputFileSync(desPath, desSrc);
      }
      const renSrc = `({

// Your renderer method overrides go here

})`;
      const renPath: string = path.join(folderPath, name + 'Renderer.js');
      fs.outputFileSync(renPath, renSrc);
      const cssSrc = `.THIS {
    
}`;
      const cssPath: string = path.join(folderPath, name + '.css');
      fs.outputFileSync(cssPath, cssSrc);
      const svgSrc = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="120px" height="120px" viewBox="0 0 120 120" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <path d="M120,108 C120,114.6 114.6,120 108,120 L12,120 C5.4,120 0,114.6 0,108 L0,12 C0,5.4 5.4,0 12,0 L108,0 C114.6,0 120,5.4 120,12 L120,108 L120,108 Z" id="Shape" fill="#2A739E"/>
        <path d="M77.7383308,20 L61.1640113,20 L44.7300055,63.2000173 L56.0543288,63.2000173 L40,99.623291 L72.7458388,54.5871812 L60.907727,54.5871812 L77.7383308,20 Z" id="Path-1" fill="#FFFFFF"/>
    </g>
</svg>`;
      const svgPath: string = path.join(folderPath, name + '.svg');
      fs.outputFileSync(svgPath, svgSrc);
      var fileContents;
      if (ext === 'cmp') {
        fileContents = `<aura:component>

</aura:component>`;
      } else {
        fileContents = `<aura:application>

</aura:application>	`;
      }
      createSrcFile(name, folderPath, fileContents, ext, resolve);
    }

    function createLWC(name: string, resolve: any) {
      // create the folder, html, js, and js.meta.xml
      const folderPath = createFolder('lwc', name);
      createMetaFile(name, 'LightningComponentBundle', folderPath, 'js');
      const jsPath: string = path.join(folderPath, name + '.js');
      const jsClassName: string = name.charAt(0).toUpperCase() + name.slice(1);
      const src = `import { LightningElement } from 'lwc';
 
export default class ${jsClassName} extends LightningElement {}`;
      fs.outputFileSync(jsPath, src);
      const fileContents = `<template>

</template>`;
      createSrcFile(name, folderPath, fileContents, 'html', resolve);
    }

    function createTrigger(name: string, resolve: any) {
      const ext = 'trigger';
      const folderPath = createFolder('triggers');
      createMetaFile(name, 'ApexTrigger', folderPath, ext);
      // ask the user info on what object the trigger is on, then generate the file
      let options: vscode.InputBoxOptions = {
        placeHolder: 'Object name',
        prompt: `Enter the name of the object the trigger will fire on.`,
        ignoreFocusOut: true,
      };
      vscode.window.showInputBox(options).then(objname => {
        if (!objname) {
          return resolve();
        }

        const fileContents = `trigger ${name} on ${objname} (before insert, before update, before delete, after insert, after update, after delete, after undelete) {
    
}`;
        createSrcFile(name, folderPath, fileContents, ext, resolve);
      });
    }

    function createVFC(name: string, resolve: any) {
      // create the folder and component
      const ext = 'component';
      const folderPath = createFolder('components');
      createMetaFile(name, 'ApexComponent', folderPath, ext);
      const fileContents = `<apex:component>

</apex:component>`;
      createSrcFile(name, folderPath, fileContents, ext, resolve);
    }

    function createVFP(name: string, resolve: any) {
      // create the folder and page
      const ext = 'page';
      const folderPath = createFolder('pages');
      createMetaFile(name, 'ApexPage', folderPath, ext);
      const fileContents = `<apex:page>

</apex:page>`;
      createSrcFile(name, folderPath, fileContents, ext, resolve);
    }

    function createClass(name: string, resolve: any) {
      const ext = 'cls';
      const folderPath = createFolder('classes');
      createMetaFile(name, 'ApexClass', folderPath, ext);
      var fileContents: string = `public with sharing class ${name} {

}`;
      createSrcFile(name, folderPath, fileContents, ext, resolve);
    }
  }
}
