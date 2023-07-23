import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

interface StackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  databaseSecurityGroup: ec2.SecurityGroup;
}

export class DatabaseStack extends cdk.Stack {
  policyStatements: iam.PolicyStatement[] = [];

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const secret = new secretsmanager.Secret(this, 'Credentials', {
      generateSecretString: {
        secretStringTemplate: '{"username": "justme"}',
        generateStringKey: 'password',
        includeSpace: false,
        excludePunctuation: true
      }
    });

    this.policyStatements.push(
      new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: [secret.secretArn]
      })
    );

    const database = new rds.DatabaseCluster(this, 'Database', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_14_6
      }),
      instanceProps: {
        vpc: props.vpc,
        securityGroups: [props.databaseSecurityGroup]
      },
      instances: 2,
      credentials: rds.Credentials.fromSecret(secret, 'justme'),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      // Change in a serious app.
      deletionProtection: false
    });

    new cdk.CfnOutput(this, 'DatabaseHostname', {
      value: database.clusterEndpoint.hostname
    });

    new cdk.CfnOutput(this, 'DatabaseName', {
      value: database.clusterIdentifier
    });

    new cdk.CfnOutput(this, 'DatabaseSecretName', {
      value: secret.secretName
    });
  }
}
