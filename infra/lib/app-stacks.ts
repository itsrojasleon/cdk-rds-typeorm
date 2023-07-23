import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DatabaseStack } from './database-stack';
import { NetworkingStack } from './networking-stack';
import { PermissionsStack } from './permissions-stack';

export class AppStacks extends Construct {
  constructor(scope: cdk.App | cdk.Stage, id: string, props: cdk.StackProps) {
    super(scope, id);

    const networkingStack = new NetworkingStack(this, 'NetworkingStack', props);

    const databaseStack = new DatabaseStack(this, 'DatabaseStack', {
      vpc: networkingStack.vpc,
      databaseSecurityGroup: networkingStack.databaseSecurityGroup
    });

    new PermissionsStack(this, 'PermissionsStack', {
      policyStatements: databaseStack.policyStatements,
      ...props
    });
  }
}
