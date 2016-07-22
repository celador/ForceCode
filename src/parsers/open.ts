export function getIcon(toolingType: string) {
    'use strict';
    switch (toolingType) {
        case 'ApexClass':
            return 'file-text';
        case 'ApexPage':
            return 'code';
        case 'ApexTrigger':
            return 'zap';
        case 'ApexComponent':
            return 'gist';
        case 'ApexLog':
            return 'bug';
        case 'CustomObject':
            return 'gist';
        default:
            return 'code';
    }
}
export function getExtension(toolingType: string) {
    'use strict';
    switch (toolingType) {
        case 'ApexClass':
            return 'cls';
        case 'ApexPage':
            return 'page';
        case 'ApexTrigger':
            return 'trigger';
        case 'ApexComponent':
            return 'component';
        case 'ApexLog':
            return 'log';
        default:
            return 'cls';
    }
}
export function getFolder(toolingType: string) {
    'use strict';
    switch (toolingType) {
        case 'ApexClass':
            return 'classes';
        case 'ApexPage':
            return 'pages';
        case 'ApexTrigger':
            return 'triggers';
        case 'ApexComponent':
            return 'components';
        case 'ApexLog':
            return 'logs';
        default:
            return 'classes';
    }
}
