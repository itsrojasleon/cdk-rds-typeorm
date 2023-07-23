import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DataSource } from 'typeorm';
import { User } from '../models/user';
import { getDatatabaseCredentials } from '../utils';

export const handler: APIGatewayProxyHandlerV2 = async () => {
  try {
    if (!process.env.DB_NAME) throw new Error('DB_NAME is not set');
    if (!process.env.DB_HOST) throw new Error('DB_HOST is not set');
    if (!process.env.DB_SECRET_NAME)
      throw new Error('DB_SECRET_NAME is not set');

    const { dbUsername, dbPassword } = await getDatatabaseCredentials(
      process.env.DB_SECRET_NAME
    );

    const dataSource = new DataSource({
      type: 'postgres',
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      username: dbUsername,
      password: dbPassword,
      port: 5432, // Maybe use as env var?
      ssl: true,
      entities: [User]
    });

    await dataSource.initialize();

    const user = await User.create({
      name: 'Just a name',
      isHuman: true
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'User created successfully',
        user
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal server error'
      })
    };
  }
};
