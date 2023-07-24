import { AWS } from '@serverless/typescript';

const serverlessConfig: AWS = {
  service: 'rds-typeorm',
  frameworkVersion: '3',
  provider: {
    name: 'aws',
    runtime: 'nodejs18.x',
    iam: {
      role: '${cf:${self:custom.stackNames.${self:provider.stage}}.roleArn}'
    },
    vpc: {
      securityGroupIds: [
        '${cf:${self:custom.stackNames.${self:provider.stage}}.LambdaSecurityGroupId}'
      ],
      subnetIds: [
        '${cf:${self:custom.stackNames.${self:provider.stage}}.LambdaSubnet1Id}',
        '${cf:${self:custom.stackNames.${self:provider.stage}}.LambdaSubnet2Id}'
      ]
    }
  },
  functions: {
    create: {
      handler: 'src/lambdas/create.handler',
      environment: {
        DB_NAME:
          '${cf:${self:custom.stackNames.${self:provider.stage}}.DatabaseName}',
        DB_HOST:
          '${cf:${self:custom.stackNames.${self:provider.stage}}.DatabaseHostname}',
        // We'll use secrets manager to retrieve the username and password
        // based on the secret ARN.
        DB_SECRET_NAME:
          '${cf:${self:custom.stackNames.${self:provider.stage}}.DatabaseSecretName}'
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
    },
    stackNames: {
      test: 'test-AppStacksDatabaseStack03564B8C',
      prod: 'TODO:'
    }
  },
  plugins: ['serverless-esbuild']
};

module.exports = serverlessConfig;
