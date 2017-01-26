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
            if (utils.shouldSuggestNamespacedType()) {
                completions = completions.concat(getNamespacedTypeCompletions(utils.segments[0]));
            }
        }
        return Promise.resolve(completions);
    }
}

function getPublicNamespace(namespace: string) {
    if (isPublicNamespace(namespace)) {
        return Object.keys(vscode.window.forceCode.declarations.public).filter(key => {
            return key.toLowerCase() === namespace;
        })[0];
    }
}

function isPublicNamespace(namespace: string) {
    return Object.keys(vscode.window.forceCode.declarations.public).some(key => {
        return key.toLowerCase() === namespace;
    });
}

function isPrivateNamespace(namespace: string) {
    return vscode.window.forceCode.declarations.private.some(record => {
        return record.NamespacePrefix.toLowerCase() === namespace;
    });
}

function isManagedNamespace(namespace: string) {
    return vscode.window.forceCode.declarations.managed.some(record => {
        return record.NamespacePrefix.toLowerCase() === namespace;
    });
}


function getNamespacedTypeCompletions(namespace: string) {
    var classCompletions: vscode.CompletionItem[] = [];
    // Top-level types don't need namespace prefix, 
    if (vscode.window.forceCode.declarations && vscode.window.forceCode.declarations.public && isPublicNamespace(namespace)) {
        return completionItemsFromPublicNamespace(getPublicNamespace(namespace));
    }
    if (vscode.window.forceCode.declarations && vscode.window.forceCode.declarations.private.length && isPrivateNamespace(namespace)) {
        return vscode.window.forceCode.declarations.private.map(completionItemFromCustomType);
    }
    if (vscode.window.forceCode.declarations && vscode.window.forceCode.declarations.managed.length && isManagedNamespace(namespace)) {
        return vscode.window.forceCode.declarations.managed.map(completionItemFromCustomType);
    }
    return classCompletions;
}

function getTopLevelTypeCompletions() {
    var classCompletions: vscode.CompletionItem[] = [];
    // Top-level types don't need namespace prefix, Top-Level types are anything in the org namespace, or System or Schema types, 
    if (vscode.window.forceCode.declarations && vscode.window.forceCode.declarations.public) {
        classCompletions = classCompletions.concat(['System', 'Schema']
            .map(completionItemsFromPublicNamespace)
            .reduce(combine));
    }
    if (vscode.window.forceCode.declarations && vscode.window.forceCode.declarations.private.length) {
        classCompletions = classCompletions.concat(vscode.window.forceCode.declarations.private.map(completionItemFromCustomType));
    }
    return classCompletions;
}

function getModuleCompletions() {
    // TODO: Improve this with some documenation about each module 
    // Get Modules
    if (vscode.window.forceCode.declarations && vscode.window.forceCode.declarations.public) {
        // public
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

function completionItemsFromPublicNamespace(namespace): vscode.CompletionItem[] {
    var names: string[] = Object.keys(vscode.window.forceCode.declarations.public[namespace]);
    return names.map(name => {
        var completion: vscode.CompletionItem = new vscode.CompletionItem(name, vscode.CompletionItemKind.Class);
        var type: any = vscode.window.forceCode.declarations.public[namespace][name];
        var constructors: string = type.constructors.length ? `Constructors:\n${type.constructors.map(m => `${m.name}(${m.parameters.map(p => `${p.name}:${p.type}`).join(', ')})`).join('\n')}` : '';
        var methods: string = type.methods.length ? `Methods:\n${type.methods.map(m => `${m.isStatic ? 'static' : 'instance'} ${m.name}(${m.parameters.map(p => `${p.name}:${p.type}`).join(', ')})`).join('\n')}` : '';
        var properties: string = type.properties.length ? `Properties:\n${type.properties.map(m => `${m.name}`).join('\n')}` : '';
        completion.detail = namespace + '.' + name;
        completion.documentation = [constructors, methods, properties].reduce((p, c) => p ? p + '\n' + c : (c ? c : ''));
        return completion;
    });
}

function completionItemFromCustomType(record) {
    var completion: vscode.CompletionItem = new vscode.CompletionItem(record.Name, vscode.CompletionItemKind.Class);
    var signature: string = record.SymbolTable.tableDeclaration.modifiers.join(' ') + ' ' + (record.NamespacePrefix ? record.NamespacePrefix + '.' + record.Name : record.Name);
    completion.detail = (record.NamespacePrefix ? record.NamespacePrefix + '.' + record.Name : record.Name);
    var constructors: string = record.SymbolTable.constructors.length ? `Constructors:\n${record.SymbolTable.constructors.map(m => `${m.name}(${m.parameters.map(p => `${p.name}:${p.type}`).join(', ')})`).join('\n')}` : '';
    var methods: string = record.SymbolTable.methods.length ? `Methods:\n${record.SymbolTable.methods.map(m => `${m.modifiers.join(' ')} ${m.name}(${m.parameters.map(p => `${p.name}:${p.type}`).join(', ')})`).join('\n')}` : '';
    var properties: string = record.SymbolTable.properties.length ? `Properties:\n${record.SymbolTable.properties.map(m => `${m.name}`).join('\n')}` : '';
    completion.documentation = signature + '\n' + [constructors, methods, properties].reduce((p, c) => p ? p + '\n' + c : (c ? c : ''));
    return completion;
}

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
