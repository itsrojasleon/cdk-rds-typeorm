import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { getDataSource } from '../data-source';
import { User } from '../models/user';

export const handler: APIGatewayProxyHandlerV2 = async () => {
  const dataSource = await getDataSource();

  try {
    await dataSource.initialize();

    const user = await User.create({
      name: 'name',
      description: 'description'
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
  } finally {
    await dataSource?.destroy();
  }
};
