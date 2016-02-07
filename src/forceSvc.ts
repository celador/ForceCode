var jsforce: any = require('jsforce');

export interface IForceConnection {
    tooling: any;
    request: any;
    query: any;
    login(name: string, password: string): any;
}

export interface IUserInfo{
    id: string; // User ID
    organizationId: string; // Organization ID
    url: string; // Identity URL of the user
}

export interface IForceService {
    conn?: IForceConnection;
    userInfo?: IUserInfo;
    connect(): Promise<IUserInfo>;
}
const forceService: IForceService = {
    conn: undefined,
    connect: () => {
        if (this.userInfo === undefined) {
            this.conn = new jsforce.Connection();
            return this.conn.login('john.aaron.nelson@gmail.com', 'Science3').then(userInfo => {
                this.userInfo = userInfo;
                return this.userInfo;
            });
        } else {
            return new Promise(function(resolve, reject){
                resolve(this.userInfo);
            });
        }
    },
    userInfo: undefined,
};

export default forceService;
