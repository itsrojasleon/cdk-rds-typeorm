package main

import (
	"fmt"
	"os"

	cdk "github.com/aws/aws-cdk-go/awscdk/v2"
	codebuild "github.com/aws/aws-cdk-go/awscdk/v2/awscodebuild"
	codestarconnections "github.com/aws/aws-cdk-go/awscdk/v2/awscodestarconnections"
	ec2 "github.com/aws/aws-cdk-go/awscdk/v2/awsec2"
	iam "github.com/aws/aws-cdk-go/awscdk/v2/awsiam"
	rds "github.com/aws/aws-cdk-go/awscdk/v2/awsrds"
	secretsmanager "github.com/aws/aws-cdk-go/awscdk/v2/awssecretsmanager"
	pipelines "github.com/aws/aws-cdk-go/awscdk/v2/pipelines"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

type Props struct {
	cdk.StackProps
}

type PipelineStackProps struct {
	cdk.StackProps
	Stage  string
	Branch string
}

func NewPipelineStack(scope constructs.Construct, id string, props *PipelineStackProps) cdk.Stack {
	var sprops cdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	stack := cdk.NewStack(scope, &id, &sprops)

	role := iam.NewRole(stack, jsii.String("Role"), &iam.RoleProps{
		AssumedBy: iam.NewServicePrincipal(jsii.String("codestar.amazonaws.com"), &iam.ServicePrincipalOpts{}),
	})

	codestarConn := codestarconnections.NewCfnConnection(stack, jsii.String("Connection"), &codestarconnections.CfnConnectionProps{
		ConnectionName: jsii.String("cdkRdsTypeormConnection"),
		ProviderType:   jsii.String("GitHub"),
	})

	role.AddToPolicy(iam.NewPolicyStatement(&iam.PolicyStatementProps{
		Actions: &[]*string{
			jsii.String("codestar-connections:UseConnection"),
		},
		Resources: &[]*string{
			codestarConn.AttrConnectionArn(),
		},
	}))

	pipeline := pipelines.NewCodePipeline(stack, jsii.String("Pipeline"), &pipelines.CodePipelineProps{
		CodeBuildDefaults: &pipelines.CodeBuildOptions{
			Timeout: cdk.Duration_Minutes(jsii.Number(25)),
			BuildEnvironment: &codebuild.BuildEnvironment{
				BuildImage:  codebuild.LinuxBuildImage_STANDARD_6_0(),
				ComputeType: codebuild.LinuxBuildImage_AMAZON_LINUX_2_ARM_2().DefaultComputeType(),
			},
		},
		SynthCodeBuildDefaults: &pipelines.CodeBuildOptions{
			PartialBuildSpec: codebuild.BuildSpec_FromObject(&map[string]interface{}{
				"version": jsii.String("0.2"),
				"phases": map[string]interface{}{
					"install": map[string]interface{}{
						"runtime-versions": map[string]interface{}{
							"nodejs": jsii.String("16.x"),
						},
					},
				},
			}),
		},
		Synth: pipelines.NewShellStep(jsii.String("Synth"), &pipelines.ShellStepProps{
			Input: pipelines.CodePipelineSource_Connection(
				jsii.String("rojasleon/cdk-rds-typeorm"),
				jsii.String("testing"),
				&pipelines.ConnectionSourceOptions{
					ConnectionArn: codestarConn.AttrConnectionArn(),
				},
			),
			Commands: &[]*string{
				jsii.String("cd infra"),
				jsii.String("npx cdk synth -c stage=" + props.Stage),
			},
			PrimaryOutputDirectory: jsii.String("infra/cdk.out"),
		}),
	})

	pipeline.AddStage(
		NewAppStage(stack, jsii.String(props.Stage), cdk.StageProps{}),
		&pipelines.AddStageOpts{},
	)

	return stack
}

func NewInfraStack(scope constructs.Construct, id string, props *Props) cdk.Stack {
	var sprops cdk.StackProps
	if props != nil {
		sprops = props.StackProps
	}
	stack := cdk.NewStack(scope, &id, &sprops)

	vpc := ec2.NewVpc(stack, jsii.String("VPC"), &ec2.VpcProps{
		MaxAzs:      jsii.Number(2),
		IpAddresses: ec2.IpAddresses_Cidr(jsii.String("15.0.0.0/16")),
	})

	// TODO: First deploy the vpc and see their default subnets
	// lambdaSubnet1 := ec2.NewSubnet(stack, jsii.String("LambdaSubnet1"), &ec2.SubnetProps{
	// 	VpcId:            vpc.VpcId(),
	// 	AvailabilityZone: jsii.String("us-east-1a"),
	// 	CidrBlock:        jsii.String("15.0.160.0/20"),
	// })

	// lambdaSubnet2 := ec2.NewSubnet(stack, jsii.String("LambdaSubnet2"), &ec2.SubnetProps{
	// 	VpcId:            vpc.VpcId(),
	// 	AvailabilityZone: jsii.String("us-east-1b"),
	// 	CidrBlock:        jsii.String("15.0.176.0/20"),
	// })

	databaseSecurityGroup := ec2.NewSecurityGroup(stack, jsii.String("DatabaseSecurityGroup"), &ec2.SecurityGroupProps{
		Vpc:         vpc,
		Description: jsii.String("Allow database access to ec2 instances"),
	})

	lambdaSecurityGroup := ec2.NewSecurityGroup(stack, jsii.String("LambdaSecurityGroup"), &ec2.SecurityGroupProps{
		Vpc:         vpc,
		Description: jsii.String("Allow lambda access to database"),
	})

	databaseSecurityGroup.AddIngressRule(
		lambdaSecurityGroup,
		ec2.Port_Tcp(jsii.Number(5432)),
		jsii.String("Allow lambda access to database"),
		jsii.Bool(false),
	)

	// bastionSecurityGroup := ec2.NewSecurityGroup(stack, jsii.String("BastionSecurityGroup"), &ec2.SecurityGroupProps{
	// 	Vpc:         vpc,
	// 	Description: jsii.String("Allow SSH access to ec2 instances"),
	// })

	// bastionSecurityGroup.AddIngressRule(
	// 	ec2.Peer_AnyIpv4(),
	// 	ec2.Port_Tcp(jsii.Number(22)),
	// 	jsii.String("Allow SSH access from anywhere"),
	// 	jsii.Bool(false),
	// )

	// key := ec2.NewCfnKeyPair(stack, jsii.String("KeyPair"), &ec2.CfnKeyPairProps{
	// 	KeyName: jsii.String("cdk-keypair"),
	// })

	// ec2.NewInstance(stack, jsii.String("Bastion"), &ec2.InstanceProps{
	// 	Vpc:           vpc,
	// 	InstanceType:  ec2.InstanceType_Of(ec2.InstanceClass_BURSTABLE3, ec2.InstanceSize_SMALL),
	// 	MachineImage:  ec2.NewAmazonLinuxImage(&ec2.AmazonLinuxImageProps{}),
	// 	KeyName:       key.KeyName(),
	// 	SecurityGroup: bastionSecurityGroup,
	// })

	secret := secretsmanager.NewSecret(stack, jsii.String("Credentials"), &secretsmanager.SecretProps{
		SecretName: jsii.String("database-credentials"),
		GenerateSecretString: &secretsmanager.SecretStringGenerator{
			SecretStringTemplate: jsii.String(`{"username": "justme"}`),
			GenerateStringKey:    jsii.String("password"),
			IncludeSpace:         jsii.Bool(false),
			ExcludePunctuation:   jsii.Bool(true),
		},
	})

	database := rds.NewDatabaseCluster(stack, jsii.String("Database"), &rds.DatabaseClusterProps{
		Engine: rds.DatabaseClusterEngine_AuroraPostgres(&rds.AuroraPostgresClusterEngineProps{
			Version: rds.AuroraPostgresEngineVersion_VER_14_6(),
		}),
		InstanceProps: &rds.InstanceProps{
			Vpc: vpc,
			InstanceType: ec2.InstanceType_Of(
				ec2.InstanceClass_BURSTABLE3,
				ec2.InstanceSize_SMALL,
			),
			SecurityGroups: &[]ec2.ISecurityGroup{
				databaseSecurityGroup,
			},
		},
		Instances:          jsii.Number(1),
		Credentials:        rds.Credentials_FromSecret(secret, jsii.String("justme")),
		RemovalPolicy:      cdk.RemovalPolicy_DESTROY,
		DeletionProtection: jsii.Bool(false),
	})

	// parameterGroup := rds.NewParameterGroup(stack, jsii.String("ParameterGroup"), &rds.ParameterGroupProps{
	//   Engine: rds.DatabaseClusterEngine_AURORA_POSTGRESQL(),
	// })
	// database.AddParameterGroup(parameterGroup)

	// output database hostname
	cdk.NewCfnOutput(stack, jsii.String("DatabaseHostname"), &cdk.CfnOutputProps{
		Value: database.ClusterEndpoint().Hostname(),
	})
	cdk.NewCfnOutput(stack, jsii.String("DatabaseName"), &cdk.CfnOutputProps{
		Value: database.ClusterIdentifier(),
	})
	cdk.NewCfnOutput(stack, jsii.String("DatabaseSecretName"), &cdk.CfnOutputProps{
		Value: secret.SecretName(),
	})
	cdk.NewCfnOutput(stack, jsii.String("LambdaSecurityGroupId"), &cdk.CfnOutputProps{
		Value: lambdaSecurityGroup.SecurityGroupId(),
	})
	// cdk.NewCfnOutput(stack, jsii.String("LambdaSubnet1Id"), &cdk.CfnOutputProps{
	// 	Value: lambdaSubnet1.SubnetId(),
	// })
	// cdk.NewCfnOutput(stack, jsii.String("LambdaSubnet2Id"), &cdk.CfnOutputProps{
	// 	Value: lambdaSubnet2.SubnetId(),
	// })
	return stack
}

func NewAppStage(scope constructs.Construct, id *string, props cdk.StageProps) cdk.Stage {
	stage := cdk.NewStage(scope, id, &props)

	NewInfraStack(stage, "InfraStack", &Props{
		cdk.StackProps{Env: props.Env},
	})
	return stage
}

func main() {
	defer jsii.Close()

	allowedStages := map[string]string{
		"test": "testing",
		"prod": "production",
	}

	app := cdk.NewApp(nil)
	stage := app.Node().Root().Node().TryGetContext(jsii.String("stage"))

	if branch, ok := allowedStages[stage.(string)]; ok {
		NewPipelineStack(app, "PipelineStack", &PipelineStackProps{
			Stage:  stage.(string),
			Branch: branch,
			StackProps: cdk.StackProps{
				Env: env(),
			},
		})

		app.Synth(nil)
	} else {
		panic(fmt.Sprintf("Stage %s not found in allowed stages", stage))
	}
}

func env() *cdk.Environment {
	return &cdk.Environment{
		Account: jsii.String(os.Getenv("CDK_DEFAULT_ACCOUNT")),
		Region:  jsii.String(os.Getenv("CDK_DEFAULT_REGION")),
	}
}
