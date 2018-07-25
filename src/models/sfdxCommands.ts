import { commandService } from '../services';

export default [
    {
        commandName: 'sfdx.force.apex.test.class.run.delegate',
        hidden: true,
        command: function (context, selectedResource?) {
            return commandService.runCommand('ForceCode.apexTest', context, 'class');
        }
    },
    {
        commandName: 'sfdx.force.apex.test.method.run.delegate',
        hidden: true,
        command: function (context, selectedResource?) {
            return commandService.runCommand('ForceCode.apexTest', context, 'method');
        }
    },
]