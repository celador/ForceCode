import * as vscode from 'vscode';
import * as parsers from '../parsers';
import { saveService, notifications } from '../services';
import * as path from 'path';
import { deployFiles, createPackageXML, FCCancellationToken } from '.';

// =======================================================================================================================================
// ================================                Lightning Components               ===========================================
// =======================================================================================================================================
// TODO: Add cancellation token to updates. Updates with LCs are quick, so is this possible??
export async function saveAura(
  document: vscode.TextDocument,
  name: string | undefined,
  cancellationToken: FCCancellationToken,
  Metadata?: {},
  forceCompile?: boolean
): Promise<any> {
  const ext: string | undefined = parsers.getFileExtension(document);
  let DefType: string | undefined = getAuraDefTypeFromDocument(document);
  let Format: string = getAuraFormatFromDocument();
  let Source: string = document.getText();
  let currentObjectDefinition: any = undefined;
  // Aura Bundles are a special case, since they can be upserted with the Tooling API
  // Instead of needing to be compiled, like Classes and Pages..
  const results = await getAuraBundle();
  const bundle = await ensureAuraBundle(results);
  if (Array.isArray(bundle)) {
    if (Metadata) {
      return updateMetaData(bundle);
    } else {
      const definitions = await getAuraDefinition(bundle);
      return upsertAuraDefinition(definitions, bundle);
    }
  } else {
    return Promise.resolve(bundle);
  }

  function getAuraBundle() {
    return vscode.window.forceCode.conn.tooling.sobject('AuraDefinitionBundle').find({
      DeveloperName: name,
      NamespacePrefix: vscode.window.forceCode.config.prefix || '',
    });
  }

  async function ensureAuraBundle(results: any) {
    // If the Bundle doesn't exist, create it, else Do nothing
    if (name && (results.length === 0 || !results[0])) {
      // Create Aura Definition Bundle
      await createPackageXML([document.fileName], vscode.window.forceCode.storageRoot);
      const files: string[] = [];
      files.push(path.join('aura', name));
      files.push('package.xml');
      return deployFiles(files, cancellationToken, vscode.window.forceCode.storageRoot);
    } else {
      return Promise.resolve(results);
    }
  }

  function updateMetaData(bundle: any) {
    return vscode.window.forceCode.conn.tooling
      .sobject('AuraDefinitionBundle')
      .update({
        Metadata: Metadata,
        Id: bundle[0].Id,
      })
      .then(
        (res) => {
          return res;
        },
        (err) => {
          return err;
        }
      );
  }

  function getAuraDefinition(bundle: any) {
    return vscode.window.forceCode.conn.tooling.sobject('AuraDefinition').find({
      AuraDefinitionBundleId: bundle[0].Id,
    });
  }
  function upsertAuraDefinition(definitions: any, bundle: any) {
    // If the Definition doesn't exist, create it
    let def: any[] = definitions.filter((result: any) => result.DefType === DefType);
    currentObjectDefinition = def.length > 0 ? def[0] : undefined;
    if (currentObjectDefinition !== undefined) {
      const serverContents: string = currentObjectDefinition.Source;
      if (!forceCompile && !saveService.compareContents(document.fileName, serverContents)) {
        return notifications
          .showWarning('Someone has changed this file!', 'Diff', 'Overwrite')
          .then((s) => {
            if (s === 'Diff') {
              vscode.commands.executeCommand('ForceCode.diff', document.uri);
              return {};
            }
            if (s === 'Overwrite') {
              return updateAura();
            }
            return {};
          });
      } else {
        return updateAura();
      }
    } else if (bundle[0]) {
      return vscode.window.forceCode.conn.tooling
        .sobject('AuraDefinition')
        .create({
          AuraDefinitionBundleId: bundle[0].Id || bundle[0].id,
          DefType,
          Format,
          Source,
        })
        .catch((_err) => {
          return {
            State: 'Error',
            message:
              'Error: File not created on server either because the name of the file is incorrect or there are syntax errors.',
          };
        });
    }
    return undefined;
  }

  function updateAura() {
    return vscode.window.forceCode.conn.tooling
      .sobject('AuraDefinition')
      .update({ Id: currentObjectDefinition.Id, Source })
      .catch((err) => {
        return { State: 'Error', message: err.message || err };
      });
  }

  function getAuraFormatFromDocument() {
    // is 'js', 'css', or 'xml'
    switch (ext) {
      case 'js':
        return 'JS';
      case 'css':
        return 'CSS';
      default:
        return 'XML';
    }
  }
}

export function getAuraDefTypeFromDocument(document: vscode.TextDocument) {
  const fname: string | undefined = parsers.getName(document, 'AuraDefinition');
  const extension: string | undefined = parsers.getFileExtension(document);
  const fileName: string | undefined = parsers.getFileName(document);
  switch (extension) {
    case 'app':
      // APPLICATION — Lightning Components app
      return 'APPLICATION';
    case 'cmp':
      // COMPONENT — component markup
      return 'COMPONENT';
    case 'auradoc':
      // DOCUMENTATION — documentation markup
      return 'DOCUMENTATION';
    case 'css':
      // STYLE — style (CSS) resource
      return 'STYLE';
    case 'evt':
      // EVENT — event definition
      return 'EVENT';
    case 'design':
      // DESIGN — design definition
      return 'DESIGN';
    case 'svg':
      // SVG — SVG graphic resource
      return 'SVG';
    case 'js':
      if (!fileName || !fname) {
        return undefined;
      }
      let fileNameEndsWith: string = fileName.replace(fname, '').toLowerCase();
      if (fileNameEndsWith === 'controller') {
        // CONTROLLER — client-side controller
        return 'CONTROLLER';
      } else if (fileNameEndsWith === 'helper') {
        // HELPER — client-side helper
        return 'HELPER';
      } else if (fileNameEndsWith === 'renderer') {
        // RENDERER — client-side renderer
        return 'RENDERER';
      }
      break;
    case 'tokens':
      return 'TOKENS';
    case 'intf':
      return 'INTERFACE';
    case 'xml':
      return 'Metadata';
    default:
      throw `Unknown extension: ${extension} .`;
  }
  // Yet to be implemented
  // PROVIDER — reserved for future use
  // TESTSUITE — reserved for future use
  // MODEL — deprecated, do not use
}
