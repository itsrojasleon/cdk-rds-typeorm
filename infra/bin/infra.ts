#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import 'source-map-support/register';
import { DatabaseStack } from '../lib/database-stack';
import { NetworkingStack } from '../lib/networking-stack';
import { PermissionsStack } from '../lib/permissions-stack';

const app = new cdk.App();

const stage = app.node.tryGetContext('stage');

if (!stage) {
  throw new Error('Stage must be specified');
}
if (!['test', 'prod'].includes(stage)) {
  throw new Error('Stage must be test or prod');
}

const props = {
  env: {
    stage,
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
};

const networkingStack = new NetworkingStack(app, 'NetworkingStack', props);

const databaseStack = new DatabaseStack(app, 'DatabaseStack', {
  ...props,
  vpc: networkingStack.vpc,
  databaseSecurityGroup: networkingStack.databaseSecurityGroup
});

new PermissionsStack(app, 'PermissionsStack', {
  ...props,
  policyStatements: databaseStack.policyStatements
});

// The account I'm using it's lacking permissions to create a pipeline.
// new PipelineStack(app, 'PipelineStack', {
//   env: {
//     stage,
//     account: process.env.CDK_DEFAULT_ACCOUNT,
//     region: process.env.CDK_DEFAULT_REGION
//   }
// });
