import { AWS } from '@serverless/typescript';

const serverlessConfig: AWS = {
  service: 'rds-typeorm',
  frameworkVersion: '3',
  provider: {
    name: 'aws',
    runtime: 'nodejs18.x',
    iam: {
      role: '${cf:PermissionsStack.roleArn}'
    },
    vpc: {
      securityGroupIds: ['${cf:NetworkingStack.LambdaSecurityGroupId}'],
      subnetIds: ['subnet-001413bef0c35ba96', 'subnet-06f4cb0ce6bec1075']
    }
  },
  functions: {
    create: {
      handler: 'src/lambdas/create.handler',
      environment: {
        DB_NAME: '${cf:DatabaseStack.DatabaseName}',
        DB_HOST: '${cf:DatabaseStack.DatabaseHostname}',
        DB_SECRET_NAME: '${cf:DatabaseStack.DatabaseSecretName}'
      },
      events: [
        {
          httpApi: {
            method: 'post',
            path: '/users'
          }
        }
      ]
    }
  },
  custom: {
    esbuild: {
      bundle: true,
      minify: true
    }
  },
  plugins: ['serverless-esbuild']
};

module.exports = serverlessConfig;
