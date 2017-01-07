import * as vscode from 'vscode';
export default class ApexCompletionUtils {
    public segments: any[] = [];
    public FULLY_QUALIFIED_NAME_SEPARATOR_CHAR: string = '.';

    public ApexCompletionUtils(prefix: string) {
        prefix = prefix.toLowerCase();
        this.segments = prefix.split(this.FULLY_QUALIFIED_NAME_SEPARATOR_CHAR);
        if (prefix.endsWith(this.FULLY_QUALIFIED_NAME_SEPARATOR_CHAR)) {
            this.segments.push('');
        }
    }


    public getEntireLine(document: vscode.TextDocument, end: vscode.Position): string {
        // get the text of the document, without comments
        var code: string = document.getText(new vscode.Range(new vscode.Position(0, 0), end)).replace(/\/\*.*\*\//g, '').replace(/(\/\/.*\n)|(\/\/.*$)/g, '');
        var counter: number = 0;
        var line: string = '';
        if (code.length) {
            // scan left until we reach a semicolon or the beginning of the file
            do {
                counter += 1;
                line = code.slice(code.length - counter);
            } while (line.charAt(0) !== ';' && code.length > counter);
        }
        return line;
    }
    public matchesConstructor(line: string) {
        // To match a Constructor, we need to make sure the "new" keyword is contained on the line
        // "new" instantiates types with a constructor, a Type must have a constructor to be able to be used with "new"
        // "new" must preceed whitespace and the cursor and part of the current line
        // There may be a token after the whitespace, in which case we follow the standard rules for expression parsing
        // The token can include alphanumberic and underscore characters, and a .
        return line.match(/new\s+[a-z_0-9\.]*$/i);
    }

    public getNamespaces(): string[] {
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

    // SomeNamespac<cursor>
    public shouldSuggestNamespace(): boolean {
        return this.segments.length <= 1;
    }

    // Top-level types don't need namespace prefix, 
    // Schema is imported by default and System is the default namespace
    // <cursor>
    // SomeTyp<cursor>
    public shouldSuggestTopLevelType(): boolean {
        return this.segments.length <= 1;
    }

    // SomeNamespace.SomeTyp<cursor>
    public shouldSuggestNamespacedType(): boolean {
        return this.segments.length === 2;
    }

    // SomeType.someMembe<cursor>
    public shouldSuggestTopLevelMember(): boolean {
        return this.segments.length === 2;
    }

    // SomeNamespace.SomeType.someMembe<cursor>
    public shouldSuggestNamespacedMember(): boolean {
        return this.segments.length === 3;
    }

    // new SomeTyp<cursor>
    public shouldSuggestTopLevelConstructor(): boolean {
        return this.segments.length <= 1;
    }

    // new SomeNamespace.SomeTyp<cursor>
    public shouldSuggestNamespacedConstructor(): boolean {
        return this.segments.length === 2;
    }

    // someVariabl<cursor>
    public shouldSuggestVariableName(): boolean {
        return this.segments.length === 1;
    }

    // someVariable.someMembe<cursor>
    public shouldSuggestVariableMember(): boolean {
        return this.segments.length === 2;
    }
}
