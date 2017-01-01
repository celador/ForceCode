import * as vscode from 'vscode';
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

enum typeMember {
    constructors,
    methods,
    properties
}

function combine(prev, curr) { return prev.concat(curr); }

export function getCompletions(svc) {
    var requestUrl: string = svc.conn.instanceUrl + '/services/data/v38.0/tooling/completions?type=apex';
    var headers: any = {
        'Accept': 'application/json',
        'Authorization': 'OAuth ' + svc.conn.accessToken,
    };
    fetch(requestUrl, { method: 'GET', headers }).then(response => response.json()).then(json => {
        svc.declarations = json.publicDeclarations;


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
        // var line: string = this.getEntireLine(document, position);
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
        return Promise.resolve(completions);

    }
    public getEntireLine(document: vscode.TextDocument, position: vscode.Position): string {
        var charCount: number = 0;
        var line: string = '';
        while (line.length <= 1 && line.charAt(0) !== ';') {
            charCount += 1;
            line = document.getText(new vscode.Range(position.translate(0, -charCount), position))
        }
        return line;
    }
    public matchesConstructor(line: string) {
        return line.match(/new\s+[a-z_0-9\.]*$/i);
    }
    public wordParser(word: string) {
        // Local variables, class names, and namespaces can all hypothetically use the same identifiers, 
        // The Apex parser evaluates expressions in the form of name1.name2.[...].nameN as follows:
        // 1. The parser first assumes that name1 is a local variable with name2 - nameN as field references.
        if (word) {
            //
        }
        // 2. If the first assumption does not hold true, the parser then assumes that name1 is a class name and name2 is a static variable name
        // with name3 - nameN as field references.
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
