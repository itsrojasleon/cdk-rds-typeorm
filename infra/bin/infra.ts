#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import 'source-map-support/register';
import { PipelineStack } from '../lib/pipeline-stack';

const app = new cdk.App();

const stage = app.node.tryGetContext('stage');

if (!stage) {
  throw new Error('Stage must be specified');
}
if (!['test', 'prod'].includes(stage)) {
  throw new Error('Stage must be test or prod');
}

new PipelineStack(app, 'PipelineStack', {
  env: {
    stage,
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
});
