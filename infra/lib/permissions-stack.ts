import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface StackProps extends cdk.StackProps {
  policyStatements: iam.PolicyStatement[];
}

export class PermissionsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const role = new iam.Role(this, 'role', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole'
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaVPCAccessExecutionRole'
        )
      ],
      inlinePolicies: {
        inlinePolicy: new iam.PolicyDocument({
          statements: props.policyStatements
        })
      }
    });

    new cdk.CfnOutput(this, 'roleArn', {
      value: role.roleArn
    });
  }
}
