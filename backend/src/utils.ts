import {
  GetSecretValueCommand,
  SecretsManagerClient
} from '@aws-sdk/client-secrets-manager';

const secrets = new SecretsManagerClient({});

export const getDatatabaseCredentials = async (secretId: string) => {
  const { SecretString } = await secrets.send(
    new GetSecretValueCommand({
      SecretId: secretId
    })
  );

  if (!SecretString) throw new Error('SecretString is not set');

  let dbUsername = '';
  let dbPassword = '';

  try {
    const { username, password } = JSON.parse(SecretString);

    if (!username) throw new Error('username is not set in SecretString');
    if (!password) throw new Error('password is not set in SecretString');

    dbUsername = username;
    dbPassword = password;
  } catch (err) {
    throw new Error('SecretString is not a valid JSON');
  }

  return {
    dbUsername,
    dbPassword
  };
};
