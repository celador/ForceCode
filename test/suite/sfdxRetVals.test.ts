export default {
  'apex:execute': {
    compiled: true,
    compileProblem: '',
    success: true,
    line: -1,
    column: -1,
    exceptionMessage: '',
    exceptionStackTrace: '',
    logs: '',
  },
  'auth:web:login': {
    orgId: '00D1N00000AAAAAAAA',
    accessToken:
      '056705ca1a726fc00e80a0bb87f7e583ba7ASDFASDFASDFADSSSDDDDDDDDDDDDDDDDDD2959d74a7801ad35a8326b44218ee410e01f00b9b257888777bddbf61ce58458d650cfd52861096bc00ea586526b39ead4ad5a413f381db10c793d220fe3adf22cc7149a06d096145002fdf762c55b2aa54290:bcbc4f44181ef455a44ca83f194a46df',
    instanceUrl: 'https://tester@my.salesforce.com',
    loginUrl: 'https://test.salesforce.com',
    username: 'test@test.com',
    cliendId: 'TESTER',
    refreshToken:
      '5Aep861AAAAAAAAAAAAAAAAAAAAAAAAAAngtJQRzVbBS8rR0RpEktJU8L8Xy7xqBBBBBBBBBBBBTWmxPGOngPcE',
  },
  'org:display': {
    username: 'test@test.com',
    id: '00D1N00000AAAAAAAA',
    accessToken:
      '056705ca1a726fc00e80a0bb87f7e583ba7ASDFASDFASDFADSSSDDDDDDDDDDDDDDDDDD2959d74a7801ad35a8326b44218ee410e01f00b9b257888777bddbf61ce58458d650cfd52861096bc00ea586526b39ead4ad5a413f381db10c793d220fe3adf22cc7149a06d096145002fdf762c55b2aa54290:bcbc4f44181ef455a44ca83f194a46df',
    instanceUrl: 'https://tester@my.salesforce.com',
    clientId: 'TESTER',
  },
  'org:list': {
    nonScratchOrgs: [
      {
        orgId: '00D1N00000AAAAAAAA',
        accessToken:
          '056705ca1a726fc00e80a0bb87f7e583ba7ASDFASDFASDFADSSSDDDDDDDDDDDDDDDDDD2959d74a7801ad35a8326b44218ee410e01f00b9b257888777bddbf61ce58458d650cfd52861096bc00ea586526b39ead4ad5a413f381db10c793d220fe3adf22cc7149a06d096145002fdf762c55b2aa54290:bcbc4f44181ef455a44ca83f194a46df',
        instanceUrl: 'https://tester@my.salesforce.com',
        loginUrl: 'https://test.salesforce.com',
        username: 'test@test.com',
        cliendId: 'TESTER',
        isDevHub: true,
        connectedStatus: 'Connected',
        lastUsed: '2019-06-29T03:45:01.852Z',
      },
    ],
    scratchOrgs: [],
  },
  'apex:log:get': {
    log: '',
  },
  'org:open': {
    orgId: '00D1N00000AAAAAAAA',
    url:
      'https://tester@my.salesforce.com/secur/frontdoor.jsp?sid=056705ca1a726fc00e80a0bb87f7e583ba7ASDFASDFASDFADSSSDDDDDDDDDDDDDDDDDD2959d74a7801ad35a8326b44218ee410e01f00b9b257888777bddbf61ce58458d650cfd52861096bc00ea586526b39ead4ad5a413f381db10c793d220fe3adf22cc7149a06d096145002fdf762c55b2aa54290:bcbc4f44181ef455a44ca83f194a46df',
    username: 'test@test.com',
  },
  'org:create': {
    orgId: '00D1N00000AAAAAAAA',
    username: 'test@test.com',
  },
  'apex:test:run': {
    summary: {
      outcome: 'Passed',
      testsRan: 1,
      passing: 1,
      failing: 0,
      skipped: 0,
      passRate: '100%',
      failRate: '0%',
      testStartTime: 'Jul 2, 2019 9:38 PM',
      testExecutionTime: '1182 ms',
      testTotalTime: '1782 ms',
      commandTime: '3894 ms',
      hostname: 'https://tester@my.salesforce.com',
      username: 'test@test.com',
      orgId: '00D1N00000AAAAAAAA',
    },
    tests: [
      {
        ApexClass: {
          attributes: {
            type: 'ApexClass',
          },
          Id: '01p1N000006VeVPQA0',
          Name: 'Test',
          NamespacePrefix: null,
        },
        MethodName: 'test',
        Outcome: 'Pass',
        RunTime: 1182,
        FullName: 'Test.test',
      },
    ],
  },
  'schema:sobject:list': ['Test', 'Test', 'Test'],
};
