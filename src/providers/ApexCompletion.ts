import * as vscode from 'vscode';
import _utils from './ApexCompletionUtils';
const utils: any = new _utils();
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


        // Here we're doing something 

        // Get Modules
        var _modules: string[] = Object.keys(json.publicDeclarations);
        // Get Types
        var _classes: string[] = _modules.filter(key => {
            return key === 'System' || key === 'Schema';
        }).map(key => {
            return Object.keys(json.publicDeclarations[key]);
        }).reduce(combine);


        var moduleCompletions: vscode.CompletionItem[] = _modules.map(key => new vscode.CompletionItem(key, vscode.CompletionItemKind.Module));
        var classCompletions: vscode.CompletionItem[] = _classes.map(key => new vscode.CompletionItem(key, vscode.CompletionItemKind.Class));
        svc.completions = moduleCompletions
            .concat(classCompletions);

        // // Get the method names
        // var methodCompletions: vscode.CompletionItem[] = completions(_modules, json, completionItemFromMethod);
        // // Get the constructor names
        // var constructorCompletions: vscode.CompletionItem[] = completions(_modules, json, completionItemFromConstructor);
        // .concat(methodCompletions)
        // .concat(constructorCompletions);
    });
    return svc;
}

export default class ApexCompletionProvider implements vscode.CompletionItemProvider {
    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.CompletionItem[]> {
        var completions: vscode.CompletionItem[] = [];
        var line: string = utils.getEntireLine(document, position);
        console.log(line);
        // if (this.matchesConstructor(line)) {
        //     // Get all the Contstructors that should be visible

        //     // Get the token(s) between the 'new' keyword and the end of the line
        //     // Split on .
        //     // Parse the first word.


        //     // Global Constructors (Schema and System)
        // }



        // var prevCharRange: vscode.Range = new vscode.Range(position.translate(0, -1), position);
        // var prevChar: string = document.getText(prevCharRange);
        // var atSep: Boolean = prevChar === '.';

        // var word: string = '';
        // if (document.getWordRangeAtPosition(position)) {
        //     word = document.getText(document.getWordRangeAtPosition(position));

        // }
        return Promise.resolve(vscode.window.forceCode.completions);

    }
    public matchesModule(line: string) {
        return line.match(/\s*$/i);
    }
    public matchesClass(line: string) {
        return line.match(/\s*$/i);
    }
    public expressionParser(word: string) {
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
    public isLocalVariable(symbolTable: SymbolTable, word: string): boolean {
        // if (/*word exists in symboleTable*/) {
        //     return true;
        // }
        return false;
    }
}
