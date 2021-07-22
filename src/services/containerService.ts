import { IContainerMember } from '../forceCode';
import * as vscode from 'vscode';
import { containerService } from '.';

export class ContainerService {
  private static instance: ContainerService;
  private containers: Map<string, Container>;

  constructor() {
    this.containers = new Map<string, Container>();
  }

  public static getInstance() {
    if (!ContainerService.instance) {
      ContainerService.instance = new ContainerService();
    }
    return ContainerService.instance;
  }

  public createContainer(
    thePath: string,
    name: string | undefined,
    toolingType: string,
    upToolingType: string
  ) {
    if (this.containers.has(thePath)) {
      const member = this.containers.get(thePath)!;
      member.existing = true;
      return member;
    } else {
      // make a new one
      const container: Container = new Container(thePath, name, toolingType, upToolingType);
      this.containers.set(thePath, container);
      return container;
    }
  }

  public removeContainer(container: Container): boolean {
    return this.containers.delete(container.thePath);
  }

  public clear() {
    this.containers.clear();
  }
}

export class Container {
  public readonly thePath: string;
  public readonly upToolingType: string;
  public readonly toolingType: string;
  public readonly name: string | undefined;
  public containerId: string | undefined;
  public containerMember: IContainerMember | undefined;
  public containerAsyncRequestId: string | undefined;
  public records: any;
  public existing: boolean;

  constructor(
    thePath: string,
    name: string | undefined,
    toolingType: string,
    upToolingType: string
  ) {
    this.existing = false;
    this.name = name;
    this.thePath = thePath;
    this.toolingType = toolingType;
    this.upToolingType = upToolingType;
  }

  public async createContainer() {
    const res = await vscode.window.forceCode.conn.tooling
      .sobject('MetadataContainer')
      .create({ name: 'ForceCode-' + Date.now() });
    this.containerId = res.id;
    const records = await vscode.window.forceCode.conn.tooling
      .sobject(this.toolingType)
      .find({ Name: this.name, NamespacePrefix: vscode.window.forceCode.config.prefix || '' })
      .execute();
    this.records = records;
    return Promise.resolve(records);
  }

  public async createContainerMember(member: any): Promise<boolean> {
    const res = await vscode.window.forceCode.conn.tooling
      .sobject(this.upToolingType)
      .create(member);
    if (!res.id) {
      throw { message: this.records[0].Name + ' not saved' };
    }
    this.containerMember = { name: this.name || '', id: res.id };
    return Promise.resolve(true);
  }

  public async updateContainerMember(member: any): Promise<boolean> {
    await vscode.window.forceCode.conn.tooling.sobject(this.upToolingType).update(member);
    return Promise.resolve(true);
  }

  public async compile(): Promise<boolean> {
    const res = await vscode.window.forceCode.conn.tooling.sobject('ContainerAsyncRequest').create({
      IsCheckOnly: false,
      IsRunTests: false,
      MetadataContainerId: this.containerId,
    });
    this.containerAsyncRequestId = res.id;
    return Promise.resolve(true);
  }

  public cancelCompile(): Promise<any> {
    // toss the container member...it's in an unknown state
    containerService.removeContainer(this);
    return vscode.window.forceCode.conn.tooling
      .sobject('ContainerAsyncRequest')
      .update({ Id: this.containerAsyncRequestId, State: 'Aborted' });
  }

  public getStatus(): Promise<any> {
    return vscode.window.forceCode.conn.tooling.query(
      `SELECT Id, MetadataContainerId, MetadataContainerMemberId, State, IsCheckOnly, ` +
        `DeployDetails, ErrorMsg FROM ContainerAsyncRequest WHERE Id='${this.containerAsyncRequestId}'`
    );
  }
}
