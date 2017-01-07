import * as vscode from 'vscode';
import { IApexCompletionUtils } from './ApexCompletionUtils';
import _utils from './ApexCompletionUtils';
const fetch: any = require('node-fetch');

interface SalesforceClass {
    constructors: SalesforceConstructor[];
    methods: SalesforceMethod[];
    properties: SalesforceProperty[];
}

interface SalesforceMethod {
    argTypes: string[];
    isStatic: boolean;
    methodDoc?: string;
    name: string;
    parameters: SalesforceParameter[];
    references: any[];
}
interface SalesforceProperty {
    name: string;
    references: any[];
}

interface SalesforceConstructor {
    methodDoc?: string;
    name: string;
    parameters: SalesforceParameter[];
    references: any[];
}

interface SalesforceParameter {
    name: string;
    type: string;
}

interface SymbolTable {

}

enum SalesforceType {
    String,
    Exception
}
enum typeMember {
    constructors,
    methods,
    properties
}

export default class ApexCompletionProvider implements vscode.CompletionItemProvider {
    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.CompletionItem[]> {
        const utils: IApexCompletionUtils = new _utils(document, position);
        var completions: vscode.CompletionItem[] = [];
        if (utils.segments.length) {
            if (utils.shouldSuggestNamespace()) {
                completions = completions.concat(getModuleCompletions());
            }
            if (utils.shouldSuggestTopLevelType()) {
                completions = completions.concat(getTopLevelTypeCompletions());
            }
        }
        return Promise.resolve(completions);
    }
}


function getTopLevelTypeCompletions() {
    var classCompletions: vscode.CompletionItem[] = [];
    // Top-level types don't need namespace prefix, 
    if (vscode.window.forceCode.declarations && vscode.window.forceCode.declarations.public) {
        // Get Public Top Level Types
        var publicClasses: string[] = Object.keys(vscode.window.forceCode.declarations.public).filter(key => {
            // Schema is imported by default and System is the default namespace
            return key === 'System' || key === 'Schema';
        }).map(key => {
            return Object.keys(vscode.window.forceCode.declarations.public[key]);
        }).reduce(combine);
        classCompletions = classCompletions.concat(publicClasses.map(key => new vscode.CompletionItem(key, vscode.CompletionItemKind.Class)));
    }
    if (vscode.window.forceCode.declarations && vscode.window.forceCode.declarations.private.length) {
        classCompletions = classCompletions.concat(vscode.window.forceCode.declarations.private.map(record => {
            var completion: vscode.CompletionItem = new vscode.CompletionItem(record.Name, vscode.CompletionItemKind.Class);
            completion.detail = record.SymbolTable.tableDeclaration.modifiers.join(' ') + ' ' + record.NamespacePrefix ? record.NamespacePrefix + '.' + record.Name : record.Name;
            var methodText = record.SymbolTable.methods.length ? `Methods: ${record.SymbolTable.methods.map(m => `${m.name}(${m.parameters.map(p => `${p.name}:${p.type}`).join(', ')})`).join('\n\t')}` : '';
            completion.documentation = methodText;
            return completion;
        }));
    }
    if (vscode.window.forceCode.declarations && vscode.window.forceCode.declarations.managed.length) {
        classCompletions = classCompletions.concat(vscode.window.forceCode.declarations.managed.map(record => {
            var completion: vscode.CompletionItem = new vscode.CompletionItem(record.NamespacePrefix + '.' + record.Name, vscode.CompletionItemKind.Class);
            return completion;
        }));
    }
    return classCompletions;
}

function getModuleCompletions() {
    // Get Modules
    if (vscode.window.forceCode.declarations && vscode.window.forceCode.declarations.public) {
        var modules: string[] = Object.keys(vscode.window.forceCode.declarations.public);
        modules.push(vscode.window.forceCode.config.prefix);
        if (Array.isArray(vscode.window.forceCode.declarations.managed) && vscode.window.forceCode.declarations.managed.length) {
            vscode.window.forceCode.declarations.managed.map(c => c.NamespacePrefix).reduce(unique, []).forEach(function (name) {
                modules.push(name);
            });
        }
        return modules.map(key => new vscode.CompletionItem(key, vscode.CompletionItemKind.Module));
    }
    return [];
}

function unique(prev, curr) {
    return prev.indexOf(curr) > -1 ? prev : prev.concat(curr);
};

function completionItemFromProperty(_class: SalesforceClass, property: SalesforceProperty): vscode.CompletionItem {
    var completionItem: vscode.CompletionItem = new vscode.CompletionItem(property.name, vscode.CompletionItemKind.Method);
    completionItem.detail = '(property) Class.property: type';
    return completionItem;
}
function completionItemFromMethod(_class: SalesforceClass, method: SalesforceMethod): vscode.CompletionItem {
    var completionItem: vscode.CompletionItem = new vscode.CompletionItem(method.name, vscode.CompletionItemKind.Method);
    completionItem.documentation = method.methodDoc;
    completionItem.detail = '(method) Class.method(' + method.parameters.map(param => param.name + ': ' + param.type).join(', ') + ')';
    completionItem.insertText = method.name + '()';
    return completionItem;
}
function completionItemFromConstructor(_class: SalesforceClass, constructor: SalesforceConstructor): vscode.CompletionItem {
    var completionItem: vscode.CompletionItem = new vscode.CompletionItem(constructor.name, vscode.CompletionItemKind.Method);
    completionItem.documentation = constructor.methodDoc;
    completionItem.detail = '(constructor) Class.constructor(' + constructor.parameters.map(param => param.name + ': ' + param.type).join(', ') + ')';
    completionItem.insertText = constructor.name + '()';
    return completionItem;
}
function classMemberCompletions(_class: SalesforceClass, member: typeMember, fn: Function): vscode.CompletionItem[] {
    if (Array.isArray(_class[member.toString()])) {
        return _class[member.toString()].map(m => fn(_class, m));
    }
    return [];
}
function combine(prev, curr) { return prev.concat(curr); }

export function getPublicDeclarations(svc) {
    var requestUrl: string = svc.conn.instanceUrl + '/services/data/v38.0/tooling/completions?type=apex';
    var headers: any = {
        'Accept': 'application/json',
        'Authorization': 'OAuth ' + svc.conn.accessToken,
    };
    fetch(requestUrl, { method: 'GET', headers }).then(response => response.json()).then(json => {
        svc.declarations.public = json.publicDeclarations;
    });
    return svc;
}
function expressionParser(word: string) {
    // There are five kinds of tokens:
    // Modules, Types, Methods, Fields, Constructors
    // A Module is a collection of Types
    // A Type is a either a built in type, sObject, or custom (class)
    // A Method is a function
    // a Field is a named instance of a Type
    // A Constructor is a function named for it's class that runs when an instance of the class is instantiated

    // Local variables, class names, and namespaces can all hypothetically use the same identifiers, 
    // The Apex parser evaluates expressions in the form of name1.name2.[...].nameN as follows:
    // 1. The parser first assumes that name1 is a local variable with name2 - nameN as field references.
    if (word) {
        //
    }
    // 2. If the first assumption does not hold true, 
    // the parser then assumes that name1 is a class name and name2 is a static variable name with name3 - nameN as field references.
    // 3. If the second assumption does not hold true, the parser then assumes that name1 is a namespace name, name2 is a class name,
    // name3 is a static variable name, and name4 - nameN are field references.
    // 4. If the third assumption does not hold true, the parser reports an error.
}
function isLocalVariable(symbolTable: SymbolTable, word: string): boolean {
    // if (/*word exists in symboleTable*/) {
    //     return true;
    // }
    return false;
}

function getModules(): string[] {
    var declarations: string[] = [];
    if (vscode.window.forceCode.declarations) {
        // Public
        declarations.concat(Object.keys(vscode.window.forceCode.declarations.public || []));
        // Private
        declarations.concat(Object.keys(vscode.window.forceCode.declarations.private || []));
        // Managed
        declarations.concat(Object.keys(vscode.window.forceCode.declarations.managed || []));
    }
    return declarations;
}
