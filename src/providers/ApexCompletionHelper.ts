import * as vscode from 'vscode';
export interface IApexCompletionUtils {
    line: string;
    slug: string;
    segments: string[];
    shouldSuggestConstructor: (line: string) => boolean;
    shouldSuggestNamespace: () => boolean;
    shouldSuggestTopLevelType: () => boolean;
    shouldSuggestNamespacedType: () => boolean;
    shouldSuggestTopLevelMember: () => boolean;
    shouldSuggestNamespacedMember: () => boolean;
    shouldSuggestTopLevelConstructor: () => boolean;
    shouldSuggestNamespacedConstructor: () => boolean;
    shouldSuggestVariableName: () => boolean;
    shouldSuggestVariableMember: () => boolean;
}
export default class ApexCompletionUtils implements IApexCompletionUtils {
    public line: string = '';
    public slug: string = '';
    public segments: string[] = [];
    private FULLY_QUALIFIED_NAME_SEPARATOR_CHAR: string = '.';
    constructor(document: vscode.TextDocument, end: vscode.Position) {
        this.line = this.getEntireLine(document, end);
        this.slug = this.getSlug(document, end);
        this.segments = this.slug.split(this.FULLY_QUALIFIED_NAME_SEPARATOR_CHAR);
    }

    public shouldSuggestConstructor(): boolean {
        // To match a Constructor, we need to make sure the "new" keyword is contained on the line
        // "new" instantiates types with a constructor, a Type must have a constructor to be able to be used with "new"
        // "new" must preceed whitespace and the cursor and part of the current line
        // There may be a token after the whitespace, in which case we follow the standard rules for expression parsing
        // The token can include alphanumberic and underscore characters, and a .
        return this.line.match(/new\s+[a-z_0-9\.]*$/i).length > 0;
    }
    // SomeNamespac<cursor>
    public shouldSuggestNamespace(): boolean {
        return this.segments.length <= 1;
    }
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
        return this.isConstructor() && this.segments.length <= 1;
    }
    // new SomeNamespace.SomeTyp<cursor>
    public shouldSuggestNamespacedConstructor(): boolean {
        return  this.isConstructor() && this.segments.length === 2;
    }
    // someVariabl<cursor>
    public shouldSuggestVariableName(): boolean {
        return this.segments.length === 1;
    }
    // someVariable.someMembe<cursor>
    public shouldSuggestVariableMember(): boolean {
        return this.segments.length === 2;
    }

    private isConstructor(): boolean {
        let matches: RegExpMatchArray = this.line.replace(this.slug, '').match(/new\s$/);
        return matches && matches.length > 0;
    }

    private getEntireLine(document: vscode.TextDocument, end: vscode.Position): string {
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
        return line.slice(1).trim();
    }

    private getSlug(document: vscode.TextDocument, end: vscode.Position): string {
        // get the text of the document, without comments
        var code: string = document.getText(new vscode.Range(new vscode.Position(0, 0), end)).replace(/\/\*.*\*\//g, '').replace(/(\/\/.*\n)|(\/\/.*$)/g, '');
        var counter: number = 0;
        var line: string = '';
        if (code.length) {
            // scan left until we reach a semicolon or the beginning of the file
            do {
                counter += 1;
                line = code.slice(code.length - counter);
            } while (line.charAt(0).match(/[A-Za-z_0-9\.]/) && code.length > counter);
        }
        return line.slice(1).trim().toLowerCase();
    }
}
