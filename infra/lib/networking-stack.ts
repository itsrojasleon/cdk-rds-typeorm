import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class NetworkingStack extends cdk.Stack {
  vpc: ec2.Vpc;
  databaseSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'vpc', {
      maxAzs: 2,
      ipAddresses: ec2.IpAddresses.cidr('15.0.0.0/16')
    });

    console.log(
      'private subnets',
      this.vpc.privateSubnets.map((subnet) => subnet.subnetId)
    );
    console.log(
      'public subnets',
      this.vpc.publicSubnets.map((subnet) => subnet.subnetId)
    );

    this.databaseSecurityGroup = new ec2.SecurityGroup(
      this,
      'DatabaseSecurityGroup',
      {
        vpc: this.vpc,
        description: 'Allow database access to ec2 instances'
      }
    );

    const lambdaSecurityGroup = new ec2.SecurityGroup(
      this,
      'LambdaSecurityGroup',
      {
        vpc: this.vpc,
        description: 'Allow lambda access to database'
      }
    );

    this.databaseSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow lambda access to database',
      false
    );

    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId
    });

    new cdk.CfnOutput(this, 'LambdaSecurityGroupId', {
      value: lambdaSecurityGroup.securityGroupId
    });
  }
}
