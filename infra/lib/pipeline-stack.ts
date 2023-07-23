import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codestarconnections from 'aws-cdk-lib/aws-codestarconnections';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as pipelines from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';
import { envs } from '../constants';
import { AppStage } from './app-stage';

interface StackProps extends cdk.StackProps {
  env: cdk.Environment & {
    stage: string;
  };
}

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const role = new iam.Role(this, 'CodeStarRole', {
      assumedBy: new iam.ServicePrincipal('codestar.amazonaws.com')
    });

    const codestarConnection = new codestarconnections.CfnConnection(
      this,
      'codestarConnection',
      {
        connectionName: 'eProvidersWebAdmin',
        providerType: 'GitHub'
      }
    );

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['codestar-connections:UseConnection'],
        resources: [codestarConnection.attrConnectionArn]
      })
    );

    const env = envs[props.env.stage as keyof typeof envs];

    const infraPipeline = new pipelines.CodePipeline(this, 'infraPipeline', {
      codeBuildDefaults: {
        timeout: cdk.Duration.minutes(25),
        buildEnvironment: {
          buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_4,
          computeType: codebuild.ComputeType.MEDIUM
        }
      },
      synthCodeBuildDefaults: {
        partialBuildSpec: codebuild.BuildSpec.fromObject({
          phases: {
            install: {
              'runtime-versions': {
                nodejs: '18.x'
              }
            }
          }
        })
      },
      synth: new pipelines.ShellStep('synth', {
        input: pipelines.CodePipelineSource.connection(
          'rojasleon/cdk-rds-typeorm',
          env.branch,
          { connectionArn: codestarConnection.attrConnectionArn }
        ),
        commands: [
          'cd infra',
          'npm install',
          'npm run build',
          `npx cdk synth -c stage=${env.stage}`
        ],
        primaryOutputDirectory: 'infra/cdk.out'
      })
    });

    const stage = infraPipeline.addStage(new AppStage(this, env.stage, props));

    // stage.addPost(
    //   new pipelines.ShellStep('backendDeployment', {
    //     commands: [
    //       'cd backend',
    //       'npm install',
    //       `npm run deploy --stage=${env.stage}`
    //     ]
    //   })
    // );

    infraPipeline.buildPipeline();
  }
}
